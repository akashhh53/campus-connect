import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiEye,
  FiImage,
  FiMapPin,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTag,
  FiTrash2,
  FiUploadCloud,
  FiUser,
  FiX,
} from "react-icons/fi";

import {
  claimLostFoundItem,
  deleteLostFoundItem,
  getLostFoundItemById,
  getLostFoundItems,
  reportLostFoundItem,
  resolveLostFoundItem,
  updateLostFoundItem,
} from "../../services/lostFoundService";

const initialForm = {
  type: "lost",
  title: "",
  location: "",
  description: "",
  images: [],
};

const typeFilters = [
  { label: "All", value: "all" },
  { label: "Lost", value: "lost" },
  { label: "Found", value: "found" },
];

const statusFilters = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Claimed", value: "claimed" },
  { label: "Resolved", value: "resolved" },
];

const getErrorMessage = (err, fallback) =>
  err.response?.data?.message || err.response?.data?.error || fallback;

const formatDate = (date) => {
  if (!date) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const getUserId = (value) => value?._id || value;

const LostFoundPage = () => {
  const localData = JSON.parse(localStorage.getItem("userInfo") || "null");
  const currentUser = localData?.user;
  const currentRole = currentUser?.role?.name;

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [scope, setScope] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadItems = useCallback(
    async (nextPage = 1) => {
      try {
        setLoading(true);
        const data = await getLostFoundItems({
          scope,
          page: nextPage,
          limit: 9,
          type,
          status,
          search: search.trim(),
        });

        setItems(data.items || []);
        setPagination(
          data.pagination || {
            page: nextPage,
            pages: 1,
            total: data.items?.length || 0,
            hasNext: false,
            hasPrev: false,
          },
        );
        setError("");
      } catch (err) {
        setError(getErrorMessage(err, "Unable to load lost and found items"));
      } finally {
        setLoading(false);
      }
    },
    [scope, search, status, type],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadItems(1);
    }, 280);

    return () => clearTimeout(timer);
  }, [loadItems]);

  const stats = useMemo(
    () => [
      {
        label: "Reports matched",
        value: pagination.total || items.length,
      },
      {
        label: "Pending here",
        value: items.filter((item) => item.status === "pending").length,
      },
      {
        label: "Resolved here",
        value: items.filter((item) => item.status === "resolved").length,
      },
    ],
    [items, pagination.total],
  );

  const resetForm = (nextType = "lost") => {
    setForm({
      ...initialForm,
      type: nextType,
    });
    setExistingImages([]);
    setRemoveImages([]);
    setEditingItem(null);
  };

  const openCreateForm = (nextType = "lost") => {
    resetForm(nextType);
    setFormOpen(true);
    setNotice("");
    setError("");
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setForm({
      type: item.type,
      title: item.title || "",
      location: item.location || "",
      description: item.description || "",
      images: [],
    });
    setExistingImages(item.images || []);
    setRemoveImages([]);
    setFormOpen(true);
    setNotice("");
    setError("");
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5);

    setForm((current) => ({
      ...current,
      images: files,
    }));
  };

  const toggleRemoveImage = (image) => {
    setRemoveImages((current) =>
      current.includes(image)
        ? current.filter((item) => item !== image)
        : [...current, image],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setActionLoading("submit");
      const payload = {
        ...form,
        removeImages,
      };

      const data = editingItem
        ? await updateLostFoundItem(editingItem._id, payload)
        : await reportLostFoundItem(form.type, payload);

      setNotice(data.message || "Report saved successfully");
      closeForm();
      await loadItems(1);

      if (selectedItem?._id === editingItem?._id) {
        setSelectedItem(data.item || data.data || selectedItem);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save report"));
    } finally {
      setActionLoading("");
    }
  };

  const loadDetails = async (item) => {
    try {
      setSelectedItem(item);
      setDetailLoading(true);
      const data = await getLostFoundItemById(item._id);
      setSelectedItem(data.item || item);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load item details"));
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshAfterAction = async (message, updatedItem) => {
    setNotice(message);
    await loadItems(pagination.page);

    if (updatedItem && selectedItem?._id === updatedItem._id) {
      setSelectedItem((current) => ({
        ...current,
        ...updatedItem,
      }));
    }
  };

  const handleClaim = async (item) => {
    try {
      setActionLoading(`claim-${item._id}`);
      const data = await claimLostFoundItem(item._id);
      await refreshAfterAction(data.message || "Item claimed", data.item);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to claim item"));
    } finally {
      setActionLoading("");
    }
  };

  const handleResolve = async (item) => {
    try {
      setActionLoading(`resolve-${item._id}`);
      const data = await resolveLostFoundItem(item._id);
      await refreshAfterAction(data.message || "Item resolved", data.item);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to resolve item"));
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(`Delete "${item.title}" from Lost & Found?`);

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`delete-${item._id}`);
      const data = await deleteLostFoundItem(item._id);
      setNotice(data.message || "Item deleted");
      setSelectedItem(null);
      await loadItems(1);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete item"));
    } finally {
      setActionLoading("");
    }
  };

  const isOwner = (item) =>
    String(getUserId(item.reportedBy)) === String(currentUser?._id);

  const isAdmin = currentRole === "admin" || currentRole === "globalAdmin";

  const canClaim = (item) =>
    item.type === "found" && item.status === "pending" && !isOwner(item);

  const canEdit = (item) => item.status === "pending" && isOwner(item);

  const canResolve = (item) => item.status !== "resolved" && (isOwner(item) || isAdmin);

  const renderActions = (item) => (
    <div className="lost-found-card-actions">
      <button
        className="cc-button cc-button-secondary"
        onClick={() => loadDetails(item)}
        type="button"
      >
        <FiEye />
        Details
      </button>

      {canClaim(item) && (
        <button
          className="cc-button"
          disabled={actionLoading === `claim-${item._id}`}
          onClick={() => handleClaim(item)}
          type="button"
        >
          <FiPackage />
          Claim
        </button>
      )}

      {canEdit(item) && (
        <button
          className="cc-button cc-button-secondary"
          onClick={() => openEditForm(item)}
          type="button"
        >
          <FiEdit2 />
          Edit
        </button>
      )}

      {canResolve(item) && (
        <button
          className="cc-button cc-button-secondary"
          disabled={actionLoading === `resolve-${item._id}`}
          onClick={() => handleResolve(item)}
          type="button"
        >
          <FiCheckCircle />
          Resolve
        </button>
      )}

      {isOwner(item) && (
        <button
          className="cc-button cc-button-danger"
          disabled={actionLoading === `delete-${item._id}`}
          onClick={() => handleDelete(item)}
          type="button"
        >
          <FiTrash2 />
          Delete
        </button>
      )}
    </div>
  );

  return (
    <main className="cc-page cc-page-wide">
      <section className="cc-hero">
        <div>
          <div className="cc-eyebrow">
            <FiPackage />
            Lost & Found
          </div>
          <h1>Recover campus items faster.</h1>
          <p>
            Search college-scoped reports, add lost or found items, claim found
            belongings, and close the loop when something is returned.
          </p>
        </div>

        <aside className="cc-hero-panel">
          <button
            className="cc-button"
            onClick={() => openCreateForm("lost")}
            type="button"
          >
            <FiPlus />
            Report lost
          </button>
          <button
            className="cc-button cc-button-secondary"
            onClick={() => openCreateForm("found")}
            type="button"
          >
            <FiCheckCircle />
            Report found
          </button>
        </aside>
      </section>

      <section className="cc-stat-grid">
        {stats.map((stat) => (
          <div className="cc-stat-card" key={stat.label}>
            <span className="cc-stat-value">{stat.value}</span>
            <span className="cc-stat-label">{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="lost-found-toolbar">
        <div className="lost-found-search">
          <FiSearch />
          <input
            className="cc-input"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by item, description, or location"
            value={search}
          />
        </div>

        <div className="cc-button-row">
          <button
            className={`cc-button ${scope === "all" ? "" : "cc-button-secondary"}`}
            onClick={() => setScope("all")}
            type="button"
          >
            All reports
          </button>
          <button
            className={`cc-button ${scope === "mine" ? "" : "cc-button-secondary"}`}
            onClick={() => setScope("mine")}
            type="button"
          >
            My reports
          </button>
          <button
            className="cc-button cc-button-secondary"
            onClick={() => loadItems(pagination.page)}
            type="button"
          >
            <FiRefreshCw />
            Refresh
          </button>
        </div>
      </section>

      <section className="lost-found-filters" aria-label="Lost and found filters">
        <div className="lost-found-filter-group">
          <span className="lost-found-filter-label">
            <FiTag />
            Item type
          </span>
          <div className="lost-found-segment">
            {typeFilters.map((option) => (
              <button
                className={`lost-found-segment-button ${
                  type === option.value ? "is-active" : ""
                }`}
                key={option.value}
                onClick={() => setType(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lost-found-filter-group">
          <span className="lost-found-filter-label">
            <FiClock />
            Status
          </span>
          <div className="lost-found-segment">
            {statusFilters.map((option) => (
              <button
                className={`lost-found-segment-button ${
                  status === option.value ? "is-active" : ""
                }`}
                key={option.value}
                onClick={() => setStatus(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {notice && <div className="cc-alert cc-alert-success">{notice}</div>}
      {error && <div className="cc-alert cc-alert-error">{error}</div>}

      {loading ? (
        <div className="lost-found-empty">
          <FiRefreshCw size={34} />
          <h3>Loading reports</h3>
          <p>Fetching the latest campus items.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="lost-found-empty">
          <FiPackage size={38} />
          <h3>No items found</h3>
          <p>Try a different filter or add the first report for your campus.</p>
        </div>
      ) : (
        <section className="lost-found-grid">
          {items.map((item) => {
            const image = item.mainImage || item.images?.[0];

            return (
              <article className="lost-found-card" key={item._id}>
                <div className="lost-found-image">
                  <span className="type-badge">{item.type}</span>
                  {image ? (
                    <img alt={item.title} src={image} />
                  ) : (
                    <div className="lost-found-image-empty">
                      <FiImage />
                    </div>
                  )}
                </div>

                <div className="lost-found-card-body">
                  <span className={`status-badge status-${item.status}`}>
                    {item.status}
                  </span>
                  <h2 className="lost-found-card-title">{item.title}</h2>
                  <p className="lost-found-card-desc">
                    {item.description || "No description added yet."}
                  </p>

                  <div className="lost-found-meta">
                    <span>
                      <FiMapPin />
                      {item.location || "Campus"}
                    </span>
                    <span>
                      <FiUser />
                      {item.reportedBy?.name || "Campus member"}
                    </span>
                    <span>
                      <FiClock />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  {renderActions(item)}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {!loading && pagination.pages > 1 && (
        <div className="cc-button-row" style={{ justifyContent: "center", marginTop: 22 }}>
          <button
            className="cc-button cc-button-secondary"
            disabled={!pagination.hasPrev}
            onClick={() => loadItems(pagination.page - 1)}
            type="button"
          >
            <FiChevronLeft />
            Previous
          </button>
          <span className="cc-pill">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="cc-button cc-button-secondary"
            disabled={!pagination.hasNext}
            onClick={() => loadItems(pagination.page + 1)}
            type="button"
          >
            Next
            <FiChevronRight />
          </button>
        </div>
      )}

      {formOpen && (
        <div className="cc-modal-backdrop">
          <form className="cc-modal" onSubmit={handleSubmit}>
            <div className="cc-modal-header">
              <div>
                <h2 className="cc-modal-title">
                  {editingItem ? "Edit report" : `Report ${form.type} item`}
                </h2>
                <p className="cc-modal-subtitle">
                  Add clear details so the right person can act quickly.
                </p>
              </div>
              <button
                aria-label="Close form"
                className="cc-icon-button"
                onClick={closeForm}
                type="button"
              >
                <FiX />
              </button>
            </div>

            <div className="cc-modal-body">
              <div className="cc-form-grid">
                <label className="cc-field">
                  <span className="cc-label">Type</span>
                  <select
                    className="cc-select"
                    disabled={Boolean(editingItem)}
                    name="type"
                    onChange={handleFormChange}
                    value={form.type}
                  >
                    <option value="lost">Lost</option>
                    <option value="found">Found</option>
                  </select>
                </label>

                <label className="cc-field">
                  <span className="cc-label">Location</span>
                  <input
                    className="cc-input"
                    name="location"
                    onChange={handleFormChange}
                    placeholder="Library, canteen, hostel..."
                    required
                    value={form.location}
                  />
                </label>

                <label className="cc-field cc-field-full">
                  <span className="cc-label">Title</span>
                  <input
                    className="cc-input"
                    name="title"
                    onChange={handleFormChange}
                    placeholder="Blue water bottle, ID card, calculator..."
                    required
                    value={form.title}
                  />
                </label>

                <label className="cc-field cc-field-full">
                  <span className="cc-label">Description</span>
                  <textarea
                    className="cc-textarea"
                    name="description"
                    onChange={handleFormChange}
                    placeholder="Add color, brand, identifying details, and where it was last seen."
                    value={form.description}
                  />
                </label>

                <label className="cc-field cc-field-full">
                  <span className="cc-label">Images</span>
                  <div className="cc-alert">
                    <FiUploadCloud />
                    <span>Upload up to five images. Existing images stay unless removed.</span>
                  </div>
                  <input
                    accept="image/*"
                    className="cc-input"
                    multiple
                    onChange={handleFileChange}
                    type="file"
                  />
                </label>
              </div>

              {existingImages.length > 0 && (
                <>
                  <h3 className="cc-section-title">Existing Images</h3>
                  <div className="image-preview-grid">
                    {existingImages.map((image) => {
                      const removing = removeImages.includes(image);

                      return (
                        <div
                          className="image-preview"
                          key={image}
                          style={{ opacity: removing ? 0.45 : 1 }}
                        >
                          <img alt="Existing item" src={image} />
                          <button
                            aria-label={removing ? "Keep image" : "Remove image"}
                            className="image-remove"
                            onClick={() => toggleRemoveImage(image)}
                            type="button"
                          >
                            <FiX />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {form.images.length > 0 && (
                <>
                  <h3 className="cc-section-title">New Images</h3>
                  <div className="image-preview-grid">
                    {form.images.map((image) => (
                      <div className="image-preview" key={image.name}>
                        <img alt={image.name} src={URL.createObjectURL(image)} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="cc-button-row" style={{ marginTop: 22 }}>
                <button
                  className="cc-button"
                  disabled={actionLoading === "submit"}
                  type="submit"
                >
                  {actionLoading === "submit" ? "Saving..." : "Save report"}
                </button>
                <button
                  className="cc-button cc-button-secondary"
                  onClick={closeForm}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {selectedItem && (
        <div className="cc-modal-backdrop">
          <section className="cc-modal">
            <div className="cc-modal-header">
              <div>
                <h2 className="cc-modal-title">Item details</h2>
                <p className="cc-modal-subtitle">
                  {detailLoading ? "Refreshing details..." : "Latest saved report"}
                </p>
              </div>
              <button
                aria-label="Close details"
                className="cc-icon-button"
                onClick={() => setSelectedItem(null)}
                type="button"
              >
                <FiX />
              </button>
            </div>

            <div className="cc-modal-body">
              <div className="detail-layout">
                <div className="detail-image">
                  {selectedItem.mainImage || selectedItem.images?.[0] ? (
                    <img
                      alt={selectedItem.title}
                      src={selectedItem.mainImage || selectedItem.images?.[0]}
                    />
                  ) : (
                    <div className="lost-found-image-empty" style={{ minHeight: 260 }}>
                      <FiImage />
                    </div>
                  )}
                </div>

                <div className="detail-copy">
                  <span className={`status-badge status-${selectedItem.status}`}>
                    {selectedItem.status}
                  </span>
                  <h3>{selectedItem.title}</h3>
                  <p>{selectedItem.description || "No description added."}</p>

                  <div className="detail-list">
                    <div className="detail-row">
                      <span>Type</span>
                      <strong>{selectedItem.type}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Location</span>
                      <strong>{selectedItem.location || "Campus"}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Reported by</span>
                      <strong>
                        {selectedItem.reportedBy?.name || "Campus member"}
                      </strong>
                    </div>
                    <div className="detail-row">
                      <span>Claimed by</span>
                      <strong>{selectedItem.claimedBy?.name || "Not claimed"}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Reported on</span>
                      <strong>{formatDate(selectedItem.createdAt)}</strong>
                    </div>
                  </div>

                  {renderActions(selectedItem)}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

export default LostFoundPage;

import api from "../api/axios";

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value != null),
  );

const buildItemFormData = (payload) => {
  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append("location", payload.location);
  formData.append("description", payload.description || "");

  (payload.images || []).forEach((image) => {
    formData.append("images", image);
  });

  if (payload.removeImages?.length) {
    formData.append("removeImages", JSON.stringify(payload.removeImages));
  }

  return formData;
};

export const getLostFoundItems = async ({
  scope = "all",
  page = 1,
  limit = 9,
  type,
  status,
  search,
} = {}) => {
  const endpoint =
    scope === "mine" ? "/user/lost-found/my-items" : "/user/lost-found/items";

  const response = await api.get(endpoint, {
    params: cleanParams({
      page,
      limit,
      type: type === "all" ? undefined : type,
      status: status === "all" ? undefined : status,
      search,
    }),
  });

  return response.data;
};

export const getLostFoundItemById = async (itemId) => {
  const response = await api.get(`/user/lost-found/items/${itemId}`);

  return response.data;
};

export const reportLostFoundItem = async (type, payload) => {
  const endpoint =
    type === "found"
      ? "/user/lost-found/report-found"
      : "/user/lost-found/report-lost";

  const response = await api.post(endpoint, buildItemFormData(payload), {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const updateLostFoundItem = async (itemId, payload) => {
  const response = await api.put(
    `/user/lost-found/items/${itemId}`,
    buildItemFormData(payload),
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
};

export const deleteLostFoundItem = async (itemId) => {
  const response = await api.delete(`/user/lost-found/items/${itemId}`);

  return response.data;
};

export const claimLostFoundItem = async (itemId) => {
  const response = await api.post(`/user/lost-found/items/${itemId}/claim`);

  return response.data;
};

export const resolveLostFoundItem = async (itemId) => {
  const response = await api.put(`/user/lost-found/items/${itemId}/resolve`);

  return response.data;
};

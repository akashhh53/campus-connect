import { useState, useRef, useEffect } from "react";

const CreatePost = ({ onCreatePost, creating, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    module: "feed",
  });
  const [attachments, setAttachments] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef(null);
  const contentRef = useRef(null);

  const MAX_CHARS = 500;
  const charCount = formData.content.length;

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const invalidFile = files.find(
      (file) =>
        !file.type.startsWith("image/") &&
        !file.type.startsWith("video/"),
    );

    if (invalidFile) {
      setSubmitError("Please choose image or video files only.");
      return;
    }

    const tooLarge = files.find((file) => file.size > 30 * 1024 * 1024);
    if (tooLarge) {
      setSubmitError("Each upload must be 30MB or smaller.");
      return;
    }

    setSubmitError("");
    setAttachments(files);
    
    // Create preview URLs
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleRemoveAttachment = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    
    URL.revokeObjectURL(previewUrls[index]);
    
    setAttachments(newAttachments);
    setPreviewUrls(newPreviewUrls);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() && !formData.content.trim() && attachments.length === 0) {
      return;
    }

    const postData = new FormData();
    postData.append("title", formData.title);
    postData.append("content", formData.content);
    postData.append("module", formData.module);
    
    attachments.forEach((file) => {
      postData.append("attachments", file);
    });

    try {
      setSubmitError("");
      await onCreatePost(postData);
    } catch (error) {
      setSubmitError(
        error.response?.data?.message || "Your post could not be published. Please try again.",
      );
      return;
    }

    // Reset form
    setFormData({
      title: "",
      content: "",
      module: "feed",
    });
    setAttachments([]);
    setPreviewUrls([]);
  };

  const handleCancel = () => {
    setFormData({
      title: "",
      content: "",
      module: "feed",
    });
    setAttachments([]);
    setPreviewUrls([]);
    // Call the onCancel prop to close the form
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="create-post-container">
      <form onSubmit={handleSubmit} className="create-post-form">
        <div className="form-header">
          <div className="header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <h2 className="form-title">Create Post</h2>
          <p className="form-subtitle">Share something with the community</p>
        </div>

        {/* Module Selector */}
        <div className="module-selector">
          <label className="module-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.06.07A10 10 0 0 0 12 17.66a10 10 0 0 0 6.32-2.59z"></path>
            </svg>
            Post to
          </label>
          <select
            name="module"
            value={formData.module}
            onChange={handleChange}
            className="module-select"
          >
            <option value="feed">📱 Feed</option>
            <option value="events">🎉 Events</option>
            <option value="academicHub">📚 Academic Hub</option>
          </select>
        </div>

        {/* Title Input */}
        <div className="input-group">
          <label className="input-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Title
          </label>
          <input
            type="text"
            name="title"
            placeholder="What's the headline?"
            value={formData.title}
            onChange={handleChange}
            className="title-input"
            maxLength="100"
          />
          <div className="input-hint">
            {formData.title.length}/100 characters
          </div>
        </div>

        {/* Content Input */}
        <div className="input-group">
          <label className="input-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            What's on your mind?
          </label>
          <textarea
            ref={contentRef}
            name="content"
            placeholder="Write something interesting..."
            value={formData.content}
            onChange={handleChange}
            rows={5}
            className="content-input"
            maxLength={MAX_CHARS}
            autoFocus
          />
          <div className={`char-counter ${charCount > MAX_CHARS - 50 ? 'warning' : ''}`}>
            {charCount}/{MAX_CHARS} characters
          </div>
        </div>

        {/* File Attachment Section */}
        <div className="attachment-section">
          <div className="attachment-header">
            <label className="attachment-label">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              Add Media
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="add-file-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Upload Files
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={handleFileChange}
            className="file-input"
            id="file-input"
          />
          
          <label htmlFor="file-input" className="file-input-label">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
            <span>Click or drag to upload images, videos, or documents</span>
          </label>

          {/* Preview Attachments */}
          {previewUrls.length > 0 && (
            <div className="preview-grid">
              {previewUrls.map((url, index) => (
                <div key={index} className="preview-item">
                  {attachments[index]?.type?.startsWith('image/') ? (
                    <img src={url} alt={`Preview ${index + 1}`} className="preview-image" />
                  ) : attachments[index]?.type?.startsWith('video/') ? (
                    <video className="preview-image" controls muted src={url} />
                  ) : (
                    <div className="preview-file">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                      </svg>
                      <span className="file-name">{attachments[index]?.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(index)}
                    className="remove-attachment"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {submitError && <p className="post-submit-error" role="alert">{submitError}</p>}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-btn"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating || (!formData.title.trim() && !formData.content.trim() && attachments.length === 0)}
            className={`submit-btn ${creating ? 'submitting' : ''}`}
          >
            {creating ? (
              <>
                <div className="spinner"></div>
                Posting...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Publish Post
              </>
            )}
          </button>
        </div>
      </form>

      <style jsx>{`
        .create-post-container {
          width: 100%;
        }

        .create-post-form {
          background: var(--cc-surface-raised);
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          padding: 18px;
          box-shadow: var(--cc-shadow-soft);
          backdrop-filter: blur(12px);
          transition: all 0.3s ease;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .create-post-form:hover {
          border-color: var(--cc-border-strong);
          box-shadow: var(--cc-shadow);
        }

        /* Form Header */
        .form-header {
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          column-gap: 12px;
          align-items: center;
          text-align: left;
          margin-bottom: 18px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--cc-border);
        }

        .header-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--cc-primary-soft), var(--cc-accent-soft));
          border-radius: var(--cc-radius);
          display: flex;
          align-items: center;
          justify-content: center;
          grid-row: 1 / span 2;
        }

        .header-icon svg {
          color: var(--cc-primary);
        }

        .form-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--cc-text);
          margin: 0;
        }

        .form-subtitle {
          font-size: 13px;
          color: var(--cc-muted);
          margin: 0;
        }

        /* Module Selector */
        .module-selector {
          margin-bottom: 16px;
        }

        .module-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 750;
          color: var(--cc-muted-strong);
          margin-bottom: 8px;
        }

        .module-label svg {
          color: var(--cc-primary);
        }

        .module-select {
          width: 100%;
          height: 42px;
          padding: 0 12px;
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          font-size: 14px;
          background: var(--cc-surface);
          color: var(--cc-text);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .module-select:hover {
          border-color: var(--cc-primary);
        }

        .module-select:focus {
          outline: none;
          border-color: var(--cc-primary);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
        }

        /* Input Groups */
        .input-group {
          margin-bottom: 16px;
        }

        .input-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 750;
          color: var(--cc-muted-strong);
          margin-bottom: 8px;
        }

        .input-label svg {
          color: var(--cc-primary);
        }

        .title-input {
          width: 100%;
          height: 42px;
          padding: 0 12px;
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          font-size: 14px;
          background: var(--cc-surface);
          color: var(--cc-text);
          transition: all 0.2s ease;
        }

        .title-input:focus {
          outline: none;
          border-color: var(--cc-primary);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
        }

        .input-hint {
          font-size: 11px;
          color: var(--cc-muted);
          margin-top: 4px;
          text-align: right;
        }

        .content-input {
          width: 100%;
          min-height: 118px;
          padding: 12px;
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          background: var(--cc-surface);
          color: var(--cc-text);
          transition: all 0.2s ease;
        }

        .content-input:focus {
          outline: none;
          border-color: var(--cc-primary);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
        }

        .char-counter {
          font-size: 11px;
          color: var(--cc-muted);
          margin-top: 4px;
          text-align: right;
          transition: color 0.2s ease;
        }

        .char-counter.warning {
          color: #f59e0b;
        }

        /* Attachment Section */
        .attachment-section {
          margin-bottom: 18px;
        }

        .attachment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .attachment-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 750;
          color: var(--cc-muted-strong);
        }

        .attachment-label svg {
          color: var(--cc-primary);
        }

        .add-file-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--cc-surface-soft);
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          font-size: 12px;
          font-weight: 500;
          color: var(--cc-muted-strong);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-file-btn:hover {
          background: var(--cc-surface);
          border-color: var(--cc-primary);
          color: var(--cc-primary);
        }

        .file-input {
          display: none;
        }

        .file-input-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 22px;
          border: 1px dashed var(--cc-border-strong);
          border-radius: var(--cc-radius);
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--cc-surface-soft);
        }

        .file-input-label:hover {
          border-color: var(--cc-primary);
          background: var(--cc-surface);
        }

        .file-input-label svg {
          color: var(--cc-muted);
        }

        .file-input-label span {
          font-size: 13px;
          color: var(--cc-muted);
        }

        /* Preview Grid */
        .preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .preview-item {
          position: relative;
          border-radius: var(--cc-radius);
          overflow: hidden;
          background: var(--cc-surface-soft);
          border: 1px solid var(--cc-border);
        }

        .preview-image {
          width: 100%;
          height: 120px;
          object-fit: cover;
          pointer-events: none;
        }

        video.preview-image {
          pointer-events: auto;
          background: #000;
        }

        .post-submit-error {
          margin: 10px 0 0;
          color: var(--cc-danger);
          font-size: 13px;
          font-weight: 650;
        }

        .preview-file {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          gap: 8px;
        }

        .preview-file svg {
          color: var(--cc-primary);
        }

        .file-name {
          font-size: 11px;
          color: var(--cc-muted);
          text-align: center;
          word-break: break-all;
        }

        .remove-attachment {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          background: rgba(0,0,0,0.6);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .remove-attachment svg {
          color: white;
        }

        .remove-attachment:hover {
          background: rgba(220, 38, 38, 0.8);
          transform: scale(1.1);
        }

        /* Form Actions */
        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 16px;
          border-top: 1px solid var(--cc-border);
        }

        .cancel-btn {
          padding: 10px 20px;
          background: var(--cc-surface);
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          font-size: 14px;
          font-weight: 500;
          color: var(--cc-muted-strong);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn:hover:not(:disabled) {
          background: var(--cc-surface-soft);
          border-color: var(--cc-border-strong);
          color: var(--cc-text);
        }

        .submit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          background: linear-gradient(135deg, var(--cc-primary), var(--cc-accent));
          border: none;
          border-radius: var(--cc-radius);
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.26);
        }

        .submit-btn:disabled,
        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-btn.submitting {
          opacity: 0.8;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .create-post-form {
            padding: 16px;
          }

          .form-actions {
            flex-direction: column;
          }

          .submit-btn,
          .cancel-btn {
            width: 100%;
            justify-content: center;
          }

          .preview-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          }
        }

        @media (max-width: 480px) {
          .attachment-header {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }

          .add-file-btn {
            width: 100%;
            justify-content: center;
          }

          .file-input-label {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default CreatePost;

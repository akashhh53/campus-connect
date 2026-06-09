import { useState, useRef, useEffect } from "react";
import { updateProfile } from "../../services/profileService";

const EditProfileModal = ({ user, onClose }) => {
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(user?.profilePicture || null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl !== user?.profilePicture) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, user?.profilePicture]);

  const validateFile = (file) => {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError("File size must be less than 5MB");
      return false;
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setImageError("Only JPEG, PNG, GIF, and WEBP images are allowed");
      return false;
    }

    setImageError("");
    return true;
  };

  const processFile = (file) => {
    if (!validateFile(file)) return;

    setProfilePicture(file);
    setUploadProgress(0);
    
    // Simulate upload progress for better UX
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress <= 90) {
        setUploadProgress(progress);
      } else {
        clearInterval(interval);
      }
    }, 50);

    // Create preview URL
    if (previewUrl && previewUrl !== user?.profilePicture) {
      URL.revokeObjectURL(previewUrl);
    }
    
    const newPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(newPreviewUrl);
    
    // Complete progress
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 500);
    }, 500);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const removeImage = () => {
    if (previewUrl && previewUrl !== user?.profilePicture) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(user?.profilePicture || null);
    setProfilePicture(null);
    setUploadProgress(0);
    setImageError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await updateProfile({ name, bio, profilePicture });

      console.log("PROFILE RESPONSE:", response);
      console.log("PROFILE URL:", response?.data?.profilePicture);

      const authData = JSON.parse(localStorage.getItem("userInfo"));

      if (authData) {
        const updatedUser = {
          ...authData.user,
          ...response.data,
        };

        const updatedAuth = {
          ...authData,
          user: updatedUser,
        };

        localStorage.setItem("userInfo", JSON.stringify(updatedAuth));
      }

      onClose();
      window.location.reload();
    } catch (error) {
      console.log("Update Error:", error);
      setImageError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const modalStyles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      animation: "fadeIn 0.2s ease-out",
    },
    modal: {
      backgroundColor: "#ffffff",
      borderRadius: "20px",
      width: "90%",
      maxWidth: "550px",
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      animation: "slideUp 0.3s ease-out",
    },
    header: {
      padding: "28px 32px 0 32px",
      borderBottom: "1px solid #f0f0f0",
    },
    title: {
      fontSize: "26px",
      fontWeight: "700",
      color: "#111827",
      margin: 0,
      marginBottom: "8px",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    subtitle: {
      fontSize: "14px",
      color: "#6b7280",
      margin: 0,
      marginBottom: "20px",
    },
    form: {
      padding: "28px 32px 32px 32px",
    },
    formGroup: {
      marginBottom: "28px",
    },
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "600",
      color: "#374151",
      marginBottom: "8px",
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      fontSize: "14px",
      border: "2px solid #e5e7eb",
      borderRadius: "12px",
      transition: "all 0.2s",
      outline: "none",
      fontFamily: "inherit",
      backgroundColor: "#fafafa",
    },
    textarea: {
      width: "100%",
      padding: "12px 14px",
      fontSize: "14px",
      border: "2px solid #e5e7eb",
      borderRadius: "12px",
      transition: "all 0.2s",
      outline: "none",
      fontFamily: "inherit",
      resize: "vertical",
      backgroundColor: "#fafafa",
    },
    dropZone: {
      border: `2px dashed ${dragActive ? "#667eea" : "#d1d5db"}`,
      borderRadius: "16px",
      padding: "32px",
      textAlign: "center",
      cursor: "pointer",
      transition: "all 0.3s ease",
      backgroundColor: dragActive ? "#f3f4ff" : "#fafafa",
      position: "relative",
      overflow: "hidden",
    },
    previewContainer: {
      position: "relative",
      display: "inline-block",
    },
    previewImage: {
      width: "120px",
      height: "120px",
      borderRadius: "50%",
      objectFit: "cover",
      border: "4px solid white",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
      transition: "transform 0.3s ease",
    },
    removeButton: {
      position: "absolute",
      bottom: "-10px",
      right: "-10px",
      backgroundColor: "#ef4444",
      color: "white",
      border: "none",
      borderRadius: "50%",
      width: "32px",
      height: "32px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    progressBar: {
      width: "100%",
      height: "4px",
      backgroundColor: "#e5e7eb",
      borderRadius: "2px",
      marginTop: "16px",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#667eea",
      borderRadius: "2px",
      transition: "width 0.3s ease",
      width: `${uploadProgress}%`,
    },
    errorMessage: {
      fontSize: "12px",
      color: "#ef4444",
      marginTop: "8px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    buttonGroup: {
      display: "flex",
      gap: "12px",
      marginTop: "32px",
    },
    saveButton: {
      flex: 1,
      padding: "12px 24px",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      border: "none",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s",
      opacity: 1,
      position: "relative",
      overflow: "hidden",
    },
    cancelButton: {
      flex: 1,
      padding: "12px 24px",
      backgroundColor: "white",
      color: "#374151",
      border: "2px solid #e5e7eb",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.3s",
    },
  };

  // Add keyframe animations to document head
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      input:focus, textarea:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        background-color: white;
      }
      
      button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.15);
      }
      
      button:active:not(:disabled) {
        transform: translateY(0);
      }
      
      .preview-image:hover {
        transform: scale(1.05);
        cursor: pointer;
      }
      
      .remove-button:hover {
        background-color: #dc2626;
        transform: scale(1.1);
      }
      
      ::-webkit-scrollbar {
        width: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: #c7d2fe;
        border-radius: 10px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: #818cf8;
      }
    `;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Edit Profile</h2>
          <p style={modalStyles.subtitle}>Update your personal information</p>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              style={modalStyles.input}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
              required
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows="4"
              placeholder="Tell us about yourself..."
              style={modalStyles.textarea}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Profile Photo</label>
            
            <div
              ref={dropZoneRef}
              style={modalStyles.dropZone}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div style={modalStyles.previewContainer}>
                  <img
                    src={previewUrl}
                    alt="Profile preview"
                    style={modalStyles.previewImage}
                    className="preview-image"
                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                  />
                  <button
                    type="button"
                    style={modalStyles.removeButton}
                    className="remove-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage();
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div>
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={dragActive ? "#667eea" : "#9ca3af"}
                    strokeWidth="1.5"
                    style={{ margin: "0 auto 16px", transition: "all 0.3s" }}
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                    <path d="M12 9v4M10 11h4" />
                  </svg>
                  <p style={{ color: dragActive ? "#667eea" : "#6b7280", fontSize: "14px", fontWeight: "500", margin: 0 }}>
                    {dragActive ? "Drop your image here" : "Drag & drop or click to upload"}
                  </p>
                  <p style={{ color: "#9ca3af", fontSize: "12px", marginTop: "8px" }}>
                    PNG, JPG, GIF, WEBP up to 5MB
                  </p>
                </div>
              )}
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div style={modalStyles.progressBar}>
                  <div style={modalStyles.progressFill} />
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                capture="user"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>

            {imageError && (
              <div style={modalStyles.errorMessage}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {imageError}
              </div>
            )}

            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "12px", textAlign: "center" }}>
              💡 Tip: You can crop your image after selecting (on most devices)
            </p>
          </div>

          <div style={modalStyles.buttonGroup}>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...modalStyles.saveButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ animation: "spin 1s linear infinite" }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={modalStyles.cancelButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f9fafb";
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
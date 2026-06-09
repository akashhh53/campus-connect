import api from "../api/axios";

export const getMyPosts = async (page = 1, limit = 10) => {
  const response = await api.get(`/user/my-posts?page=${page}&limit=${limit}`);
  return response.data;
};

export const updateProfile = async (data) => {
  const formData = new FormData();
  formData.append("name", data.name);
  formData.append("bio", data.bio);
  
  if (data.profilePicture) {
    formData.append("profilePicture", data.profilePicture);
  }

  const response = await api.put(
    "/user/profile-update",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
};

export const getSavedPostsCount = async () => {
  const response = await api.get("/user/posts/saved/count");
  return response.data;
};

export const getSavedPosts = async (page = 1, limit = 10) => {
  const response = await api.get(
    `/user/posts/saved?page=${page}&limit=${limit}`,
  );
  return response.data;
};
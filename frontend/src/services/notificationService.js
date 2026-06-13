import api from "../api/axios";

// Get notifications
export const getNotifications = async (page = 1, limit = 20) => {
  const response = await api.get(
    `/user/notifications?page=${page}&limit=${limit}`,
  );

  return response.data;
};

// Mark one read
export const markRead = async (notificationId) => {
  const response = await api.put(`/user/notifications/${notificationId}/read`);

  return response.data;
};

// Mark all read
export const markAllRead = async () => {
  const response = await api.put("/user/notifications/read-all");

  return response.data;
};

import api from "../api/axios";

export const openChat = async (recipientId) => {
  const res = await api.post("/chat/room", {
    recipientId,
  });

  return res.data;
};

export const sendMessage = async (data) => {
  const res = await api.post("/chat/send", data);

  return res.data;
};

export const getMessages = async (roomId, page = 1) => {
  const res = await api.get(`/chat/messages/${roomId}?page=${page}`);

  return res.data;
};

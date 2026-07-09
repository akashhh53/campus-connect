import api from "../api/axios";
import {
  getCachedValue,
  removeCacheByPrefix,
  setCachedValue,
} from "../utils/clientCache";

const CHAT_CACHE_PREFIX = "cc:chat:";
const CHAT_LIST_CACHE_KEY = `${CHAT_CACHE_PREFIX}my-chats`;
const CHAT_LIST_TTL = 20 * 1000;
const CHAT_MESSAGES_TTL = 60 * 1000;

const messagesCacheKey = (roomId, page = 1) =>
  `${CHAT_CACHE_PREFIX}messages:${roomId}:${page}`;

export const getCachedMyChats = () =>
  getCachedValue(CHAT_LIST_CACHE_KEY, CHAT_LIST_TTL);

export const getCachedMessages = (roomId, page = 1) =>
  getCachedValue(messagesCacheKey(roomId, page), CHAT_MESSAGES_TTL);

export const clearChatCache = (roomId) => {
  removeCacheByPrefix(CHAT_LIST_CACHE_KEY);

  if (roomId) {
    removeCacheByPrefix(`${CHAT_CACHE_PREFIX}messages:${roomId}:`);
  }
};

export const openChat = async (recipientId) => {
  const res = await api.post("/chat/room", {
    recipientId,
  });

  return res.data;
};

export const sendMessage = async (data) => {
  const res = await api.post("/chat/send", data);

  clearChatCache(data.roomId);
  return res.data;
};

export const getMessages = async (roomId, page = 1, options = {}) => {
  const cacheKey = messagesCacheKey(roomId, page);
  const cached = !options.force
    ? getCachedValue(cacheKey, CHAT_MESSAGES_TTL)
    : null;

  if (cached) {
    return cached;
  }

  const res = await api.get(`/chat/messages/${roomId}?page=${page}`);

  setCachedValue(cacheKey, res.data);
  return res.data;
};

export const getMyChats = async (options = {}) => {
  const cached = !options.force
    ? getCachedValue(CHAT_LIST_CACHE_KEY, CHAT_LIST_TTL)
    : null;

  if (cached) {
    return cached;
  }

  const res = await api.get("/chat/my-chats");

  setCachedValue(CHAT_LIST_CACHE_KEY, res.data);
  return res.data;
};

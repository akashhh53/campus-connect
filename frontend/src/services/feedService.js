import axiosInstance from "../api/axios";
import {
  getCachedValue,
  removeCacheByPrefix,
  setCachedValue,
} from "../utils/clientCache";

const FEED_CACHE_PREFIX = "cc:feed:";
const FEED_CACHE_TTL = 45 * 1000;

export const getCachedFeedPosts = (page = 1, limit = 10) =>
  getCachedValue(`${FEED_CACHE_PREFIX}posts:${page}:${limit}`, FEED_CACHE_TTL);

export const clearFeedCache = () => removeCacheByPrefix(FEED_CACHE_PREFIX);

export const getFeedPosts = async (page = 1, limit = 10, options = {}) => {
  const cacheKey = `${FEED_CACHE_PREFIX}posts:${page}:${limit}`;
  const cached = !options.force ? getCachedValue(cacheKey, FEED_CACHE_TTL) : null;

  if (cached) {
    return cached;
  }

  const response = await axiosInstance.get(
    `/user/posts?page=${page}&limit=${limit}`,
  );

  setCachedValue(cacheKey, response.data);
  return response.data;
};
export const createPost = async (postData) => {
  const response = await axiosInstance.post("/user/posts", postData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  clearFeedCache();
  return response.data;
};

export const savePost = async (postId) => {
  const response = await axiosInstance.post(`/user/posts/${postId}/save`);

  clearFeedCache();
  return response.data;
};

export const unsavePost = async (postId) => {
  const response = await axiosInstance.delete(`/user/posts/${postId}/save`);

  clearFeedCache();
  return response.data;
};

export const getPostById = async (id) => {
  const response = await axiosInstance.get(`/user/posts/${id}`);

  return response.data;
};

export const deletePost =
async (postId) => {
  const response =
    await axiosInstance.delete(
      `/user/posts/${postId}`
    );

  clearFeedCache();
  return response.data;
};

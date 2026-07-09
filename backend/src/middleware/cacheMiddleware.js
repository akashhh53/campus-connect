const crypto = require("crypto");
const redisClient = require("../config/redis");

const isRedisReady = () => redisClient?.isReady;

const getCacheVersion = async (namespace) => {
  if (!isRedisReady()) return "0";

  return (await redisClient.get(`cache-version:${namespace}`)) || "0";
};

const buildCacheKey = async (namespace, req) => {
  const version = await getCacheVersion(namespace);
  const user = req.user || {};
  const rawKey = JSON.stringify({
    namespace,
    version,
    userId: user._id?.toString() || "guest",
    collegeId: user.collegeId?.toString() || "none",
    role: user.role?.name || user.role?.toString?.() || "none",
    method: req.method,
    url: req.originalUrl,
  });
  const digest = crypto.createHash("sha1").update(rawKey).digest("hex");

  return `cache:${namespace}:${version}:${digest}`;
};

const cacheResponse = (namespace, ttlSeconds = 30) => async (req, res, next) => {
  if (req.method !== "GET" || req.headers["cache-control"] === "no-cache") {
    return next();
  }

  if (!isRedisReady()) {
    res.set("X-Cache", "BYPASS");
    return next();
  }

  try {
    const cacheKey = await buildCacheKey(namespace, req);
    const cachedPayload = await redisClient.get(cacheKey);

    res.set("Cache-Control", `private, max-age=${ttlSeconds}`);
    res.set("Vary", "Authorization, Cookie");

    if (cachedPayload) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(JSON.parse(cachedPayload));
    }

    const originalJson = res.json.bind(res);

    res.json = (payload) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(payload)).catch(() => {});
      }

      res.set("X-Cache", "MISS");
      return originalJson(payload);
    };

    return next();
  } catch (error) {
    res.set("X-Cache", "BYPASS");
    return next();
  }
};

const bumpCacheNamespaces = (namespaces = []) => (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    if (isRedisReady() && res.statusCode >= 200 && res.statusCode < 300) {
      Promise.all(
        namespaces.map((namespace) => redisClient.incr(`cache-version:${namespace}`)),
      ).catch(() => {});
    }

    return originalJson(payload);
  };

  return next();
};

module.exports = {
  bumpCacheNamespaces,
  cacheResponse,
};

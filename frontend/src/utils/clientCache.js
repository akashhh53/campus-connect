const memoryCache = new Map();

const readStorage = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStorage = (key, entry) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Session storage may be full or unavailable; memory cache still works.
  }
};

export const getCachedValue = (key, ttlMs) => {
  const now = Date.now();
  const entry = memoryCache.get(key) || readStorage(key);

  if (!entry || now - entry.createdAt > ttlMs) {
    memoryCache.delete(key);
    return null;
  }

  memoryCache.set(key, entry);
  return entry.value;
};

export const setCachedValue = (key, value) => {
  const entry = {
    createdAt: Date.now(),
    value,
  };

  memoryCache.set(key, entry);
  writeStorage(key, entry);
};

export const removeCacheByPrefix = (prefix) => {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore storage cleanup failures.
  }
};

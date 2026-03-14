const cache = new Map();

export async function fetchJson(url, options = {}) {
  const { cache: useCache = true, ...fetchOptions } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const cacheKey = method === "GET" && useCache ? url : null;

  if (cacheKey && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  if (cacheKey && !useCache) {
    cache.delete(cacheKey);
  }

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed for ${url}: ${res.status} ${text}`);
  }

  const data = await res.json();
  if (cacheKey) {
    cache.set(cacheKey, data);
  }

  return data;
}

export function invalidateCache(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function clearCache() {
  cache.clear();
}


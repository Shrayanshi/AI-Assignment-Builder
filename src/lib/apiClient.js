/**
 * Lightweight API client with:
 *  - Auth header injection (Bearer token from localStorage)
 *  - In-flight deduplication: if the same GET is already in-flight, return the
 *    same promise instead of firing a second network request.  This is what
 *    prevents double-fetches caused by React StrictMode's double-invoke of
 *    effects in development.
 *  - Simple result cache (invalidated via invalidateCache / clearCache).
 */

const resultCache  = new Map(); // url → resolved data
const inflightMap  = new Map(); // url → Promise (while request is in-flight)

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchJson(url, options = {}) {
  const { cache: useCache = true, ...fetchOptions } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();

  // Only cache / deduplicate GET requests
  if (method !== "GET") {
    const res = await fetch(url, {
      ...fetchOptions,
      headers: { ...getAuthHeaders(), ...fetchOptions.headers },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Request failed for ${url}: ${res.status} ${text}`);
    }
    return res.json();
  }

  // Evict stale result so we don't serve an old cached value,
  // but leave any in-flight promise alone — concurrent callers
  // (e.g. React StrictMode's double-invoke) still share it.
  if (!useCache) {
    resultCache.delete(url);
  }

  // Return cached result immediately
  if (useCache && resultCache.has(url)) {
    return resultCache.get(url);
  }

  // Return the in-flight promise so concurrent callers share one request
  if (inflightMap.has(url)) {
    return inflightMap.get(url);
  }

  // Start a new request
  const promise = fetch(url, {
    ...fetchOptions,
    headers: { ...getAuthHeaders(), ...fetchOptions.headers },
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Request failed for ${url}: ${res.status} ${text}`);
      }
      const data = await res.json();
      resultCache.set(url, data);   // populate result cache
      inflightMap.delete(url);      // no longer in-flight
      return data;
    })
    .catch((err) => {
      inflightMap.delete(url);      // clean up on error too
      throw err;
    });

  inflightMap.set(url, promise);
  return promise;
}

export function invalidateCache(prefix) {
  for (const key of resultCache.keys()) {
    if (key.startsWith(prefix)) resultCache.delete(key);
  }
  for (const key of inflightMap.keys()) {
    if (key.startsWith(prefix)) inflightMap.delete(key);
  }
}

export function clearCache() {
  resultCache.clear();
  inflightMap.clear();
}

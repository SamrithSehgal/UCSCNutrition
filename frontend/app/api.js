const BASE_URL = "http://169.233.146.37:8000/api";
const DEFAULT_TIMEOUT_MS = 8000;

function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}

export async function get(path, opts = {}) {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {}, opts.timeout);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function post(path, body, opts = {}) {
  const res = await fetchWithTimeout(
    `${BASE_URL}${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    opts.timeout
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function postQuery(path, params, opts = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetchWithTimeout(
    `${BASE_URL}${path}?${qs}`,
    { method: "POST" },
    opts.timeout
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

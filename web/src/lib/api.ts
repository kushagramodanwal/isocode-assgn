import type { ApiError } from "../../../shared/api";

export class ApiFailure extends Error {
  constructor(public status: number, public body: ApiError | null, public offline = false) {
    super(body?.message ?? (offline ? "No connection" : `Request failed (${status})`));
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiFailure(0, null, true);
  }
  const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;
  // 409 carries a structured "not done, here's why" body that callers handle themselves.
  if (!res.ok && res.status !== 409) throw new ApiFailure(res.status, data);
  return { status: res.status, data: data as T };
}

/** Upload a photo or voice note as raw bytes (no base64: a third less data on 3G). */
async function upload<T>(path: string, body: Blob, type: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": type }, body });
  } catch {
    throw new ApiFailure(0, null, true);
  }
  const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;
  if (!res.ok) throw new ApiFailure(res.status, data);
  return data as T;
}

export const api = {
  upload,
  get: async <T,>(path: string) => (await request<T>("GET", path)).data,
  post: async <T,>(path: string, body: unknown = {}) => (await request<T>("POST", path, body)).data,
  put: async <T,>(path: string, body: unknown) => (await request<T>("PUT", path, body)).data,
};

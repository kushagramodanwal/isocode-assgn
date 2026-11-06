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

export const api = {
  get: async <T,>(path: string) => (await request<T>("GET", path)).data,
  post: async <T,>(path: string, body: unknown = {}) => (await request<T>("POST", path, body)).data,
  put: async <T,>(path: string, body: unknown) => (await request<T>("PUT", path, body)).data,
};

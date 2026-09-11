const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export const ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

// Backend returns relative paths like "/uploads/xyz.png" - resolve them against the API origin.
export const fileUrl = (path?: string | null) => {
  if (!path) return '';
  return path.startsWith('http') ? path : `${ORIGIN}${path}`;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dodee_token') : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('dodee_token');
      localStorage.removeItem('dodee_user');
    }
    throw new ApiError(data.message || 'เกิดข้อผิดพลาด', res.status);
  }

  return data as T;
}

async function uploadFile(file: File): Promise<{ url: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dodee_token') : null;
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE_URL}/uploads`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || 'อัปโหลดไฟล์ไม่สำเร็จ', res.status);
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: uploadFile,
};

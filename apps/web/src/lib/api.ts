import { Session } from '../types';

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

interface ApiOptions extends RequestInit {
  token?: string;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message || 'No fue posible completar la solicitud';
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(identifier: string, password: string) {
    return request<Session>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },
  changePassword(
    body: { currentPassword: string; newPassword: string },
    token: string,
  ) {
    return request<{ message: string }>('/auth/password', {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    });
  },
  requestPasswordReset(identifier: string) {
    return request<{
      message: string;
      emailDelivered?: boolean;
      resetToken?: string;
      resetUrl?: string;
    }>('/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },
  resetPassword(token: string, newPassword: string) {
    return request<{ message: string }>('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
  get<T>(path: string, token: string) {
    return request<T>(path, { token });
  },
  patch<T>(path: string, body: unknown, token: string) {
    return request<T>(path, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    });
  },
  post<T>(path: string, body: unknown, token: string) {
    return request<T>(path, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    });
  },
  delete<T>(path: string, token: string) {
    return request<T>(path, {
      method: 'DELETE',
      token,
    });
  },
};

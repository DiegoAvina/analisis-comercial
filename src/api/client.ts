import axios from 'axios';

const FALLBACK_URL = 'http://localhost:8000/api';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? FALLBACK_URL;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: 'application/json',
  },
});

const TOKEN_KEY = 'finanzas_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const url = axios.isAxiosError(error) ? (error.config?.url ?? '') : '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthEndpoint) {
      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);

/**
 * Los errores 4xx/5xx de la API vienen normalizados como
 * { message, errors? } gracias al manejador centralizado del backend.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error. Intenta de nuevo.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;

    if (data?.errors) {
      const firstField = Object.values(data.errors)[0];
      if (firstField?.[0]) return firstField[0];
    }

    if (data?.message) return data.message;

    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      return 'No se pudo conectar con el servidor. Revisa tu conexión o la URL de la API.';
    }
  }

  return fallback;
}

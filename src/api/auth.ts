import { api } from './client';
import type { User } from './types';

export interface AuthResponse {
  token: string;
  user: User;
}

export function registerRequest(data: { name: string; email: string; password: string }) {
  return api.post<AuthResponse>('/auth/register', data).then((r) => r.data);
}

export function loginRequest(data: { email: string; password: string }) {
  return api.post<AuthResponse>('/auth/login', data).then((r) => r.data);
}

export function logoutRequest() {
  return api.post('/auth/logout');
}

export function meRequest() {
  return api.get<User>('/auth/me').then((r) => r.data);
}

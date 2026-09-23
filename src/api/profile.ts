import { api } from './client';
import type { User } from './types';

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  password?: string;
  current_password?: string;
}

export function updateProfile(data: UpdateProfileInput) {
  return api.put<User>('/profile', data).then((r) => r.data);
}

export function uploadAvatar(file: File) {
  const form = new FormData();
  form.append('avatar', file);

  return api
    .post<User>('/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
}

export function deleteAccount(password: string) {
  return api.delete('/profile', { data: { password } });
}

export function resetAccountData(password: string) {
  return api.post('/profile/reset-data', { password });
}

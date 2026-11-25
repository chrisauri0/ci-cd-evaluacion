import { APIRequestContext, expect } from '@playwright/test';

export const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@demo.com',
  password: process.env.ADMIN_PASSWORD ?? 'Admin123!',
};

export const uid = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

export async function loginApi(request: APIRequestContext, creds = ADMIN) {
  const res = await request.post('/api/auth/login', { data: creds });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return { token: body.accessToken as string, headers: { Authorization: `Bearer ${body.accessToken}` } };
}

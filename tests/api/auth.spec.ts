import { expect, test } from '@playwright/test';
import { ADMIN, loginApi } from '../helpers';

test.describe('API · Autenticación', () => {
  test('health responde ok y consulta la base de datos', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });

  test('login válido devuelve JWT y datos del usuario', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: ADMIN });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.user).toMatchObject({ email: ADMIN.email, role: 'admin' });
    expect(body.user.passwordHash).toBeUndefined();
  });

  test('login con contraseña incorrecta devuelve 401', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { email: ADMIN.email, password: 'incorrecta' } });
    expect(res.status()).toBe(401);
  });

  test('login con correo inexistente devuelve 401', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { email: 'nadie@demo.com', password: 'Whatever123' } });
    expect(res.status()).toBe(401);
  });

  test('login con cuerpo inválido devuelve 400', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { email: 'no-es-correo' } });
    expect(res.status()).toBe(400);
  });

  test('/auth/me requiere token y devuelve el usuario autenticado', async ({ request }) => {
    expect((await request.get('/api/auth/me')).status()).toBe(401);
    const { headers } = await loginApi(request);
    const res = await request.get('/api/auth/me', { headers });
    expect(res.status()).toBe(200);
    expect((await res.json()).email).toBe(ADMIN.email);
  });

  test('token falso es rechazado', async ({ request }) => {
    const res = await request.get('/api/products', { headers: { Authorization: 'Bearer abc.def.ghi' } });
    expect(res.status()).toBe(401);
  });
});

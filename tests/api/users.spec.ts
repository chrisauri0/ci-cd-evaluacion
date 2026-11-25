import { expect, test } from '@playwright/test';
import { loginApi, uid } from '../helpers';

test.describe('API · CRUD de usuarios', () => {
  test('ciclo completo crear, leer, actualizar y eliminar', async ({ request }) => {
    const { headers } = await loginApi(request);
    const email = `user${uid()}@demo.com`;

    // CREATE
    const created = await request.post('/api/users', {
      headers,
      data: { name: 'Usuario Prueba', email, password: 'Password123', role: 'user' },
    });
    expect(created.status()).toBe(201);
    const user = await created.json();
    expect(user).toMatchObject({ name: 'Usuario Prueba', email, role: 'user' });
    expect(user.passwordHash).toBeUndefined();

    // READ
    const one = await request.get(`/api/users/${user.id}`, { headers });
    expect(one.status()).toBe(200);
    const list = await (await request.get('/api/users', { headers })).json();
    expect(list.some((u: any) => u.id === user.id)).toBe(true);

    // UPDATE
    const updated = await request.put(`/api/users/${user.id}`, { headers, data: { name: 'Nombre Editado', role: 'admin' } });
    expect(updated.status()).toBe(200);
    expect(await updated.json()).toMatchObject({ name: 'Nombre Editado', role: 'admin' });

    // DELETE
    expect((await request.delete(`/api/users/${user.id}`, { headers })).status()).toBe(200);
    expect((await request.get(`/api/users/${user.id}`, { headers })).status()).toBe(404);
  });

  test('correo duplicado devuelve 409', async ({ request }) => {
    const { headers } = await loginApi(request);
    const email = `dup${uid()}@demo.com`;
    const data = { name: 'Dup', email, password: 'Password123' };
    const first = await request.post('/api/users', { headers, data });
    expect(first.status()).toBe(201);
    expect((await request.post('/api/users', { headers, data })).status()).toBe(409);
    await request.delete(`/api/users/${(await first.json()).id}`, { headers });
  });

  test('validaciones: contraseña corta y correo inválido devuelven 400', async ({ request }) => {
    const { headers } = await loginApi(request);
    const res = await request.post('/api/users', { headers, data: { name: 'X', email: 'malo', password: '123' } });
    expect(res.status()).toBe(400);
  });

  test('un usuario normal no puede administrar usuarios (403)', async ({ request }) => {
    const admin = await loginApi(request);
    const email = `normal${uid()}@demo.com`;
    const created = await request.post('/api/users', {
      headers: admin.headers,
      data: { name: 'Normal', email, password: 'Password123', role: 'user' },
    });
    const id = (await created.json()).id;

    const normal = await loginApi(request, { email, password: 'Password123' });
    expect((await request.get('/api/users', { headers: normal.headers })).status()).toBe(403);

    await request.delete(`/api/users/${id}`, { headers: admin.headers });
  });

  test('sin token no se accede a usuarios (401)', async ({ request }) => {
    expect((await request.get('/api/users')).status()).toBe(401);
  });
});

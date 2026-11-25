import { expect, test } from '@playwright/test';
import { loginApi, uid } from '../helpers';

test.describe('API · CRUD de productos', () => {
  test('ciclo completo crear, leer, actualizar y eliminar', async ({ request }) => {
    const { headers } = await loginApi(request);

    // CREATE
    const created = await request.post('/api/products', {
      headers,
      data: { name: `Laptop ${uid()}`, description: 'Equipo de prueba', price: 15999.5, stock: 10 },
    });
    expect(created.status()).toBe(201);
    const product = await created.json();
    expect(product.price).toBe(15999.5); // numérico, no string
    expect(product.stock).toBe(10);

    // READ
    expect((await request.get(`/api/products/${product.id}`, { headers })).status()).toBe(200);
    const list = await (await request.get('/api/products', { headers })).json();
    expect(list.some((p: any) => p.id === product.id)).toBe(true);

    // UPDATE
    const updated = await request.put(`/api/products/${product.id}`, { headers, data: { price: 12000, stock: 3 } });
    expect(updated.status()).toBe(200);
    expect(await updated.json()).toMatchObject({ price: 12000, stock: 3 });

    // DELETE
    expect((await request.delete(`/api/products/${product.id}`, { headers })).status()).toBe(200);
    expect((await request.get(`/api/products/${product.id}`, { headers })).status()).toBe(404);
  });

  test('validaciones: precio negativo y stock decimal devuelven 400', async ({ request }) => {
    const { headers } = await loginApi(request);
    const bad = await request.post('/api/products', { headers, data: { name: 'Malo', price: -5, stock: 1.5 } });
    expect(bad.status()).toBe(400);
  });

  test('id inexistente devuelve 404', async ({ request }) => {
    const { headers } = await loginApi(request);
    expect((await request.get('/api/products/99999999', { headers })).status()).toBe(404);
  });

  test('sin token no se accede a productos (401)', async ({ request }) => {
    expect((await request.get('/api/products')).status()).toBe(401);
  });

  test('usuario normal puede leer pero no escribir productos', async ({ request }) => {
    const admin = await loginApi(request);
    const email = `lector${uid()}@demo.com`;
    const created = await request.post('/api/users', {
      headers: admin.headers,
      data: { name: 'Lector', email, password: 'Password123', role: 'user' },
    });
    const userId = (await created.json()).id;
    const normal = await loginApi(request, { email, password: 'Password123' });

    expect((await request.get('/api/products', { headers: normal.headers })).status()).toBe(200);
    const write = await request.post('/api/products', {
      headers: normal.headers,
      data: { name: 'No permitido', price: 1, stock: 1 },
    });
    expect(write.status()).toBe(403);

    await request.delete(`/api/users/${userId}`, { headers: admin.headers });
  });
});

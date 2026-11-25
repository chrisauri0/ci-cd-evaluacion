import { expect, Page, test } from '@playwright/test';
import { ADMIN, uid } from '../helpers';

async function login(page: Page) {
  await page.goto('/');
  await page.getByTestId('login-email').fill(ADMIN.email);
  await page.getByTestId('login-password').fill(ADMIN.password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('user-label')).toBeVisible();
}

test.describe('UI · CRUD de productos', () => {
  test('crear, editar y eliminar un producto desde la interfaz', async ({ page }) => {
    await login(page);
    const name = `Teclado ${uid()}`;
    const row = page.locator(`[data-testid="product-row"][data-name="${name}"]`);

    // Crear
    await page.getByTestId('product-name').fill(name);
    await page.getByTestId('product-description').fill('Mecánico');
    await page.getByTestId('product-price').fill('899.90');
    await page.getByTestId('product-stock').fill('25');
    await page.getByTestId('product-save').click();
    await expect(row).toBeVisible();
    await expect(row).toContainText('899.90');

    // Editar
    await row.getByTestId('product-edit').click();
    await page.getByTestId('product-price').fill('799.00');
    await page.getByTestId('product-save').click();
    await expect(row).toContainText('799.00');

    // Eliminar
    await row.getByTestId('product-delete').click();
    await expect(row).toHaveCount(0);
  });

  test('muestra el error de validación del servidor', async ({ page }) => {
    await login(page);
    await page.getByTestId('product-name').fill(`Inválido ${uid()}`);
    await page.getByTestId('product-price').fill('10');
    await page.getByTestId('product-stock').fill('1.5'); // el servidor exige entero
    await page.getByTestId('product-save').evaluate((b: HTMLButtonElement) => b.form!.noValidate = true);
    await page.getByTestId('product-save').click();
    await expect(page.getByTestId('product-error')).toBeVisible();
  });
});

test.describe('UI · CRUD de usuarios', () => {
  test('crear, editar y eliminar un usuario desde la interfaz', async ({ page }) => {
    await login(page);
    await page.getByTestId('tab-users').click();
    const email = `ui${uid()}@demo.com`;
    const row = page.locator(`[data-testid="user-row"][data-email="${email}"]`);

    // Crear
    await page.getByTestId('user-name').fill('Usuario UI');
    await page.getByTestId('user-email').fill(email);
    await page.getByTestId('user-password').fill('Password123');
    await page.getByTestId('user-save').click();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Usuario UI');

    // Editar
    await row.getByTestId('user-edit').click();
    await page.getByTestId('user-name').fill('Usuario UI Editado');
    await page.getByTestId('user-save').click();
    await expect(row).toContainText('Usuario UI Editado');

    // Eliminar
    await row.getByTestId('user-delete').click();
    await expect(row).toHaveCount(0);
  });

  test('correo duplicado muestra error', async ({ page }) => {
    await login(page);
    await page.getByTestId('tab-users').click();
    await page.getByTestId('user-name').fill('Duplicado');
    await page.getByTestId('user-email').fill(ADMIN.email);
    await page.getByTestId('user-password').fill('Password123');
    await page.getByTestId('user-save').click();
    await expect(page.getByTestId('user-error')).toContainText('ya está registrado');
  });
});

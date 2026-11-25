import { expect, test } from '@playwright/test';
import { ADMIN } from '../helpers';

test.describe('UI · Login', () => {
  test('muestra el formulario de login al abrir la app', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
  });

  test('credenciales incorrectas muestran un error', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('login-email').fill(ADMIN.email);
    await page.getByTestId('login-password').fill('mala-contraseña');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toContainText('Credenciales inválidas');
  });

  test('login correcto muestra el panel y cerrar sesión regresa al login', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('login-email').fill(ADMIN.email);
    await page.getByTestId('login-password').fill(ADMIN.password);
    await page.getByTestId('login-submit').click();

    await expect(page.getByText('Panel de administración')).toBeVisible();
    await expect(page.getByTestId('user-label')).toContainText('admin');

    await page.getByTestId('logout').click();
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });
});

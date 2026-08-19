import { expect, test } from '@playwright/test';

test('guest books an available slot and admin sees the booking', async ({ page }) => {
  const guestEmail = `guest-${Date.now()}@example.com`;

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Выберите формат' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Intro call' })).toBeVisible();

  await page.getByRole('button', { name: /\d{2}:\d{2} - \d{2}:\d{2}/ }).last().click();
  await page.getByLabel('Имя').fill('Анна Иванова');
  await page.getByLabel('Email').fill(guestEmail);
  await page.getByRole('button', { name: 'Забронировать' }).click();

  await expect(page.getByText(/Бронирование подтверждено:/)).toBeVisible();

  await page.getByText('Админ', { exact: true }).click();
  await page.getByRole('tab', { name: 'Ближайшие записи' }).click();

  await expect(page.getByText(guestEmail)).toBeVisible();
  await expect(page.getByText('Анна Иванова')).toBeVisible();
});

test('admin creates an event type that becomes available to guests', async ({ page }) => {
  const suffix = Date.now();
  const eventTypeId = `strategy-${suffix}`;
  const eventTypeName = `Стратегическая сессия ${suffix}`;

  await page.goto('/');
  await page.getByText('Админ', { exact: true }).click();

  await page.getByLabel('ID').fill(eventTypeId);
  await page.getByLabel('Название').fill(eventTypeName);
  await page.getByLabel('Описание').fill('Разбор целей, ограничений и ближайших шагов.');
  await page.getByRole('button', { name: 'Создать' }).click();

  await expect(page.getByText(`Тип встречи "${eventTypeName}" создан`)).toBeVisible();
  await expect(page.getByRole('heading', { name: eventTypeName })).toBeVisible();

  await page.getByText('Гость', { exact: true }).click();

  await expect(page.getByRole('heading', { name: eventTypeName })).toBeVisible();
});

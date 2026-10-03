import { test, expect } from '@playwright/test';
import axePlaywright from 'axe-playwright';

const { injectAxe, getAxeResults } = axePlaywright;
const API = 'http://127.0.0.1:8001';
const password = 'ReleaseGatePassword!123';

async function createUser(request, prefix) {
  const username = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  expect((await request.post(`${API}/register`, {
    headers: { 'x-test-client': username },
    data: { username, password },
  })).status()).toBe(201);
  const response = await request.post(`${API}/login`, {
    headers: { 'x-test-client': username },
    form: { username, password },
  });
  return { username, token: (await response.json()).access_token };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function createTrip(request, token) {
  const response = await request.post(`${API}/api/trips`, {
    headers: auth(token),
    data: { name: 'Offline Isolation Trip', start_date: '2030-01-01', end_date: '2030-01-03', total_budget: 100 },
  });
  const tripId = (await response.json()).trip_id;
  const version = (await (await request.get(`${API}/api/trips/${tripId}/itinerary`, { headers: auth(token) })).json()).version;
  await request.post(`${API}/api/trips/${tripId}/itinerary`, {
    headers: auth(token),
    data: {
      version,
      stops: [{
        city_name: 'Private Tokyo',
        arrival_date: '2030-01-01',
        departure_date: '2030-01-03',
        timezone: 'Asia/Tokyo',
        budget: 100,
        description: 'Private itinerary',
        activities: [
          { name: 'First Activity', cost: 10, category: 'Sightseeing' },
        ],
      }],
    },
  });
  await request.post(`${API}/api/notes`, { headers: auth(token), data: { trip_id: tripId, title: 'Private note', content: 'A-only note' } });
  await request.post(`${API}/api/trips/${tripId}/packing`, { headers: auth(token), data: { name: 'A-only packing', category: 'Security' } });
  await request.post(`${API}/api/expenses`, { headers: auth(token), data: { trip_id: tripId, title: 'A-only expense', category: 'Other', amount: '12.00', currency: 'USD', expense_date: '2030-01-01' } });
  return tripId;
}

test('offline snapshots are isolated and malformed snapshots fail safely', async ({ page, request }) => {
  const userA = await createUser(request, 'offline-a');
  const tripId = await createTrip(request, userA.token);
  await page.goto('/login');
  await page.evaluate((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('access_token', token);
    localStorage.setItem('auth_user_id', 'offline-a');
    localStorage.setItem('username', 'offline-a');
  }, userA.token);
  await page.goto(`/trip/${tripId}`);
  await expect(page.getByText('Offline Isolation Trip')).toBeVisible();
  await page.goto(`/trip/${tripId}/budget`);
  await expect(page.getByText('A-only expense')).toBeVisible();
  const userAKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes('traveloop:private:')));
  expect(userAKeys.length).toBeGreaterThan(0);

  const userB = await createUser(request, 'offline-b');
  await page.evaluate((token) => {
    localStorage.clear();
    localStorage.setItem('token', token);
    localStorage.setItem('access_token', token);
    localStorage.setItem('auth_user_id', 'user-b');
    localStorage.setItem('username', 'offline-b');
  }, userB.token);
  await page.context().setOffline(true);
  await page.evaluate((path) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, `/trip/${tripId}`);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByText('Offline Isolation Trip')).not.toBeVisible();
  await expect(page.getByText('Trip not found')).toBeVisible();
  await page.evaluate((path) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, `/trip/${tripId}/budget`);
  await expect(page.getByText('A-only expense')).not.toBeVisible();
  await expect(page.locator('body')).toBeVisible();
  await page.context().setOffline(false);

  await page.evaluate(() => {
    localStorage.setItem('traveloop:private:user-b:trip:999:itinerary', '{bad json');
  });
  await page.context().setOffline(true);
  await page.evaluate(() => { window.history.pushState({}, '', '/trip/999'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByText('Trip not found')).toBeVisible();
  await page.context().setOffline(false);
});

test('keyboard navigation, reorder, and authenticated axe pass', async ({ page, request }) => {
  const user = await createUser(request, 'keyboard');
  const tripId = await createTrip(request, user.token);
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator(':focus')).toBeVisible();

  await page.evaluate((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('access_token', token);
    localStorage.setItem('auth_user_id', 'keyboard-user');
    localStorage.setItem('username', 'keyboard');
  }, user.token);
  const routes = [`/dashboard`, `/trip/${tripId}`, `/trip/${tripId}/itinerary`, `/trip/${tripId}/budget`, `/packing-list`, `/community`, `/profile`];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    await page.locator('button, input, a, select, textarea').first().waitFor({ state: 'visible' });
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    await page.keyboard.press('Escape');
    await injectAxe(page);
    const results = await getAxeResults(page);
    expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact)), route).toEqual([]);
  }

  await page.goto(`/trip/${tripId}/itinerary`);
  await page.getByLabel('Activity name').fill('Second Activity');
  await page.getByLabel('Activity cost').fill('20');
  await page.keyboard.press('Enter');
  const down = page.getByRole('button', { name: 'Move First Activity down' });
  await down.focus();
  await page.keyboard.press('Space');
  const activityText = page.locator('text=First Activity').locator('..');
  await expect(activityText).toBeVisible();
  await page.getByRole('button', { name: 'Quick Save' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Itinerary saved successfully!')).toBeVisible();
  const persisted = await request.get(`${API}/api/trips/${tripId}/itinerary`, { headers: auth(user.token) });
  expect((await persisted.json()).stops[0].activities.map((item) => item.name)).toEqual(['Second Activity', 'First Activity']);
});

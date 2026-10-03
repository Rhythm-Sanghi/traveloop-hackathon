import { test, expect } from '@playwright/test';
import axePlaywright from 'axe-playwright';

const { injectAxe, getAxeResults } = axePlaywright;

const API = 'http://127.0.0.1:8001';
const password = 'ReleaseGatePassword!123';

async function register(request, username) {
  const response = await request.post(`${API}/register`, {
    headers: { 'x-test-client': username },
    data: { username, password },
  });
  expect(response.status()).toBe(201);
}

async function login(request, username, secret = password) {
  const response = await request.post(`${API}/login`, {
    headers: { 'x-test-client': username },
    form: { username, password: secret },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).access_token;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

test.describe('isolated authenticated release gate', () => {
  test('User A creates persistent trip data and User B cannot access private resources', async ({
    page,
    request,
  }) => {
    const suffix = Date.now();
    const userA = `release-a-${suffix}`;
    const userB = `release-b-${suffix}`;
    await register(request, userA);
    const tokenA = await login(request, userA);
    const profile = await request.post(`${API}/api/profile`, {
      headers: auth(tokenA),
      data: {
        first_name: 'Release',
        last_name: 'Owner',
        email: `${userA}@example.test`,
        phone: '0000000000',
        city: 'Tokyo',
        country: 'Japan',
      },
    });
    expect(profile.status()).toBe(200);

    const tripResponse = await request.post(`${API}/api/trips`, {
      headers: auth(tokenA),
      data: {
        name: 'Release Gate Tokyo',
        start_date: '2030-05-01',
        end_date: '2030-05-07',
        total_budget: 100000,
        currency: 'INR',
      },
    });
    expect(tripResponse.status()).toBe(201);
    const tripId = (await tripResponse.json()).trip_id;

    const stopResponse = await request.post(`${API}/api/trips/${tripId}/stops`, {
      headers: auth(tokenA),
      data: {
        city_name: 'Tokyo',
        arrival_date: '2030-05-01',
        departure_date: '2030-05-07',
      },
    });
    expect(stopResponse.status()).toBe(201);
    const currentItinerary = await request.get(`${API}/api/trips/${tripId}/itinerary`, {
      headers: auth(tokenA),
    });
    expect(currentItinerary.status()).toBe(200);
    const itineraryVersion = (await currentItinerary.json()).version;
    const itinerary = await request.post(`${API}/api/trips/${tripId}/itinerary`, {
      headers: auth(tokenA),
      data: {
        stops: [{
          city_name: 'Tokyo',
          arrival_date: '2030-05-01',
          departure_date: '2030-05-07',
          timezone: 'Asia/Tokyo',
          activities: [
            { name: 'Tokyo Tower', cost: 1500, category: 'Sightseeing', activity_date: '2030-05-01T10:00', timezone: 'Asia/Tokyo' },
            { name: 'Senso-ji', cost: 500, category: 'Culture', activity_date: '2030-05-01T14:00', timezone: 'Asia/Tokyo' },
          ],
        }],
        version: itineraryVersion,
      },
    });
    expect(itinerary.status()).toBe(200);

    const note = await request.post(`${API}/api/notes`, {
      headers: auth(tokenA),
      data: { trip_id: tripId, title: 'Private', content: 'PRIVATE-USER-A-ONLY-RELEASE-GATE' },
    });
    expect(note.status()).toBe(200);
    const expense = await request.post(`${API}/api/expenses`, {
      headers: auth(tokenA),
      data: { trip_id: tripId, title: 'Lunch', category: 'Food', amount: '1200.00', currency: 'INR', expense_date: '2030-05-01' },
    });
    expect(expense.status()).toBe(201);
    const packing = await request.post(`${API}/api/trips/${tripId}/packing`, {
      headers: auth(tokenA),
      data: { name: 'Passport copy', category: 'Documents' },
    });
    expect(packing.status()).toBe(200);

    const persisted = await request.get(`${API}/api/trips/${tripId}`, { headers: auth(tokenA) });
    expect(persisted.status()).toBe(200);
    const persistedBody = await persisted.json();
    expect(persistedBody.name).toBe('Release Gate Tokyo');
    expect(persistedBody.currency).toBe('INR');
    expect(persistedBody.stops[0].timezone).toBe('Asia/Tokyo');
    expect(persistedBody.stops[0].activities.map((item) => item.name)).toEqual(['Tokyo Tower', 'Senso-ji']);

    const publish = await request.post(`${API}/api/trips/${tripId}/publish`, { headers: auth(tokenA) });
    expect(publish.status()).toBe(200);
    const publicPage = await request.get(`${API}/api/public/trips/${tripId}`);
    expect(publicPage.status()).toBe(200);
    const publicText = JSON.stringify(await publicPage.json());
    expect(publicText).toContain('Tokyo Tower');
    expect(publicText).not.toContain('PRIVATE-USER-A-ONLY-RELEASE-GATE');
    expect(publicText).not.toContain('Lunch');
    expect(publicText).not.toContain('Passport copy');

    await register(request, userB);
    const tokenB = await login(request, userB);
    const pageOne = await request.get(`${API}/api/community/feed?page=1&page_size=1`);
    expect(pageOne.status()).toBe(200);
    expect((await pageOne.json()).length).toBeLessThanOrEqual(1);
    const beyondLast = await request.get(`${API}/api/community/feed?page=999&page_size=1`);
    expect(beyondLast.status()).toBe(200);
    expect(await beyondLast.json()).toEqual([]);

    const like = await request.post(`${API}/api/trips/${tripId}/like`, { headers: auth(tokenB) });
    expect(like.status()).toBe(200);
    const duplicateLike = await request.post(`${API}/api/trips/${tripId}/like`, { headers: auth(tokenB) });
    expect(duplicateLike.status()).toBe(200);
    const bookmark = await request.post(`${API}/api/trips/${tripId}/bookmark`, { headers: auth(tokenB) });
    expect(bookmark.status()).toBe(200);
    const bookmarks = await request.get(`${API}/api/community/bookmarks?page=1&page_size=1`, { headers: auth(tokenB) });
    expect(bookmarks.status()).toBe(200);
    expect((await bookmarks.json()).trip).toContain(tripId);
    const comment = await request.post(`${API}/api/community/comments`, {
      headers: auth(tokenB),
      data: { post_type: 'trip', target_id: tripId, content: 'User B release-gate comment' },
    });
    expect(comment.status()).toBe(200);
    const comments = await request.get(`${API}/api/community/comments?post_type=trip&target_id=${tripId}&page_size=1`, {
      headers: auth(tokenB),
    });
    expect(comments.status()).toBe(200);
    expect((await comments.json()).length).toBe(1);

    const privateTrip = await request.get(`${API}/api/trips/${tripId}`, { headers: auth(tokenB) });
    expect([403, 404]).toContain(privateTrip.status());
    const privateNotes = await request.get(`${API}/api/notes`, {
      headers: auth(tokenB),
      params: { trip_id: tripId },
    });
    expect([403, 404]).toContain(privateNotes.status());
    const privatePacking = await request.get(`${API}/api/trips/${tripId}/packing`, { headers: auth(tokenB) });
    expect([403, 404]).toContain(privatePacking.status());
    const idorPublish = await request.post(`${API}/api/trips/${tripId}/publish`, { headers: auth(tokenB) });
    expect([403, 404]).toContain(idorPublish.status());
    const spoofedAdmin = await request.get(`${API}/api/admin/overview`, { headers: auth(tokenB) });
    expect(spoofedAdmin.status()).toBe(403);
    const clone = await request.post(`${API}/api/trips/${tripId}/clone`, { headers: auth(tokenB) });
    expect(clone.status()).toBe(200);
    const cloneId = (await clone.json()).new_trip_id;
    const clonedTrip = await request.get(`${API}/api/trips/${cloneId}`, { headers: auth(tokenB) });
    expect(clonedTrip.status()).toBe(200);
    const cloneList = await request.get(`${API}/api/trips`, { headers: auth(tokenB) });
    expect((await cloneList.json()).find((trip) => trip.id === cloneId).is_public).toBe(0);

    await page.goto(`/trip/public/${tripId}`);
    await expect(page.getByText('Release Gate Tokyo')).toBeVisible();
    await expect(page.getByText('Tokyo Tower')).toBeVisible();
    await expect(page.getByText('Senso-ji')).toBeVisible();

    await page.addInitScript((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('access_token', token);
    }, tokenA);
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    await injectAxe(page);
    const accessibility = await getAxeResults(page);
    expect(accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact)))
      .toEqual([]);
  });
});

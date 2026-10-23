// Reproduces the OAuth PKCE callback in a real browser.
// Usage: BASE=https://tradr-sigma.vercel.app MODE=fake|mock node scripts/e2e-oauth-pkce.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const MODE = process.env.MODE || 'mock';
const SUPA = 'https://bcwxvyomuoolrolspgzn.supabase.co';

const fakeUser = {
  id: '11111111-1111-4111-8111-111111111111',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'e2e@tradr.test',
  app_metadata: { provider: 'github' },
  user_metadata: { user_name: 'e2e_user', full_name: 'E2E User' },
  created_at: new Date().toISOString(),
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const accessToken = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: fakeUser.id, exp, role: 'authenticated', aud: 'authenticated', email: fakeUser.email })}.sig`;

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const logs = [];
page.on('console', (m) => {
  const t = m.text();
  if (t.includes('[Auth') || t.toLowerCase().includes('pkce')) logs.push(t.split('\n')[0]);
});

let tokenCalls = 0;
await context.route('https://github.com/**', (r) => r.abort());
if (MODE === 'mock') {
  await context.route(`${SUPA}/auth/v1/token**`, async (r) => {
    tokenCalls++;
    const body = r.request().postDataJSON?.() ?? {};
    console.log(`[mock] token exchange #${tokenCalls}, verifier present: ${Boolean(body.code_verifier)}`);
    if (!body.code_verifier) return r.fulfill({ status: 400, json: { error: 'invalid_request' } });
    await r.fulfill({
      status: 200,
      json: { access_token: accessToken, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'rt', user: fakeUser },
    });
  });
  await context.route(`${SUPA}/auth/v1/user**`, (r) => r.fulfill({ status: 200, json: fakeUser }));
  await context.route(`${SUPA}/rest/v1/**`, (r) =>
    r.fulfill({
      status: 200,
      json: r.request().method() === 'GET'
        ? { id: fakeUser.id, username: 'e2e_user', display_name: 'E2E User', elo_rating: 1200, best_elo: 1200, total_games: 0, total_wins: 0, total_profit: 0 }
        : [],
    }),
  );
}

await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
await page.click('button:has-text("Continue with GitHub")');
await page.waitForTimeout(1500);

const storage = await page.evaluate(() => ({ cookies: document.cookie, ls: Object.keys(localStorage) }));
const verifierStored = /code-verifier/.test(storage.cookies) || storage.ls.some((k) => k.includes('code-verifier'));
console.log(`verifier stored before redirect: ${verifierStored}`);

await page.goto(`${BASE}/auth/callback?code=${MODE === 'mock' ? '22222222-2222-4222-8222-222222222222' : 'fake_code'}`);
await page.waitForTimeout(6000);

const finalUrl = page.url();
const session = await page.evaluate(() => /sb-[a-z0-9]+-auth-token=/.test(document.cookie));
const body = (await page.textContent('body')) || '';
console.log('--- auth logs ---');
logs.forEach((l) => console.log('  ' + l));
console.log(`final url: ${finalUrl}`);
console.log(`session cookie present: ${session}`);
console.log(`token exchange calls: ${tokenCalls}`);
console.log(`page shows PKCE error: ${body.includes('code verifier not found')}`);
if (MODE === 'mock') {
  console.log(`logged-in UI on /play: ${/e2e_user|E2E User|Profile|Logout|Abmelden/i.test(body)}`);
  await page.screenshot({ path: '/tmp/e2e-oauth-final.png', fullPage: true });
}
await browser.close();

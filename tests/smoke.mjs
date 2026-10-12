// Headless-Chrome smoke tests (puppeteer-core, system Chromium).
// Run: node tests/smoke.mjs   (from repo root)
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const page_url = 'file://' + path.join(dir, '..', 'index.html');

function findChrome() {
  try {
    return execSync('which chromium chromium-browser google-chrome google-chrome-stable 2>/dev/null | head -1')
      .toString().trim();
  } catch { return null; }
}

let pass = 0, fail = 0;
const results = [];
async function t(page, name, fn) {
  try { await fn(); pass++; results.push('ok - ' + name); }
  catch (e) { fail++; results.push('FAIL - ' + name + ' :: ' + (e.message || e).toString().slice(0, 200)); }
}
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (v, msg) => { if (!v) throw new Error(msg || 'assertion failed'); };

const exe = findChrome();
if (!exe) { console.log('FAIL - no chromium binary found'); process.exit(1); }
const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(page_url, { waitUntil: 'networkidle0' });

await t(page, 'title', async () => {
  eq(await page.title(), 'Currency Converter BD — offline BDT converter');
});

await t(page, 'default conversion 100 USD -> BDT', async () => {
  const res = await page.$eval('#result', el => el.textContent);
  eq(res, '100 USD = 12,150.00 BDT');
});

await t(page, 'change amount to 50', async () => {
  await page.$eval('#amount', el => { el.value = '50'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  eq(await page.$eval('#result', el => el.textContent), '50 USD = 6,075.00 BDT');
});

await t(page, 'swap button swaps selects and result', async () => {
  await page.click('#swapBtn');
  const from = await page.$eval('#fromCur', el => el.value);
  const to = await page.$eval('#toCur', el => el.value);
  eq(from, 'BDT'); eq(to, 'USD');
  eq(await page.$eval('#result', el => el.textContent), '50 BDT = 0.41 USD');
  await page.click('#swapBtn'); // restore
});

await t(page, 'BDT -> USD exact: 12150 BDT = 100 USD', async () => {
  await page.$eval('#amount', el => { el.value = '12150'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.select('#fromCur', 'BDT');
  await page.select('#toCur', 'USD');
  eq(await page.$eval('#result', el => el.textContent), '12,150 BDT = 100.00 USD');
  await page.select('#fromCur', 'USD');
  await page.select('#toCur', 'BDT');
  await page.$eval('#amount', el => { el.value = '100'; el.dispatchEvent(new Event('input', { bubbles: true })); });
});

await t(page, 'invalid amount shows inline error', async () => {
  await page.$eval('#amount', el => { el.value = 'abc'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  const hidden = await page.$eval('#amountError', el => el.hidden);
  eq(hidden, false);
  const txt = await page.$eval('#amountError', el => el.textContent);
  ok(txt.length > 0, 'error text present');
  await page.$eval('#amount', el => { el.value = '100'; el.dispatchEvent(new Event('input', { bubbles: true })); });
});

await t(page, 'edit USD rate to 125 -> result + stamp update', async () => {
  await page.$eval('input.rate-input[data-code="USD"]', el => { el.value = '125'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  eq(await page.$eval('#result', el => el.textContent), '100 USD = 12,500.00 BDT');
  const stamp = await page.$eval('#updatedStamp', el => el.textContent);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(stamp), 'stamp is date, got ' + stamp);
});

await t(page, 'invalid rate rejected, old rate kept', async () => {
  await page.$eval('input.rate-input[data-code="USD"]', el => { el.value = '0'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  const hidden = await page.$eval('#rateError', el => el.hidden);
  eq(hidden, false);
  eq(await page.$eval('#result', el => el.textContent), '100 USD = 12,500.00 BDT');
  // restore via reset
  await page.click('#resetBtn');
  eq(await page.$eval('#result', el => el.textContent), '100 USD = 12,150.00 BDT');
});

await t(page, 'Bangla toggle: title + Bengali digits in result', async () => {
  await page.click('#langBtn');
  eq(await page.$eval('#t-title', el => el.textContent), 'কারেন্সি কনভার্টার বিডি');
  const res = await page.$eval('#result', el => el.textContent);
  eq(res, '১০০ USD = ১২,১৫০.০০ BDT');
  const th = await page.$eval('#th-rate', el => el.textContent);
  ok(th.length > 0, 'rate header present');
  await page.click('#langBtn'); // back to English
});

await t(page, 'rate persists across reload', async () => {
  await page.$eval('input.rate-input[data-code="EUR"]', el => { el.value = '135'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.reload({ waitUntil: 'networkidle0' });
  const v = await page.$eval('input.rate-input[data-code="EUR"]', el => el.value);
  eq(v, '135');
  await page.click('#resetBtn');
});

await t(page, 'export button produces JSON download', async () => {
  const dl = path.join(dir, 'dl-test');
  await page._client().send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  await page.click('#exportBtn');
  await new Promise(r => setTimeout(r, 800));
  const fs = await import('fs');
  const files = fs.readdirSync(dl).filter(f => f.endsWith('.json'));
  ok(files.length > 0, 'json downloaded');
  const data = JSON.parse(fs.readFileSync(path.join(dl, files[0]), 'utf8'));
  ok(data.rates && data.rates.USD === 121.5, 'exported rates valid');
  fs.rmSync(dl, { recursive: true, force: true });
});

await t(page, 'rate board has 10 editable rows', async () => {
  const n = await page.$$eval('input.rate-input', els => els.length);
  eq(n, 10);
});

await t(page, 'mobile 390px: no horizontal overflow', async () => {
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle0' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 1, 'overflow=' + overflow);
});

await t(page, 'zero console/page errors', async () => {
  ok(errors.length === 0, 'errors: ' + errors.join(' | ').slice(0, 400));
});

for (const r of results) console.log(r);
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);

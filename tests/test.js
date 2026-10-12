// Node unit tests for currency-converter-bd logic. Run: node tests/test.js
const assert = require('assert');
const {
  defaultRates, loadRates, saveRates, getRate, convert,
  validAmount, validRate, toBnDigits, formatMoney, STR, CURRENCIES
} = require('../js/app.js');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('ok -', name); }
  catch (e) { fail++; console.log('FAIL -', name, '::', e.message); }
}

const R = { BDT: 1, USD: 120, EUR: 130, INR: 1.45 };

// hand-verified conversion math
t('100 USD -> BDT = 12000.00', () => assert.strictEqual(convert(100, 'USD', 'BDT', R), 12000));
t('1 USD -> EUR = 0.92 (rounded)', () => assert.strictEqual(convert(1, 'USD', 'EUR', R), 0.92));
t('12000 BDT -> USD = 100', () => assert.strictEqual(convert(12000, 'BDT', 'USD', R), 100));
t('same currency identity', () => assert.strictEqual(convert(555.55, 'EUR', 'EUR', R), 555.55));
t('100 USD -> INR: 12000/1.45 = 8275.86', () => assert.strictEqual(convert(100, 'USD', 'INR', R), 8275.86));
t('zero amount -> 0', () => assert.strictEqual(convert(0, 'USD', 'BDT', R), 0));
t('negative amount -> NaN', () => assert.ok(Number.isNaN(convert(-5, 'USD', 'BDT', R))));
t('non-numeric amount -> NaN', () => assert.ok(Number.isNaN(convert('abc', 'USD', 'BDT', R))));
t('missing rate -> NaN', () => assert.ok(Number.isNaN(convert(10, 'USD', 'XXX', {}))));

// validation
t('validAmount accepts "1,000.50"', () => assert.strictEqual(validAmount('1,000.50'), true));
t('validAmount accepts "0"', () => assert.strictEqual(validAmount('0'), true));
t('validAmount rejects ""', () => assert.strictEqual(validAmount(''), false));
t('validAmount rejects "-3"', () => assert.strictEqual(validAmount('-3'), false));
t('validAmount rejects "abc"', () => assert.strictEqual(validAmount('abc'), false));
t('validRate accepts "121.5"', () => assert.strictEqual(validRate('121.5'), true));
t('validRate rejects "0"', () => assert.strictEqual(validRate('0'), false));
t('validRate rejects "-1"', () => assert.strictEqual(validRate('-1'), false));
t('validRate rejects ""', () => assert.strictEqual(validRate(''), false));

// formatting
t('formatMoney 12150 en', () => assert.strictEqual(formatMoney(12150, 'en'), '12,150.00'));
t('formatMoney 12150 bn', () => assert.strictEqual(formatMoney(12150, 'bn'), '১২,১৫০.০০'));
t('toBnDigits', () => assert.strictEqual(toBnDigits('2026-10-12'), '২০২৬-১০-১২'));

// storage round-trip
function memStore() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k)
  };
}
t('loadRates falls back to defaults on empty store', () => {
  const s = memStore();
  const { rates, updated } = loadRates(s);
  assert.strictEqual(rates.USD, 121.50);
  assert.strictEqual(rates.BDT, 1);
  assert.strictEqual(updated, null);
});
t('saveRates + loadRates round-trip', () => {
  const s = memStore();
  const d = defaultRates(); d.USD = 125;
  saveRates(s, d);
  const { rates, updated } = loadRates(s);
  assert.strictEqual(rates.USD, 125);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(updated), 'updated stamp is YYYY-MM-DD');
});
t('loadRates ignores corrupt JSON', () => {
  const s = memStore();
  s.setItem('ccbd_rates_v1', 'not json{');
  assert.strictEqual(loadRates(s).rates.USD, 121.50);
});
t('loadRates ignores non-positive saved rate', () => {
  const s = memStore();
  s.setItem('ccbd_rates_v1', JSON.stringify({ USD: -5, EUR: 0 }));
  const { rates } = loadRates(s);
  assert.strictEqual(rates.USD, 121.50);
  assert.strictEqual(rates.EUR, 131.00);
});

// structure
t('10 foreign currencies + BDT', () => assert.strictEqual(CURRENCIES.length, 11));
t('every currency has en + bn names', () => {
  for (const c of CURRENCIES) {
    assert.ok(c.code && c.name && c.bn, c.code);
  }
});
t('STR has en and bn with all keys', () => {
  const enKeys = Object.keys(STR.en), bnKeys = Object.keys(STR.bn);
  assert.deepStrictEqual(enKeys.sort(), bnKeys.sort());
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

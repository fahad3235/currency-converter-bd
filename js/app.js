/* currency-converter-bd — offline BDT currency converter.
 * Rates are stored as BDT per 1 unit of foreign currency (BDT itself = 1).
 * All rates are user-editable; shipped defaults are SAMPLE values only. */
'use strict';

const CURRENCIES = [
  { code: 'BDT', name: 'Bangladeshi Taka', bn: 'বাংলাদেশি টাকা' },
  { code: 'USD', name: 'US Dollar', bn: 'মার্কিন ডলার', rate: 121.50 },
  { code: 'EUR', name: 'Euro', bn: 'ইউরো', rate: 131.00 },
  { code: 'GBP', name: 'British Pound', bn: 'ব্রিটিশ পাউন্ড', rate: 153.50 },
  { code: 'SAR', name: 'Saudi Riyal', bn: 'সৌদি রিয়াল', rate: 32.40 },
  { code: 'AED', name: 'UAE Dirham', bn: 'আমিরাতি দিরহাম', rate: 33.08 },
  { code: 'KWD', name: 'Kuwaiti Dinar', bn: 'কুয়েতি দিনার', rate: 395.00 },
  { code: 'QAR', name: 'Qatari Riyal', bn: 'কাতারি রিয়াল', rate: 33.37 },
  { code: 'MYR', name: 'Malaysian Ringgit', bn: 'মালয়েশিয়ান রিঙ্গিত', rate: 25.70 },
  { code: 'SGD', name: 'Singapore Dollar', bn: 'সিঙ্গাপুর ডলার', rate: 90.20 },
  { code: 'INR', name: 'Indian Rupee', bn: 'ভারতীয় রুপি', rate: 1.46 }
];

const STORAGE_KEYS = { rates: 'ccbd_rates_v1', updated: 'ccbd_updated_v1', lang: 'ccbd_lang_v1' };

function defaultRates() {
  const r = { BDT: 1 };
  for (const c of CURRENCIES) if (c.code !== 'BDT') r[c.code] = c.rate;
  return r;
}

function loadRates(storage) {
  const def = defaultRates();
  try {
    const raw = storage.getItem(STORAGE_KEYS.rates);
    if (!raw) return { rates: def, updated: null };
    const saved = JSON.parse(raw);
    const rates = Object.assign({}, def);
    for (const c of CURRENCIES) {
      if (c.code === 'BDT') continue;
      const v = Number(saved[c.code]);
      if (Number.isFinite(v) && v > 0) rates[c.code] = v;
    }
    return { rates, updated: storage.getItem(STORAGE_KEYS.updated) || null };
  } catch (e) {
    return { rates: def, updated: null };
  }
}

function saveRates(storage, rates) {
  storage.setItem(STORAGE_KEYS.rates, JSON.stringify(rates));
  storage.setItem(STORAGE_KEYS.updated, new Date().toISOString().slice(0, 10));
}

function getRate(rates, code) {
  if (code === 'BDT') return 1;
  return rates[code];
}

/* Convert `amount` of `from` into `to`. Returns NaN on bad input. */
function convert(amount, from, to, rates) {
  const a = Number(amount);
  if (!Number.isFinite(a) || a < 0) return NaN;
  const rf = getRate(rates, from);
  const rt = getRate(rates, to);
  if (!Number.isFinite(rf) || !Number.isFinite(rt) || rf <= 0 || rt <= 0) return NaN;
  const bdt = a * rf;
  return Math.round((bdt / rt) * 100) / 100;
}

function validAmount(s) {
  if (typeof s !== 'string') s = String(s);
  s = s.trim().replace(/,/g, '');
  if (s === '') return false;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0;
}

function validRate(s) {
  if (typeof s !== 'string') s = String(s);
  s = s.trim();
  if (s === '') return false;
  const n = Number(s);
  return Number.isFinite(n) && n > 0;
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
function toBnDigits(s) {
  return String(s).replace(/[0-9]/g, d => BN_DIGITS[Number(d)]);
}

function formatMoney(n, lang) {
  const parts = Number(n).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const out = parts.join('.');
  return lang === 'bn' ? toBnDigits(out) : out;
}

const STR = {
  en: {
    title: 'Currency Converter BD',
    subtitle: 'Offline BDT currency converter — rates you control',
    converter: 'Converter',
    amount: 'Amount',
    from: 'From',
    to: 'To',
    swap: 'Swap currencies',
    rateBoard: 'Exchange rate board',
    rateBoardSub: 'BDT per 1 unit — tap a value to edit',
    perUnit: 'per 1',
    updated: 'Last updated',
    never: 'never',
    reset: 'Reset to defaults',
    export: 'Export rates',
    import: 'Import rates',
    invalidAmount: 'Enter a valid non-negative amount.',
    invalidRate: 'Rate must be a positive number.',
    rateLine: (a, fa, t, fb) => `1 ${fa} = ${a} BDT · 1 ${fb} = ${t} BDT`,
    resultLine: (amt, fc, res, tc) => `${amt} ${fc} = ${res} ${tc}`,
    disclaimer: 'Default rates are SAMPLE values for demonstration only — they are not live market rates. Update them with your bank\'s rates before relying on conversions.',
    importBad: 'Import failed: file does not contain valid rates.',
    importOk: 'Rates imported.',
    langBtn: 'বাংলা'
  },
  bn: {
    title: 'কারেন্সি কনভার্টার বিডি',
    subtitle: 'অফলাইন টাকা কারেন্সি কনভার্টার — রেট আপনার নিয়ন্ত্রণে',
    converter: 'কনভার্টার',
    amount: 'পরিমাণ',
    from: 'থেকে',
    to: 'এ',
    swap: 'মুদ্রা বদলান',
    rateBoard: 'বিনিময় হার তালিকা',
    rateBoardSub: 'প্রতি ১ এককে টাকা — সম্পাদনা করতে মানটিতে চাপ দিন',
    perUnit: 'প্রতি ১',
    updated: 'সর্বশেষ হালনাগাদ',
    never: 'কখনোই না',
    reset: 'ডিফল্টে ফেরত যান',
    export: 'রেট এক্সপোর্ট',
    import: 'রেট ইমপোর্ট',
    invalidAmount: 'সঠিক ধনাত্মক পরিমাণ লিখুন।',
    invalidRate: 'রেট অবশ্যই ধনাত্মক সংখ্যা হতে হবে।',
    rateLine: (a, fa, t, fb) => `১ ${fa} = ${a} টাকা · ১ ${fb} = ${t} টাকা`,
    resultLine: (amt, fc, res, tc) => `${amt} ${fc} = ${res} ${tc}`,
    disclaimer: 'ডিফল্ট রেটগুলো শুধুমাত্র প্রদর্শনের নমুনা মান — এগুলো লাইভ বাজারদর নয়। ব্যবহারের আগে আপনার ব্যাংকের রেট দিয়ে হালনাগাদ করুন।',
    importBad: 'ইমপোর্ট ব্যর্থ: ফাইলে সঠিক রেট নেই।',
    importOk: 'রেট ইমপোর্ট হয়েছে।',
    langBtn: 'English'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CURRENCIES, STORAGE_KEYS, defaultRates, loadRates, saveRates,
    getRate, convert, validAmount, validRate, toBnDigits, formatMoney, STR
  };
}

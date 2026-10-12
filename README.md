# Currency Converter BD

A free, fully offline bilingual (English / বাংলা) BDT currency converter with an editable exchange-rate board. No network requests, no tracking — everything runs in the browser and rates are stored only in your device's localStorage.

## Problem

Bangladeshi travelers, remittance receivers, freelancers, and Hajj/Umrah pilgrims constantly need quick foreign-currency ↔ BDT conversions, but most converter apps phone home with your data or hard-code stale rates. This app keeps conversion fully offline and puts the rate table in the user's hands.

## Features

- **Quick converter** — amount + from/to currency with one-tap swap (⇄), live recalculation
- **Editable rate board** — 10 remittance-relevant currencies (USD, EUR, GBP, SAR, AED, KWD, QAR, MYR, SGD, INR); rates stored as BDT per 1 unit, saved to localStorage with a last-updated stamp
- **Validation** — inline errors for bad amounts and non-positive rates; bad edits are rejected and the old rate is kept
- **Export / import rates** — download rates as JSON, restore or share them later (malformed files rejected with data intact)
- **Bilingual UI** — EN / বাংলা toggle with Bengali digits, persisted across sessions
- **Responsive** — mobile-friendly at 390px, no horizontal overflow

## Stack

Vanilla HTML + CSS + JavaScript. No frameworks, no build step, no dependencies, zero runtime network requests.

## Prerequisites

Any modern browser. For tests: Node.js 18+ and a Chromium binary (system Chromium or Chrome).

## Install

No install needed — open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Dev commands

```bash
node tests/test.js    # 28 node unit tests (conversion math, validation, storage, i18n)
node tests/smoke.mjs  # 14 headless-Chrome smoke tests (UI, persistence, export, mobile)
```

The smoke test needs `puppeteer-core` and a Chromium binary; edit the `executablePath` in `tests/smoke.mjs` to match your system.

## Env

None. No API keys, no backend, no environment variables.

## Testing

- `node tests/test.js` → 28/28 pass (hand-verified conversion math, e.g. 100 USD→INR = 8,275.86 at the test rates; storage round-trips; corrupt-import rejection)
- `node tests/smoke.mjs` → 14/14 pass, 0 console/page errors (conversion UI, swap, rate editing, Bangla toggle with Bengali digits, reload persistence, JSON export, 390px mobile)

## Deployment

Static site — deploy anywhere (GitHub Pages, Netlify, any static host). GitHub Pages: enable Pages on the `main` branch, root folder.

## Limitations

- **Shipped rates are SAMPLE values for demonstration only**, not live market rates. The UI and footer say this explicitly. Update them with your bank's rates before relying on conversions.
- Conversions are simple spot-rate math; real bank transactions include spreads, fees, and cash/TT rate differences not modeled here.
- Educational/personal tool — not financial advice.

## Status

v1.0 — MVP complete. All tests green.

# Scouthru OS — working model

B2B platform for FMCG brand owners, manufacturers, suppliers and distributors: a marketplace to find Indian makers by capability and free capacity, plus one dashboard per role to run every order from idea to delivery.

Live demo: https://scouthru-os.vercel.app

## Run it locally

Needs Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3200
```

Production build:

```bash
npm run build
npm start
```

On Windows, if PowerShell blocks `npm`, run `node node_modules/next/dist/bin/next dev -p 3200` after installing.

## What's inside

| Path | What it is |
|---|---|
| `app/page.tsx` | Website home |
| `app/marketplace`, `app/manufacturers`, `app/products/[id]` | Marketplace: categories with subcategories, ready products, manufacturer search |
| `app/brand/*` | Brand owner dashboard: orders, new order, QC, shipments, deliveries, payments, suppliers, documents |
| `app/factory/*` | Manufacturer dashboard: enquiries, orders, capacity, partner units, payments, settings |
| `app/supplier/*` | Supplier dashboard: leads, requests, purchase orders, dispatch, stock, payments, buyers |
| `app/distributor/*` | Distributor dashboard: channels, retailer orders, inbound/GRN, stock, routes, collections, schemes |
| `components/` | Shared UI: dashboard shell, stage tracker, order overview, AI assist, marketplace header |
| `lib/seed.ts` | Demo data (products, factories, orders, POs, retailers) |
| `lib/ops.ts` | Order logic shared by every role: payments, approvals, quotes, deliveries, stage trackers |
| `lib/parse.ts` | Reads half-written requirements into a complete brief |
| `lib/store.tsx` | App state, saved in the browser |

## How the demo works

- No backend or login: every role's data lives in the browser (localStorage) and starts from `lib/seed.ts`. Use **Reset demo data** in the account menu to start over.
- The four dashboards share one state, so an action in one (e.g. a factory price change) shows up in the others (the brand's approval queue).
- Proof uploads are fingerprinted with SHA-256 in a hash chain (`lib/sha256.ts`).
- AI assist is a built-in rule-based parser (`lib/parse.ts`); a language model can replace it later.
- Product photos are from Unsplash (free licence).

## Stack

Next.js 15 (App Router), React 19, Tailwind CSS 4, TypeScript, lucide-react icons.

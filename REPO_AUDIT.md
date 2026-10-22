# REPO AUDIT — /home/daytona/swords (KINGS)

Consolidated audit of API routes, pages/components, database, navigation, and forms.
Stack: Next.js 16 App Router, MongoDB via mongoose ^9.0.1 (untyped raw collections in `app/lib/mongoDB.ts`), jose JWT + bcryptjs cookie auth, Cloudinary, nodemailer.

**Critical cross-cutting findings:**
- `MONGODB_URI` is NOT set anywhere (`.env` only has an unused PostgreSQL `DATABASE_URL`). `app/lib/mongoDB.ts` throws and `process.exit(1)` when missing → every DB-touching API route fails at runtime. **P0 blocker.**
- `REDIRECT_URL` missing from `.env` → signup & forget-password email links render `undefined/set-password?...`. **P0.**
- No route enforces auth except `/api/auth/me`. All write endpoints (products create/update/delete, invoices, shipments, wallet) are publicly callable; admin pages are protected only on the frontend. **P0.**
- No migration system, no Mongoose schemas, no indexes, no seed files.

---

## 1. API Routes Table

| Route Path | Methods | Auth Required | Expected Request | Expected Response | Bugs Found | Priority |
|---|---|---|---|---|---|---|
| /api/auth/signin | POST | No (login) | JSON `{email, password}` | 200 `{message, data:{id,username,email,roles,dateJoined,lastLogin,isActive}}` + cookies access_token/refresh_token/ROLES/logged_in | In-memory failedAttempts map (resets on restart, memory leak); duplicate dead re-query (lines 45–47); `body.email.trim()` throws 500 if email missing instead of 400; lockout message leaks account existence | P1 |
| /api/auth/signup | POST | No | JSON `{username, email}` | 201 `{message}` | Email-existence check before email validation; `body.username.trim()` throws 500 if missing; setup link uses missing `REDIRECT_URL` → broken `undefined/set-password?...`; orphan inactive user if email send fails | P0 |
| /api/auth/me | GET | Yes (JWT cookie) | cookie `access_token` | 200 `{user:{id,username,email,roles}}` | None — cleanest route | — |
| /api/auth/logout | POST | No | cookie `access_token`; optional header `x-user-id` | 200 `{message, status, success}`; clears cookies | `x-user-id` client-supplied header cast `as string`, never verified against token; null passed if header missing | P2 |
| /api/auth/forget-password | POST | No | JSON `{email}` | 200 `{message}` | User enumeration ("This email does not exist" contradicts comment); reset link uses missing `REDIRECT_URL` → broken; debug console.log of user email; `body.email.trim()` throws 500 if missing | P0 |
| /api/auth/set-password | POST | Via one-time setup token | JSON `{password, confirmPassword, token}` | 200 `{message}` + cookies | References non-existent `user.firstName` in password validation (always undefined); ROLES cookie not JSON.stringify'd (inconsistent with signin); no `logged_in` cookie set (inconsistent) | P1 |
| /api/products | GET | No | query: page, limit, summary, dashboard, search, category, productType, brand | `{data, pagination, summary?}` or dashboard summary | **Category filter broken** — compares exact string but schema stores category as array → never matches; search regex not escaped (regex injection/throw on `(`); no sorting support | P0 |
| /api/products/create | POST | No | multipart FormData (name, description, price, category[], productType, brand, model, quantity, images, type-specific fields) | 201 `{message, data}` | No auth on write; `quantity` parseInt without NaN validation; `price` parseFloat without validation (negative/NaN possible); inventory log failure only logged | P0 |
| /api/products/[id] | GET, PUT, DELETE | No | path `id` (ObjectId); PUT: FormData | GET `{success, data}`; PUT/DELETE `{success, message}` | **PUT overwrites ALL fields from FormData — unspecified fields become null/"false" → partial updates destroy data**; no NaN validation on quantity/price; old images never deleted from Cloudinary; no auth on write/delete | P0 |
| /api/invoices | GET, POST, PATCH | No | GET query: search/customer, page, limit; POST/PATCH JSON (customer, amount, status, date, items[], paymentMethod, discount, deposit, depositCurrency) | GET `{message, data, pagination}`; POST 201; PATCH 200 | `invoiceId` = INV- + random 4 digits, collisions likely, no uniqueness check; POST: `newQty` dead variable, no stock-sufficiency check (negative stock); POST: `logInventoryChange` imported but never called (sales not logged); PATCH: invalid ObjectId → 500 not 400; PATCH wallet deposit double-count edge case; PATCH response omits unchanged fields; no auth; no transactions (stock/wallet desync) | P0 |
| /api/shipments | GET, POST | No | GET: none; POST JSON `{destination, cost, description, date}` | GET `{message, data}`; POST 201 `{message, data:{shipment, balanceEGP}}` | GET returns ALL shipments, no pagination; POST debits wallet BEFORE insert (no rollback if insert fails); wallet can go negative (no balance check); hardcoded destination whitelist; no auth | P1 |
| /api/wallet | GET, POST | No | GET: none; POST JSON `{amount, note?, currency, type}` | GET `{data:{balanceEGP,balanceUSD,balanceEUR}}`; POST 201 | NaN amount passes validation (`"abc" <= 0` is false); withdraw has no sufficient-funds check → negative balances; balanceEGP baseline seeded from cash invoice deposits only (arbitrary); no auth | P1 |
| /api/wallet/transactions | GET | No | query: page, limit | `{message, success, data, pagination}` | No currency/type filtering (UI filters ignored); pagination key names (`totalItems/currentPage`) inconsistent with other routes | P2 |
| /api/dashboard/summary | GET | No | none | `{success, data:{summary, recentInvoices, lowStockItems, analytics}}` | Loads ALL invoices + products into memory (no aggregation); `item.price * item.quantity` NaN propagates if price undefined; date string vs Date type mixing in `$gte`; ~90% duplicated from analytics route | P1 |
| /api/analytics | GET | No | none (query ignored) | `{success, data:{summary, trends, categories, topProducts}}` | Same as dashboard/summary (full scans, NaN risk, duplicated logic); `request` param unused | P1 |
| /api/inventory/logs | GET | No | query: page, limit, productId | `{success, data, pagination}` | None functional; pagination key naming inconsistent with other routes | P2 |

---

## 2. Pages & Components Table

| File Path | Data Fetched From | Forms Present | Submit Handler Wired | Loading State | Empty State | Error State | Dead Links | Bugs Found | Priority |
|---|---|---|---|---|---|---|---|---|---|
| app/(admin)/layout.tsx | /api/auth/me, /api/dashboard/summary | No | N/A | Yes (spinner) | N/A | No (no error state for failed user fetch) | No | None obvious; mobile responsive | P2 |
| app/(admin)/dashboard/page.tsx | useDashboard() context | No | N/A | Yes | Yes (low stock "All healthy") | Yes (banner) | No | Hardcoded mock trend percentages (12.5/8.3/5.2/15.7); unused `updateInvoiceStatus` import; top products keyed by index | P1 |
| app/(admin)/products/page.tsx | /api/products | ProductForm modal | Yes (create/edit/delete) | Via ProductsList | Via ProductsList | Yes (banner) | No | None obvious | — |
| app/(admin)/invoices/page.tsx | /api/invoices | InvoiceForm modal | Yes (create/edit/mark-paid) | Yes | Yes | Yes | No | None obvious | — |
| app/(admin)/wallet/page.tsx | /api/wallet, /api/wallet/transactions | Deposit/Withdraw/Shipment modals | Yes | Yes | Yes | No explicit | No | Transaction list keyed by array index | P2 |
| app/(admin)/history/page.tsx | /api/inventory/logs | No | N/A | Yes | Yes | No explicit | No | None obvious | — |
| app/components/sidebar.tsx | POST /api/auth/logout | No | Yes (logout) | N/A | N/A | alert() only | No | Logout errors via alert() — inconsistent feedback pattern | P2 |
| app/components/productform.tsx | createProduct / updateProduct (multipart) | Yes | Yes | Yes (disables inputs) | N/A | Yes | No | None obvious | — |
| app/components/invoice-form.tsx | /api/products (picker), createInvoice/updateInvoice | Yes | Yes | Yes | N/A | Yes | No | None obvious | — |
| app/components/shipment-form.tsx | createShipment | Yes | Yes | Yes | N/A | Yes | No | None obvious | — |
| app/components/wallet-deposit-form.tsx | walletTransaction | Yes | Yes | Yes | N/A | Yes | No | None obvious | — |
| app/components/products-list.tsx | (props) | No | N/A | Yes | Yes | Yes | No | None obvious | — |
| app/components/products.tsx | (props) | No | N/A | N/A | Yes (no-image placeholder) | N/A | No | None obvious | — |
| app/page.tsx (Landing) | None (client cookie check) | No | N/A | N/A | N/A | N/A | No | Auth check reads `logged_in` cookie which may not match backend cookie set; literal `**PBT**` markdown rendered as text in hero | P1 |
| app/sign-in/page.tsx | /api/auth/signup, /api/auth/signin | Yes (login + signup) | Yes | Yes (overlay) | N/A | Yes (banner + field errors) | No | Signup success redirects to /sign-in (same page) with no success feedback; no password step or activation instructions; fragile double-handling (submit button with onClick inside preventDefault form) | P1 |
| app/forget-password/page.tsx | /api/auth/forget-password | Yes | Yes | Yes | N/A | Yes | No | None obvious | — |
| app/set-password/page.tsx | /api/auth/set-password | Yes | Yes | Yes | N/A | Yes | No | Missing token only errors after submit (no upfront invalid-link state); post-success push to /dashboard may bounce if session cookie not yet set | P2 |

---

## 3. Database Tables (Collections) Table

| Table Name | Referenced In | Exists in Schema | Migration Applied | Seed Data Present | Seed Data Valid | Priority |
|---|---|---|---|---|---|---|
| users | auth routes, mongoDB.ts | No (untyped raw collection, no Mongoose schema) | No migration system at all | No | N/A | P0 |
| blacklist_tokens | auth routes | No | No | No | N/A | P1 |
| products | products routes, dashboard, analytics, migrate-images.js | No | No | No (only one-off image migration script) | migrate-images.js field usage matches implied shape ✅ | P0 |
| invoices | invoices routes, dashboard, analytics, wallet | No | No | No | N/A | P0 |
| wallet | wallet route, shipments, invoices | No | No | Implicit (balanceEGP from cash invoice deposits — arbitrary baseline) | No (ignores shipments/withdrawals) | P1 |
| wallet_transactions | wallet routes | No | No | No | N/A | P1 |
| shipments | shipments route, wallet | No | No | No | N/A | P1 |
| inventory_logs | inventory/logs route, products/invoices routes | No | No | No | N/A | P1 |

**DB-level defects:** no unique index on `invoices.invoiceId` (collisions); no indexes at all (email, productId, timestamp); no schema validation (NaN quantities/prices, negative balances persistable); `invoices.date` stored as string mixed with Date comparisons; `MONGODB_DB_NAME` unset (mongoDB.ts passes undefined); docker-compose.yml has no database service; PostgreSQL `DATABASE_URL` provisioned but completely unused.

---

## 4. Navigation Links Table

| Link Text | href | Target Route Exists | Priority |
|---|---|---|---|
| PROCEED TO DASHBOARD / JOIN To Kings (landing CTA) | /dashboard or /sign-in (Link) | Yes | — |
| Sidebar: Dashboard | router.push("/dashboard") | Yes | — |
| Sidebar: Products | router.push("/products") | Yes | — |
| Sidebar: Invoices | router.push("/invoices") | Yes | — |
| Sidebar: Wallet | router.push("/wallet") | Yes | — |
| Sidebar: History | router.push("/history") | Yes | — |
| Sidebar: Logout | router.push("/") | Yes | — |
| Sign-in: "Forget Password?" | router.push("/forget-password") | Yes | — |
| Forget-password: "Back to Sign In" / "Return to Sign In" | router.push("/sign-in") | Yes | — |
| Dashboard: "View All Invoices" | router.push("/invoices") | Yes | — |
| Set-password: commented-out "Back to Login" | `<a href="/login">` (commented out) | No — /login does not exist (correctly disabled) | P2 |

No dead `href="#"` or `href=""` links found; sidebar uses router.push throughout.

---

## 5. Forms Table

| Form Component | Target Endpoint | Field Names Match Backend | Success Feedback | Error Feedback | Priority |
|---|---|---|---|---|---|
| app/sign-in/page.tsx (Login) | POST /api/auth/signin | Yes (email, password) | router.push("/dashboard") | Banner + field errors | — |
| app/sign-in/page.tsx (Signup) | POST /api/auth/signup | Yes (username, email) | **No — redirects to /sign-in (same page), no feedback** | Banner + field errors | P1 |
| app/forget-password/page.tsx | POST /api/auth/forget-password | Yes (email) | Yes (success view) | Yes | — |
| app/set-password/page.tsx | POST /api/auth/set-password | Yes (token, password, confirmPassword) | router.push("/dashboard") (may bounce) | Yes (refs + checklist) | P2 |
| app/components/productform.tsx | POST /api/products/create, PUT /api/products/[id] | Yes (multipart, matches backend) | Modal closes via onSuccess | Yes | — |
| app/components/invoice-form.tsx | POST /api/invoices, PATCH /api/invoices | Yes (customer, items, amount, discount, deposit, paymentMethod, status, date) | Modal closes | Yes | — |
| app/components/shipment-form.tsx | POST /api/shipments | Yes (destination, cost, description, date) | onSuccess + close | Yes | — |
| app/components/wallet-deposit-form.tsx | POST /api/wallet | Yes (amount, currency, type, note) | onSuccess + close | Yes | — |

All forms correctly call preventDefault, check response.ok, and display error bodies.

---

## 6. Seed Data Issues

1. **No seed files exist at all** (`prisma/seed.ts`, `scripts/seed.*` — none). All collections start empty; no demo/admin user, products, or invoices.
2. **Wallet implicit seed is invalid:** `app/api/wallet/route.ts` initializes `balanceEGP` from cash invoice **deposits only** — ignores invoice amounts, shipments, and withdrawals → arbitrary/incorrect baseline.
3. **`user.firstName` field mismatch:** `app/api/auth/set-password/route.ts` reads `user.firstName`, but signup creates users with only `{username, email, password, roles, isActive, ...}` — field never exists, so password-strength check against the name is silently broken.
4. **`products.category` shape mismatch:** schema/route stores category as an array `("Foil"|"Sabre"|"Epée")[]`, but `GET /api/products` filters with exact string equality → filter never matches any document.
5. **`invoices.date` type mismatch:** stored as string while dashboard/analytics compare with Date-derived strings; any Date-object invoice breaks `$gte` type matching.
6. **`invoices.invoiceId` format:** `INV-` + random 4 digits, no uniqueness constraint → collisions guaranteed at scale.
7. **`shipments.destination` mismatch:** backend whitelist is `("cairo"|"alex")` but the shipment form's select offers "cairo"/"alexandria" — verify "alexandria" maps to "alex" or the POST is rejected.
8. **`scripts/migrate-images.js`** field usage matches the implied product shape ✅ (only valid seed-adjacent script).
9. **`MONGODB_DB_NAME` unset** — mongoDB.ts passes `undefined` dbName (script defaults to "swords").

---

## 7. Prioritized Fix List

### P0 — Broken / Erroring / Wrong Data

- **P0-001 — No database connection (app-wide blocker).** `MONGODB_URI` is not set anywhere; `.env` only has an unused PostgreSQL `DATABASE_URL`. `app/lib/mongoDB.ts` throws and `process.exit(1)` → every DB-touching API route fails. Files: `.env`, `app/lib/mongoDB.ts`, `docker-compose.yml`. Fix: provision/set a real `MONGODB_URI` (and `MONGODB_DB_NAME`), or migrate the DB layer to the provisioned PostgreSQL; add a database service to docker-compose.
- **P0-002 — Broken email links (`undefined/set-password?...`).** `process.env.REDIRECT_URL` used in signup and forget-password but missing from `.env`. Files: `.env`, `app/api/auth/signup/route.ts`, `app/api/auth/forget-password/route.ts`. Fix: add `REDIRECT_URL` to `.env` (fallback to `NEXT_PUBLIC_BASE_URL`).
- **P0-003 — No backend auth enforcement.** Only `/api/auth/me` verifies JWT; all write endpoints (products create/update/delete, invoices POST/PATCH, shipments, wallet) are publicly callable while admin pages are frontend-protected only. Files: all `app/api/**/route.ts`. Fix: add JWT-cookie verification middleware/helper to all non-auth routes; restrict write endpoints to admin role.
- **P0-004 — Broken category filter in GET /api/products.** Compares exact string against array-typed `category` field → never matches. File: `app/api/products/route.ts`. Fix: use `query.category = { $in: [category] }` (or `$elemMatch`).
- **P0-005 — PUT /api/products/[id] destroys unspecified fields.** Full overwrite from FormData; missing fields become null/"false". File: `app/api/products/[id]/route.ts`. Fix: build an update object from only provided fields (or merge with existing doc) and validate numerics.
- **P0-006 — Invoice stock/wallet integrity bugs.** POST: `newQty` dead variable, no stock-sufficiency check (negative stock), `logInventoryChange` never called (sales unlogged); PATCH: invalid ObjectId → 500, wallet deposit double-count edge case, partial response body; no transactions anywhere. File: `app/api/invoices/route.ts`. Fix: validate ObjectId (400), check stock before decrement, call logInventoryChange in POST loop, fix deposit math, use DB transactions for multi-collection updates.
- **P0-007 — NaN validation gaps corrupt data.** `quantity`/`price` (products create/PUT), wallet `amount` (`"abc" <= 0` is false → NaN passes). Files: `app/api/products/create/route.ts`, `app/api/products/[id]/route.ts`, `app/api/wallet/route.ts`. Fix: validate `Number.isFinite(x) && x >= 0` before persisting; return 400.
- **P0-008 — Wallet/shipments can go negative and desync.** Withdraw and shipment POST have no sufficient-funds check; shipment debits wallet before insert with no rollback. Files: `app/api/wallet/route.ts`, `app/api/shipments/route.ts`. Fix: check balance before debit; create record first (or use a transaction) then debit.
- **P0-009 — Unescaped search regex (injection/500).** User input passed to RegExp unescaped in GET /api/products (and invoice search if similar). File: `app/api/products/route.ts`. Fix: escape special chars before constructing RegExp.
- **P0-010 — User enumeration + debug logging in forget-password.** Reveals "This email does not exist"; console.log of user email. File: `app/api/auth/forget-password/route.ts`. Fix: return generic message; remove debug logs.
- **P0-011 — 500s on missing request fields.** `body.email.trim()` / `body.username.trim()` throw unhandled TypeError in signin/signup/forget-password. Files: `app/api/auth/signin/route.ts`, `app/api/auth/signup/route.ts`, `app/api/auth/forget-password/route.ts`. Fix: validate presence first, return 400.

### P1 — Missing Core Features

- **P1-001 — No database schema, migrations, or indexes.** No Mongoose schemas, no migration system, no unique index on `invoices.invoiceId`, no indexes on email/productId/timestamp. Files: new `app/lib/schemas.ts` (or similar), `app/lib/mongoDB.ts`. Fix: define Mongoose schemas with validation, unique index on invoiceId, and indexes on hot query paths.
- **P1-002 — No seed data.** No seed script for users/products/invoices; collections start empty. Files: new `scripts/seed.ts`. Fix: add idempotent seed script matching the implied schema.
- **P1-003 — Signup flow dead-ends.** No password step; success redirects to /sign-in with no feedback; orphan inactive user if email send fails. Files: `app/sign-in/page.tsx`, `app/api/auth/signup/route.ts`. Fix: show success message with activation instructions; handle email-send failure (delete or mark user).
- **P1-004 — set-password inconsistencies.** References non-existent `user.firstName`; ROLES cookie not JSON.stringify'd; no `logged_in` cookie (client login-state checks fail). File: `app/api/auth/set-password/route.ts`. Fix: drop firstName from validation, JSON.stringify ROLES, set `logged_in` cookie.
- **P1-005 — Dashboard mock trend percentages.** Hardcoded 12.5/8.3/5.2/15.7 on StatCards. File: `app/(admin)/dashboard/page.tsx`. Fix: compute real trends from analytics data or remove.
- **P1-006 — Duplicated analytics logic.** `/api/dashboard/summary` duplicates ~90% of `/api/analytics`. Files: `app/api/dashboard/summary/route.ts`, `app/api/analytics/route.ts`. Fix: extract shared aggregation into `app/lib/`.
- **P1-007 — No pagination on GET /api/shipments.** Returns all shipments. File: `app/api/shipments/route.ts`. Fix: add page/limit pagination like other routes.
- **P1-008 — Dashboard/analytics performance & NaN.** Full collection scans; `item.price * item.quantity` NaN propagation. Files: `app/api/dashboard/summary/route.ts`, `app/api/analytics/route.ts`. Fix: use MongoDB aggregation pipelines; guard undefined item prices.
- **P1-009 — Landing page auth cookie mismatch.** Reads `logged_in` cookie which backend may not set consistently (set-password doesn't set it). File: `app/page.tsx`. Fix: verify against actual cookie set by signin/set-password or use /api/auth/me.
- **P1-010 — Wallet transactions / inventory logs: no filtering.** UI filters (currency/type) ignored by backend. Files: `app/api/wallet/transactions/route.ts`, `app/api/inventory/logs/route.ts`. Fix: add currency/type/productId query filters.
- **P1-011 — In-memory signin lockout.** Resets on restart, leaks memory, leaks account existence. File: `app/api/auth/signin/route.ts`. Fix: persist lockout in DB or remove; generic error message; remove dead duplicate query.

### P2 — UI/UX Polish

- **P2-001 — No error state on admin layout user fetch.** File: `app/(admin)/layout.tsx`. Fix: add error banner/retry on failed /api/auth/me.
- **P2-002 — alert() for logout errors in sidebar.** File: `app/components/sidebar.tsx`. Fix: use the app's banner/toast pattern.
- **P2-003 — Index-as-key lists.** Wallet transactions and dashboard top products. Files: `app/(admin)/wallet/page.tsx`, `app/(admin)/dashboard/page.tsx`. Fix: key by transaction `_id` / product name.
- **P2-004 — Literal `**PBT**` markdown in landing hero.** File: `app/page.tsx`. Fix: remove asterisks / render properly.
- **P2-005 — Set-password missing-token UX.** Error only after submit; no upfront invalid-link state. File: `app/set-password/page.tsx`. Fix: check token on mount and show invalid-link state.
- **P2-006 — Inconsistent API response shapes.** `success` flag present/absent; pagination keys `totalItems/currentPage` vs `totalCount/page`. Files: multiple API routes. Fix: standardize response envelope and pagination keys.
- **P2-007 — Unused imports/dead code.** `updateInvoiceStatus` in dashboard page; duplicate signin query; unused `request` in analytics. Files: `app/(admin)/dashboard/page.tsx`, `app/api/auth/signin/route.ts`, `app/api/analytics/route.ts`. Fix: remove.
- **P2-008 — Unused/bloat dependency.** `react-router-dom` in a Next.js app. File: `package.json`. Fix: remove dependency.
- **P2-009 — Old product images never deleted from Cloudinary on PUT.** File: `app/api/products/[id]/route.ts`. Fix: delete removed images via Cloudinary API.
- **P2-010 — Commented-out dead link in set-password.** `<a href="/login">` references non-existent route. File: `app/set-password/page.tsx`. Fix: remove or point to /sign-in.
- **P2-011 — Shipment destination mismatch (UI vs backend).** Form offers "alexandria", backend whitelist is "alex". Files: `app/components/shipment-form.tsx`, `app/api/shipments/route.ts`. Fix: align values.
- **P2-012 — x-user-id header trusted from client in logout.** File: `app/api/auth/logout/route.ts`. Fix: derive userId from verified token.

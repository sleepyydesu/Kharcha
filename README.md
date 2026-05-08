# Kharcha 💸

A full-stack digital wallet and personal finance application built for Nepal. Kharcha lets users send and receive money, load funds via Khalti, track expenses, manage budgets, pay merchants via QR code, and use a virtual or physical Kharcha Card — all from a single React-based interface.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
  - [Backend `.env`](#backend-env)
  - [Frontend `.env`](#frontend-env)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Wallet](#wallet)
  - [Transactions](#transactions)
  - [Expenses & Income](#expenses--income)
  - [Budgets](#budgets)
  - [Categories](#categories)
  - [Khalti Top-Up](#khalti-top-up)
  - [QR Codes & Merchant Payments](#qr-codes--merchant-payments)
  - [POS / RFID Payments](#pos--rfid-payments)
  - [Pay Portal](#pay-portal)
  - [Cards](#cards)
  - [Gift Cards](#gift-cards)
  - [Profile](#profile)
  - [API Keys (Organisations)](#api-keys-organisations)
  - [Admin](#admin)
- [Frontend Pages](#frontend-pages)
- [Notification System](#notification-system)
- [Security](#security)
- [Scripts](#scripts)

---

## Features

| Category | Highlights |
|---|---|
| **Wallet** | Real-time balance, send money by phone number or wallet ID, receiver lookup preview |
| **Top-Up** | Load money via Khalti payment gateway |
| **Transactions** | Paginated statement list, full transaction detail, filter by type / category / date |
| **Expenses & Budgets** | Manual expense logging, category breakdowns, budget creation and tracking |
| **QR Payments** | Scan-to-pay, dynamic per-transaction QR sessions for merchants, status polling |
| **Kharcha Card** | Issue virtual cards instantly, request physical cards, set daily spend limits, block/unblock |
| **POS / RFID** | API-key-authenticated POS terminal integration, RFID card lookup |
| **Pay Portal** | Embeddable OTP-based payment page for organisations, no Kharcha app required |
| **Gift Cards** | Redeem gift card codes directly into the wallet |
| **MPIN Security** | 6-digit transaction PIN, setup prompt on first login, forgot/reset via email OTP |
| **Notifications** | Slide-in toast for MPIN setup and incoming money, tappable with deep navigation |
| **API Docs** | Auto-generated Swagger UI at `/api/docs` |

---

## Tech Stack

### Backend
- **Runtime:** Node.js (CommonJS)
- **Framework:** Express 5
- **Database / Auth:** Supabase (PostgreSQL)
- **Authentication:** JWT (`jsonwebtoken`), bcrypt password hashing
- **Email:** Mailtrap (OTP delivery)
- **Payments:** Khalti payment gateway
- **Security:** Custom rate limiters, security headers (no external helmet dependency), API key middleware
- **Docs:** Swagger UI (`swagger-ui-express`)

### Frontend
- **Framework:** React 19 with Vite 8
- **Routing:** React Router DOM v7
- **Charts:** Recharts
- **QR:** `jsqr` (scanning), `qrcode` (generation)
- **Styling:** Plain CSS with CSS custom properties (dark-mode aware), Tailwind utility classes
- **Icons:** Lucide React

---

## Project Structure

```
Kharcha/
├── Backend/
│   ├── server.js                  # Entry point — starts Express on PORT
│   └── src/
│       ├── app.js                 # Express app, middleware, route mounting
│       ├── swagger.js             # Swagger/OpenAPI spec config
│       ├── controllers/           # Business logic (one file per domain)
│       │   ├── authController.js
│       │   ├── walletController.js
│       │   ├── transactionController.js
│       │   ├── expenseController.js
│       │   ├── incomeController.js
│       │   ├── budgetController.js
│       │   ├── categoryController.js
│       │   ├── khaltiController.js
│       │   ├── qrCodeController.js
│       │   ├── cardController.js
│       │   ├── posController.js
│       │   ├── payPortalController.js
│       │   ├── paymentController.js
│       │   ├── giftCardController.js
│       │   ├── profileController.js
│       │   ├── apiKeyController.js
│       │   ├── analyticsController.js
│       │   └── adminController.js
│       ├── routes/                # Express routers (one file per domain)
│       ├── middleware/
│       │   ├── authmiddleware.js      # JWT authenticate, flexAuth, authenticateApiKey
│       │   ├── apiKeyMiddleware.js    # X-API-Key verification for org routes
│       │   ├── securityMiddleware.js  # Rate limiters + security headers
│       │   └── dateRangeValidator.js  # Query param validation for analytics
│       ├── services/
│       │   ├── supabaseClient.js      # Supabase SDK singleton
│       │   └── khaltiService.js       # Khalti API wrapper
│       └── utils/
│           ├── jwtUtils.js
│           ├── otpUtils.js
│           └── emailUtils.js
│
└── Frontend/
    ├── index.html
    └── src/
        ├── App.jsx                # Root — auth state, routing, AppShell
        ├── App.css
        ├── api.js                 # Axios base instance (token injection)
        ├── context/
        │   └── NotificationContext.jsx   # Global notification state
        ├── hooks/
        │   └── useTransactionPoller.js   # Background poll for incoming money
        ├── components/
        │   ├── NotificationToast.jsx / .css   # Slide-in toast (replaces bell icon)
        │   ├── Sidebar.jsx / .css
        │   ├── BalancePanel.jsx / .css
        │   ├── LoginForm.jsx
        │   ├── SignupForm.jsx
        │   ├── ResetForm.jsx
        │   ├── QRScanner.jsx / .css
        │   ├── CategoryIcon.jsx / .css
        │   ├── InputField.jsx
        │   ├── KharchaLogo.jsx
        │   └── Toast.jsx
        ├── pages/
        │   ├── Dashboard.jsx          # Home — balance, recent transactions, quick actions
        │   ├── Statements.jsx         # Full transaction history with filters
        │   ├── StatementDetail.jsx    # Single transaction breakdown
        │   ├── SendMoney.jsx          # Transfer flow with MPIN confirmation
        │   ├── LoadMoney.jsx          # Khalti top-up
        │   ├── Expenses.jsx           # Expense logging and category charts
        │   ├── Account.jsx            # Profile, MPIN setup/change, card management
        │   ├── KharchaCard.jsx        # Virtual / physical card UI
        │   ├── Services.jsx           # Bill payments (electricity, water, etc.)
        │   ├── OrgQRCodes.jsx         # Organisation QR code manager
        │   ├── DynamicQRPayment.jsx   # Scan and pay a merchant QR session
        │   ├── PaymentGateway.jsx     # Pay Portal payer-side page
        │   ├── Preview.jsx            # Pre-send confirmation screen
        │   ├── ApiDocs.jsx            # Embedded Swagger UI wrapper
        │   └── SetToken.jsx           # Dev helper — manually set JWT in localStorage
        └── assets/                    # SVG icons and PNG images
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A [Supabase](https://supabase.com) project with your schema applied
- A [Khalti](https://khalti.com) merchant account (test keys are fine for development)
- A [Mailtrap](https://mailtrap.io) account for email OTP delivery

### Backend Setup

```bash
cd Backend
npm install
cp .env.example .env   # then fill in your values (see Environment Variables below)
npm run dev            # starts with nodemon on PORT (default 5000)
```

The server will be available at `http://localhost:5000`.  
Swagger docs are available at `http://localhost:5000/api/docs`.

### Frontend Setup

```bash
cd Frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL
npm run dev            # Vite dev server on http://localhost:5173
```

---

## Environment Variables

### Backend `.env`

| Variable | Description |
|---|---|
| `PORT` | Port the Express server listens on (default: `5000`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (full DB access — keep secret) |
| `JWT_SECRET` | Secret used to sign user session tokens (generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
| `SIGNUP_TOKEN_SECRET` | Separate secret for short-lived signup flow tokens |
| `MAILTRAP_TOKEN` | Mailtrap API token for sending OTP emails |
| `MAILTRAP_FROM` | Sender address shown in OTP emails |
| `KHALTI_SECRET_KEY` | Khalti merchant secret key |
| `KHALTI_RETURN_URL` | Backend URL Khalti redirects to after payment (e.g. `http://localhost:5000/api/khalti/verify`) |
| `KHALTI_WEBSITE_URL` | Your site URL shown on the Khalti payment page |
| `FRONTEND_URL` | Frontend URL the user is redirected to after Khalti verification (e.g. `http://localhost:5173`) |
| `CORS_ORIGIN` | Allowed CORS origin (defaults to `*`; set to your frontend URL in production) |
| `ADMIN_BOOTSTRAP_CODE` | One-time code required to create the first admin account |
| `GEMINI_API_KEY` | Google Gemini API key (used for the AI chatbot feature) |

### Frontend `.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API (e.g. `http://localhost:5000/api`) |

---

## API Reference

All protected endpoints require a `Bearer <token>` `Authorization` header unless noted otherwise.  
Full interactive documentation is available at `/api/docs` (Swagger UI).

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup/check` | None | Check if username / phone / email is available |
| POST | `/api/auth/signup/send-otp` | None | Send OTP to email for signup verification |
| POST | `/api/auth/signup/verify-otp` | None | Verify OTP and get a short-lived signup token |
| POST | `/api/auth/signup/complete` | Signup token | Submit profile details and create account |
| POST | `/api/auth/signin` | None | Sign in with phone/username/email + password, returns JWT |
| GET | `/api/auth/mpin/status` | JWT | Check whether MPIN has been configured |
| POST | `/api/auth/mpin/setup` | JWT | Set up a 6-digit MPIN for the first time |
| POST | `/api/auth/mpin/change` | JWT | Change existing MPIN (requires current MPIN) |
| POST | `/api/auth/password/forgot-send-otp` | None | Send OTP for password reset |
| POST | `/api/auth/password/reset` | None | Reset password using OTP |
| POST | `/api/auth/mpin/forgot-send-otp` | None | Send OTP for MPIN reset |
| POST | `/api/auth/mpin/reset` | None | Reset MPIN using OTP |

### Wallet

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/wallet` | JWT | Get wallet balance and account info |
| GET | `/api/wallet/lookup?identifier=` | JWT | Preview receiver before sending (by phone or wallet ID) |
| POST | `/api/wallet/transfer` | JWT | Send money to another user (rate-limited: 10 req/min) |

### Transactions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/transactions/categories` | None | List transaction category types |
| GET | `/api/transactions` | JWT | Paginated statement list — query: `page`, `limit`, `type` (all/sent/received), `category_id`, `start_date`, `end_date` |
| GET | `/api/transactions/:transaction_id` | JWT | Full detail for a single transaction |

### Expenses & Income

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/expenses` | JWT | Expense overview with date range filter |
| GET | `/api/expenses/category/:categoryId` | JWT | Expenses broken down by category |
| GET | `/api/expenses/:id` | JWT | Single expense detail |
| POST | `/api/expenses` | JWT | Create a new expense entry |
| PUT | `/api/expenses/:id` | JWT | Update an expense |
| DELETE | `/api/expenses/:id` | JWT | Delete an expense |
| GET | `/api/income` | JWT | Income overview |
| POST | `/api/income` | JWT | Log an income entry |

### Budgets

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/budgets` | JWT | List all budgets |
| POST | `/api/budgets` | JWT | Create a budget |
| PATCH | `/api/budgets/:id` | JWT | Update a budget |
| DELETE | `/api/budgets/:id` | JWT | Delete a budget |

### Categories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/categories` | JWT | List all user categories |
| POST | `/api/categories` | JWT | Create a category |
| PUT | `/api/categories/:id` | JWT | Update a category |
| DELETE | `/api/categories/:id` | JWT | Delete a category |
| POST | `/api/categories/:id/icon` | JWT | Upload a category icon |
| DELETE | `/api/categories/:id/icon` | JWT | Remove category icon |

### Khalti Top-Up

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/khalti/initiate` | JWT | Initiate a Khalti payment — returns a redirect URL |
| GET | `/api/khalti/verify` | None | Khalti callback — verifies payment and credits wallet, then redirects to frontend |

### QR Codes & Merchant Payments

Organisation routes require a user JWT. Payment session routes additionally accept an API key via `X-API-Key` header (for server-side POS integration).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/org/qr-codes` | JWT | Create a named dynamic QR code |
| GET | `/api/org/qr-codes` | JWT | List all QR codes for the organisation |
| PATCH | `/api/org/qr-codes/:qr_id` | JWT | Update QR code name, amount, note or callback |
| DELETE | `/api/org/qr-codes/:qr_id` | JWT | Delete a QR code |
| POST | `/api/org/qr-codes/payments/create` | JWT or API Key | Create a per-transaction payment session |
| POST | `/api/org/qr-codes/payments/complete` | JWT | User completes payment for an open session |
| GET | `/api/org/qr-codes/payments/status/:session_id` | JWT or API Key | Poll payment session status |
| GET | `/api/qr-codes/:qr_id` | None | Resolve any QR code (used by the scanner) |

### POS / RFID Payments

Authenticated with `X-API-Key` header, not a user JWT.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/pos/charge` | API Key | Direct charge against a wallet |
| POST | `/api/pos/checkout` | API Key | Create a POS checkout session |
| GET | `/api/pos/checkout/:session_id` | None | Resolve a POS checkout session |
| POST | `/api/pos/checkout/:session_id/pay` | JWT | User pays an open POS checkout |
| GET | `/api/pos/checkout/:session_id/status` | None | Poll checkout status |
| GET | `/api/cards/pos/lookup/:rfid_uid` | API Key | Look up an account by RFID UID |

### Pay Portal

Allows an organisation to embed a hosted payment page — customers pay without needing the Kharcha app installed. The merchant creates a session with their API key; the payer authenticates with their Kharcha credentials and an OTP.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/pay-portal/sessions/create` | API Key | Merchant creates a pay portal session |
| GET | `/api/pay-portal/:session_id/session` | None | Payer fetches session details |
| POST | `/api/pay-portal/:session_id/login` | None | Payer logs in and triggers OTP (rate-limited) |
| POST | `/api/pay-portal/:session_id/verify-otp` | None | Payer submits OTP to complete payment |
| POST | `/api/pay-portal/:session_id/resend-otp` | None | Resend OTP to payer |

### Cards

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/cards/my-cards` | JWT | Fetch user's virtual and physical cards |
| POST | `/api/cards/virtual/issue` | JWT | Issue a virtual card instantly |
| POST | `/api/cards/physical/request` | JWT | Request a physical card (processed by admin) |
| POST | `/api/cards/:card_type/block` | JWT | Block a card |
| PATCH | `/api/cards/:card_type/limits` | JWT | Update daily spend limit |
| POST | `/api/cards/admin/activate-physical` | JWT (admin) | Assign RFID UID and activate a physical card |
| PATCH | `/api/cards/admin/set-rfid` | JWT (admin) | Update RFID UID on an existing physical card |
| PATCH | `/api/cards/admin/limits` | JWT (admin) | Admin override of any card's daily limit |
| POST | `/api/cards/admin/block` | JWT (admin) | Admin block any card |
| POST | `/api/cards/admin/unblock` | JWT (admin) | Admin unblock any card |
| GET | `/api/cards/admin/requests` | JWT (admin) | List all physical card requests |

### Gift Cards

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/gift-cards/redeem` | JWT | Redeem a gift card code and credit the wallet |

### Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/profile/org-types` | None | List available organisation types |
| GET | `/api/profile` | JWT | Get current user's profile |
| PATCH | `/api/profile` | JWT | Update profile fields |
| POST | `/api/profile/picture` | JWT | Upload a profile picture |
| DELETE | `/api/profile/picture` | JWT | Remove profile picture |

### API Keys (Organisations)

Organisation accounts can generate API keys for POS terminals and server-side integrations.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/org/api-keys` | JWT | Create a new API key |
| GET | `/api/org/api-keys` | JWT | List all API keys |
| PATCH | `/api/org/api-keys/:api_key_id` | JWT | Rename or update an API key |
| DELETE | `/api/org/api-keys/:api_key_id` | JWT | Revoke an API key |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/admin/create` | Bootstrap code or JWT (admin) | Create the first admin or promote a user |

---

## Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Balance overview, recent transactions, quick-action buttons |
| `/statements` | Statements | Full transaction history with type/date/category filters |
| `/statements/:id` | StatementDetail | Single transaction receipt view |
| `/send` | SendMoney | Receiver lookup, amount entry, MPIN confirmation |
| `/load` | LoadMoney | Initiate a Khalti top-up |
| `/expenses` | Expenses | Log manual expenses, view category pie chart |
| `/account` | Account | Edit profile, MPIN setup/change, card management |
| `/card` | KharchaCard | Virtual and physical card UI, block and limit controls |
| `/services` | Services | Utility bill payments (electricity, water, internet, etc.) |
| `/org/qr-codes` | OrgQRCodes | Organisation QR code CRUD dashboard |
| `/pay/:qr_id` | DynamicQRPayment | Scan-to-pay merchant QR session |
| `/payment-gateway` | PaymentGateway | Pay Portal hosted payment page (customer-facing) |
| `/preview` | Preview | Pre-send confirmation before a transfer |
| `/api-docs` | ApiDocs | Embedded Swagger UI |
| `/set-token` | SetToken | Dev utility to manually set a JWT in localStorage |

---

## Notification System

Kharcha uses a lightweight in-app notification system — no third-party push service required.

**How it works:**

- `NotificationContext` holds a list of notification objects globally. Each notification has an `id`, `title`, `body`, optional `link`, `type` (`warning` / `success` / `info` / `error`), and a `read` flag.
- `NotificationToast` reads the first unread notification and renders it as a slide-in banner fixed at the top-center of the screen. It auto-dismisses when tapped or when the × button is pressed.
- Clicking the toast navigates the user to `link` (if set) via React Router.
- `useTransactionPoller` polls `/api/transactions` every 30 seconds in the background. On the first load it silently seeds a "seen" set stored in `localStorage` so existing transactions don't trigger alerts. Any new `received` transaction fires a green toast that takes the user to `/statements`.

**Notification triggers:**

| Trigger | Type | Navigates to |
|---|---|---|
| Login — MPIN not yet configured | `warning` | `/account` |
| Signup completed | `warning` | `/account` |
| New incoming money received | `success` | `/statements` |

---

## Security

- **JWT authentication** — tokens are signed with `JWT_SECRET` and verified on every protected route by the `authenticate` middleware. No cookies are used, so CSRF attacks are not applicable.
- **MPIN** — a separate 6-digit PIN is required to authorise transfers, stored as a bcrypt hash.
- **Rate limiting** — all endpoints are covered by a custom sliding-window rate limiter:
  - General API: 200 requests / 15 min per IP
  - Auth endpoints: 20 requests / 15 min per IP
  - OTP sending: 5 requests / 10 min per IP
  - Wallet transfers: 10 requests / 1 min per IP
  - Pay Portal login/OTP: 5–8 requests / 1 min per IP
- **Security headers** — every response includes `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy`, `Cache-Control: no-store`, and a strict `Content-Security-Policy` (relaxed only for the Swagger UI route).
- **API keys** — organisation API keys for POS and server-side integrations are passed via the `X-API-Key` header and verified separately from user JWTs.
- **OTP verification** — email OTPs (delivered via Mailtrap) are required for signup, password reset, and MPIN reset.

---

## Scripts

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start the server with nodemon (auto-restart on file changes) |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Production build (output to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## License

This project is private and not licensed for public redistribution.
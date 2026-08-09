# AXIOS Executive Key Management System
## Robust Architecture Specification & Feature Inventory Document

---

### Executive Summary & System Philosophy

The **AXIOS Executive Key Management System** is an enterprise-grade SaaS license management, device hardware-binding (HWID) authentication, and reseller management portal. The platform provides a multi-tiered role architecture (Owner, Manager, Reseller) with token-based licensing economics, two-factor PIN authentication, hardware ID reset management, payment screenshot verification, and real-time analytics.

This document serves as the authoritative blueprint for the backend (Bun + TypeScript + `bun:sqlite`) and frontend (Next.js + TypeScript + Tailwind CSS).

---

### 1. Database Schema & Persistence (`bun:sqlite`)

The database is powered directly by Bun's native SQLite engine (`import { Database } from "bun:sqlite"`), persisting to `./data/axios.db`.

#### Table 1: `users`
Stores user accounts for Owners, Managers, and Resellers.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique UUID v4 for the user |
| `username` | TEXT | UNIQUE, NOT NULL | Account login username |
| `password` | TEXT | NOT NULL | Account authentication password |
| `role` | TEXT | NOT NULL, CHECK(role IN ('owner', 'manager', 'reseller')) | Access control level |
| `createdBy` | TEXT | | ID or username of parent creator |
| `pin2fa` | TEXT | | 6-digit security PIN for 2FA validation |
| `isBlocked` | INTEGER | DEFAULT 0 | 0 = Active, 1 = Blocked from API & login |
| `credits` | INTEGER | DEFAULT 0 | Legacy balance synchronized with tokens |
| `tokens` | INTEGER | DEFAULT 0 | Token currency balance for key generation |
| `createdAt` | TEXT | NOT NULL | ISO 8601 timestamp |

#### Table 2: `keys`
Stores license keys, HWID bindings, expiration, payment screenshots, and token costs.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique UUID v4 for the key |
| `key` | TEXT | UNIQUE, NOT NULL | License key string (e.g. `AXIOS-XXXX-XXXX-XXXX` or `free-key-XXXX`) |
| `hwid` | TEXT | | Hardware ID bound on first device activation |
| `status` | TEXT | NOT NULL DEFAULT 'active', CHECK(status IN ('active', 'expired', 'revoked', 'banned')) | Current key status |
| `expiresAt` | TEXT | NOT NULL | Expiration ISO 8601 string or `'never'` |
| `createdAt` | TEXT | NOT NULL | ISO 8601 creation timestamp |
| `activatedAt` | TEXT | | ISO 8601 timestamp of first HWID binding |
| `createdById` | TEXT | NOT NULL | User ID of the key creator |
| `createdByUsername` | TEXT | NOT NULL | Username of key creator for tracking |
| `note` | TEXT | | Customer note, Discord handle, or description |
| `isMasterKey` | INTEGER | DEFAULT 0 | 1 = Master Key (bypasses HWID device restriction) |
| `paymentScreenshot` | TEXT | | Static URL path to uploaded payment proof image |
| `costTokens` | INTEGER | DEFAULT 0 | Token cost consumed during key generation |

#### Table 3: `logs`
Audit log history for security and management tracking.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique UUID v4 for log entry |
| `userId` | TEXT | NOT NULL | User ID performing the action |
| `username` | TEXT | NOT NULL | Username performing the action |
| `action` | TEXT | NOT NULL | Event type (`LOGIN_SUCCESS`, `KEYS_GENERATED`, etc.) |
| `details` | TEXT | | Event detail payload |
| `timestamp` | TEXT | NOT NULL | ISO 8601 timestamp |

---

### 2. Backend Architecture & Feature Inventory

The backend is built with **Bun** natively running TypeScript files without a separate build compilation step (`bun src/index.ts`).

#### Core Backend Modules
- **`src/db/`**: Handles native `bun:sqlite` database connection, schema migration, dynamic owner initialization from environment variables (`OWNER_USERNAME`, `OWNER_PASSWORD`, `OWNER_2FA_PIN`).
- **`src/controllers/`**:
  - **`auth.controller.ts`**: Handles credentials verification, dynamic Owner sync, 2FA dial-pad PIN verification, JWT token issuance (24h validity).
  - **`keys.controller.ts`**: Handles public client key verification (`/verify` & `/api/keys/verify`), signature hash check, HWID binding, key listing, key generation with token deduction, HWID reset, and key deletion.
  - **`users.controller.ts`**: Scoped user retrieval, manager/reseller creation, block toggling, user deletion, and token adjustment (`add`/`deduct`).
  - **`analytics.controller.ts`**: Executive KPI metrics, 14-day sales timeline, top resellers leaderboard, and individual reseller dashboard drilldown analytics.
- **`src/middlewares/`**:
  - **`auth.ts`**: JWT bearer authentication middleware with real-time database `isBlocked` account validation, and role-based access guard (`authorizeRole`).
  - **`rateLimiter.ts`**: In-memory rate limiting for sensitive endpoints (`/auth/login`, `/verify`).
  - **`errorHandler.ts`**: Global error handling middleware.
- **`src/services/`**:
  - **`logs.service.ts`**: Centralized audit log writer and query service.

#### API Endpoints Reference
| Method | Route | Auth Required | Description |
|---|---|---|---|
| `GET` | `/` | No | System health check & endpoint directory |
| `GET` | `/api/stats` | No | Connection health check |
| `POST` | `/api/auth/login` | No | User login. Triggers 2FA requirement for Owner/Manager |
| `POST` | `/api/auth/verify-2fa` | No | Verifies 2FA PIN and issues JWT bearer token |
| `POST` | `/api/verify` | No | Client engine key verification & HWID binding |
| `POST` | `/api/keys/verify` | No | Client engine key verification alias |
| `GET` | `/api/keys` | JWT | Get keys list scoped by user role |
| `POST` | `/api/keys/generate` | JWT | Generate license keys; deducts reseller tokens |
| `POST` | `/api/keys/reset-hwid` | JWT | Unbind HWID from a license key |
| `POST` | `/api/keys/delete` | JWT | Delete a license key |
| `GET` | `/api/users` | JWT (Owner/Manager) | Get users list scoped by creator |
| `POST` | `/api/users/create` | JWT (Owner/Manager) | Create new Manager or Reseller |
| `POST` | `/api/users/toggle-block` | JWT (Owner/Manager) | Block or unblock a user account |
| `POST` | `/api/users/delete` | JWT (Owner/Manager) | Delete a reseller user account |
| `POST` | `/api/users/tokens` | JWT (Owner/Manager) | Add or deduct reseller token balance |
| `GET` | `/api/analytics` | JWT | Overview KPI stats, sales chart, top resellers |
| `GET` | `/api/analytics/reseller/:id` | JWT | Detailed reseller profile, stats, sales graph & keys |

---

### 3. Key Generation & Token Economics

License key generation follows strict economic rules:

#### Token Pricing Schedule
- **1 Day Key**: 10 Tokens
- **7 Days Key**: 70 Tokens
- **30 Days Key**: 250 Tokens
- **Lifetime Key**: 300 Tokens
- **Custom Duration**: `Days * 10` Tokens
- **Master Key**: 0 Tokens (Owner & Manager Exclusive)

#### Reseller Token Rules
1. When a Reseller generates keys, the total cost (`CostPerKey * Quantity`) is calculated.
2. If Reseller balance `< TotalCost`, key generation is rejected with an `Insufficient token balance` error.
3. Upon successful generation, the exact token cost is deducted atomically from `users.tokens` and `users.credits`.
4. Owners and Managers have unlimited access and do not pay tokens.

---

### 4. Frontend Architecture & UI/UX Design

The frontend is a **Next.js + TypeScript** application styled with clean Tailwind CSS for a modern, high-end executive look.

#### UI/UX Principles
- **Clean & High-Contrast**: Sleek dark slate palette (`slate-950`, `zinc-900`), crisp borders (`border-zinc-800`), readable typography (`Inter` + `JetBrains Mono` code fonts).
- **Pro Dashboard Organization**:
  - **Top Bar Header**: Live backend status badge, refresh button, user profile info, token balance badge, logout button.
  - **Tabbed Navigation**: License Keys Manager, Resellers Directory, Analytics & Intelligence.
  - **License Keys Manager**: Status filter pill buttons (`All`, `Active`, `Expired`, `Revoked`, `Master`), search input (key, HWID, creator, note), bulletproof clipboard copy buttons, HWID reset modal/prompt, key deletion prompt, payment screenshot preview button.
  - **Key Generator Card**: Duration dropdown, custom days input, key count counter, note field, Master Key toggle (Owner/Manager only), drag-and-drop payment proof screenshot uploader, real-time token cost calculator.
  - **Reseller Management**: Resellers list table, role badge, creator badge, token balance pill, **Manage Tokens Modal** (Add/Deduct with quick presets + projected balance), and **Reseller Full Dashboard Modal** (profile header, 4 KPI cards, 14-day sales chart, issued key history table, payment proof lightbox).
  - **2FA DialPad Modal**: Tactile numeric dial pad for Owner and Manager 2FA PIN verification.

---

### 5. Execution & Testing Plan

1. **Backend**: Execute directly using `bun src/index.ts` from `backend/`.
2. **Frontend**: Execute using `npm run dev` from `frontend/`.
3. **Database Verification**: Ensure `backend/data/axios.db` records remain intact, fully readable, and writable.

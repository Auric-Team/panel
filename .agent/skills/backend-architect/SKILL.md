---
name: backend-architect
description: >-
  World-class backend development and system architecture skill. Use when designing, building, securing, optimizing, or debugging APIs, servers (Bun, Node.js, Express, Fastify), database architectures (SQLite, PostgreSQL, Redis), authentication (JWT, OAuth), rate limiting, and automated testing.
---

# Backend Architect Skill

An authoritative, production-grade engineering runbook for developing robust, scalable, ultra-fast, and secure backend systems and APIs.

---

## 1. Core Architecture & Standards

### 1.1 Technology Guidelines
- **Runtime**: Bun (high-performance native TS execution) or Node.js LTS.
- **Framework**: Express / Fastify / Native Bun HTTP server.
- **Language**: Strict TypeScript with exhaustive type narrowing, custom error classes, and zero unhandled rejections.
- **Database & Storage**:
  - Embedded/Fast: SQLite / `bun:sqlite` with WAL mode (`PRAGMA journal_mode = WAL`).
  - Distributed/Relational: PostgreSQL with connection pooling & transaction isolation.
  - Caching & Queues: In-memory LRU / Redis for hot keys, session store, and job queues.
- **Security & Auth**:
  - JWT with short TTL + rotating refresh tokens.
  - Password hashing via Argon2 / bcrypt with adequate work factor.
  - CORS whitelist enforcement, helmet headers, rate-limiting per IP/API key.
  - Input sanitization & strict payload validation using Zod schema parsing.

### 1.2 Service Layout & Directory Structure
```text
src/
├── config/             # Environment variables parser, constants, server configuration
├── controllers/        # Request handlers & HTTP translation layer
├── services/           # Core business logic & database transactions
├── models/             # Database schemas, migrations, or data access objects (DAOs)
├── middleware/         # Auth, validation, rate-limiting, error handling, logging
├── routes/             # API route definitions and endpoint grouping
├── utils/              # Cryptography, JWT helpers, file storage, response formatters
└── types/              # DTOs, request/response types, internal service interfaces
```

---

## 2. Standard Workflow & Procedures

### Step 1: Endpoint & Schema Definition
1. Design RESTful endpoint URIs (`/api/v1/resource`).
2. Define incoming payload validation schema using Zod.
3. Define standardized JSON envelope responses.

### Step 2: Business Logic & Transactional Safety
- Keep controllers thin: only parse inputs, call service methods, and format responses.
- Wrap multi-table modifications inside explicit database transactions.
- Handle edge cases, resource locks, and race conditions gracefully.

### Step 3: Security & Middleware Pipeline
- Apply global error handling middleware: catch all uncaught exceptions, sanitize sensitive stack traces in production.
- Protect sensitive endpoints with `authMiddleware` (JWT verification & user role checking).
- Add rate limiting to prevent brute force on authentication and high-frequency endpoints.

### Step 4: Verification & Automated Testing
1. Run static type checking: `bun tsc --noEmit`.
2. Execute automated test suites: `bun test` or `npm test`.
3. Check API throughput and latency under load.

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
3. Define standardized JSON envelope responses:
   ```json
   {
     "success": true,
     "data": { ... },
     "message": "Resource retrieved successfully"
   }
   ```
   Or on error:
   ```json
   {
     "success": false,
     "error": {
       "code": "RESOURCE_NOT_FOUND",
       "message": "The requested item was not found"
     }
   }
   ```

### Step 2: Business Logic & Transactional Safety
- Keep controllers thin: only parse inputs, call service methods, and format responses.
- Wrap multi-table modifications inside explicit database transactions (`db.transaction(...)`).
- Handle edge cases, resource locks, and race conditions gracefully.

### Step 3: Security & Middleware Pipeline
- Apply global error handling middleware: catch all uncaught exceptions, sanitize sensitive stack traces in production.
- Protect sensitive endpoints with `authMiddleware` (JWT verification & user role checking).
- Add rate limiting to prevent brute force on authentication and high-frequency endpoints.

### Step 4: Verification & Automated Testing
1. Run static type checking: `bun tsc --noEmit`.
2. Execute automated test suites: `bun test` or `npm test`.
3. Check API throughput and latency under load.

---

## 3. Best-in-Class Patterns & Code Recipes

### Standardized Error Class & Global Error Handler
```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_SERVER_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Global Express Error Middleware
export function errorHandler(err: any, req: any, res: any, next: any) {
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
    }
  };
  res.status(statusCode).json(response);
}
```

### High-Performance SQLite Setup with WAL Mode
```typescript
import { Database } from 'bun:sqlite';

export function initializeDatabase(path: string): Database {
  const db = new Database(path, { create: true });
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA synchronous = NORMAL;');
  db.run('PRAGMA foreign_keys = ON;');
  return db;
}
```

---

## 4. References & Tooling
- Read [API Security & Architecture Guide](./references/api_security.md) for security checklists, token handling, and database indexing strategies.

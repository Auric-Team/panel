# API Security & Architecture Best Practices

## 1. Authentication & Session Management
- **Token Storage**: Keep access tokens short-lived (15–60 mins) and store refresh tokens in secure, `httpOnly`, `SameSite=Strict` cookies or encrypted store.
- **Header Sanitization**: Strip internal server banners (`X-Powered-By`) and enforce standard security headers (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`).

## 2. Database Optimization
- **Indexing**: Add compound indexes on frequently queried columns (`WHERE user_id = ? AND status = ?`).
- **Connection Management**: Ensure pool size matches available CPU cores and network capacity.
- **WAL Mode**: For SQLite workloads, enabling Write-Ahead Logging (`WAL`) allows concurrent reads while writing.

## 3. Rate Limiting & Denial of Service Protection
- Apply sliding-window rate limiting on login/register endpoints (e.g. 5 attempts per 15 minutes).
- Limit body parser payload size (`express.json({ limit: '1mb' })`) to prevent memory exhaustion.

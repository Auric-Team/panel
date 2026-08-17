# Backend Engineering Directives

- **Runtime**: Bun (`bun src/index.ts`, `bun --watch src/index.ts`, `bun test`).
- **Architecture**: Enforce Layered Pattern (`routes/` -> `controllers/` -> `services/` -> `db/`).
- **Response Format**: Always return standardized JSON envelopes `{ success: boolean, data?: any, error?: { code: string, message: string } }`.
- **Security**: Strict JWT authorization, password hashing, parameterized/safe DB operations, rate limiting, and request sanitization.
- **Testing**: Run and maintain test suites with `bun test`.

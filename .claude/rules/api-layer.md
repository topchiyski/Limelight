---
paths:
  - "src/api/**/*.ts"
  - "tests/api/**/*.ts"
---

# API layer conventions
- One controller per resource in `src/api/controllers/<resource>.api.ts`; Zod schemas live next to it and are the source of types (`z.output` / `z.input`).
- Controllers call `LimelightApi` (`get/post/put/patch/delete`) with a `schema`. They do not call `APIRequestContext` directly.
- Pass `expectedStatus` for non-2xx paths; the client throws `LimelightApiError` (with body) for anything unexpected.
- Mutating controller methods call `assertMutationsAllowed()` and record created ids so the fixture teardown deletes them.
- Negative-path specs use dedicated `*ExpectingError` methods that return `ApiResponse<unknown>`.

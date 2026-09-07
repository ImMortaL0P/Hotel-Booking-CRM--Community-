# Security Fixes Plan

## Phase 1: Authentication Rate Limiting
- **Issue**: `/api/auth/*` routes are currently bypassing the `globalLimiter`.
- **Fix**: Apply a strict rate limiter (e.g., 10 requests per 15 minutes) specifically to `/api/auth/login` to prevent credential brute-forcing.

## Phase 2: Authorization Context Spoofing
- **Issue**: `logAction` in `dataController.ts` uses client-provided headers (`x-user-id`, `x-user-name`) to record who performed an action. A malicious user with a valid JWT could spoof these headers to attribute malicious actions to other staff members.
- **Fix**: 
  - Update `authController.ts` to include the user's `name` inside the signed JWT.
  - Require the `AuthRequest` type in `dataController.ts` and extract the guaranteed `userId` and `userName` directly from the verified `req.user` payload.

## Phase 3: Mass Assignment (Insecure Direct Object Reference)
- **Issue**: `dataController.ts` passes the raw `req.body` directly into `findByIdAndUpdate` for `Guests`, `Rooms`, and `Bookings`. A bad actor could potentially inject restricted fields (like unearned `totalSpent`, manipulated dates, etc.).
- **Fix**: Sanitize updates by selectively destructing or removing restricted fields (e.g., `_id`, `id`) from `req.body` before hitting the database.

## Phase 4: CORS Hardening
- **Issue**: CORS allowed origins loosely matches any origin starting with `http://192.168.`, which could expose the API to CSRF or cross-origin exploits from adjacent vulnerable network services.
- **Fix**: Remove the broad regex wildcard unless explicitly behind a strict dev flag.

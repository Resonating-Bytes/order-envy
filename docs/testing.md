# Goal 5 — Automated Testing (next after Goal 2)

## Scope

Add comprehensive automated tests before building the Expo app (Goal 3).

## Test layers

| Layer | Tool | What to test |
|-------|------|--------------|
| **Unit** | Jest | Services (`services/*.js`) — business logic in isolation |
| **API integration** | Jest + Supertest | All `/api/v1/*` endpoints against test MongoDB |
| **Auth flows** | Jest + Supertest | Register, confirm, login, refresh, logout |
| **CRUD flows** | Jest + Supertest | Restaurant → menu item → check-in → rating |

## Setup needed

- `tests/helpers/testDb.js` — connect to `orderenvy_test` database, seed/cleanup
- `tests/helpers/authHelper.js` — create test user, return JWT
- `tests/api/*.test.js` — one file per domain (auth, restaurants, checkin, etc.)

## Acceptance criteria

- `npm test` runs all tests green
- Tests run without external email (mock `sendEmail`)
- Tests run without MapQuest (mock `locationService` or skip geocoding tests)
- CI-ready: `npm test` works with only `DATABASE_URL` and `JWT_SECRET` set

## Priority order

1. Auth service + routes
2. Restaurant + check-in flow (core meal tracking)
3. Ratings, notes, lists
4. Friends, recommendations

## Do not

- Add TypeScript
- Require Vercel deployment to run tests (local supertest only)

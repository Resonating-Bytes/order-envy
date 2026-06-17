# Code Conventions

- **JavaScript only** — use `.js` / `.jsx`. No TypeScript unless explicitly requested.
- **API paths** — kebab-case segments under `/api/v1/`
- **Services** — business logic lives in `services/`, routes stay thin
- **Errors** — throw `Error` with `.status` property; `apiErrorHandler` formats JSON responses
- **Auth** — JWT Bearer tokens for API; legacy EJS still uses Passport sessions

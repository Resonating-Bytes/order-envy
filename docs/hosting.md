# Hosting — Serverless API (Goal 2)

## Local development

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

npm install
npm start
```

API available at `http://localhost:1979/api/v1/health`

The legacy EJS site continues to work at the same port.

## Vercel deployment

1. Install Vercel CLI: `npm i -g vercel`
2. From project root: `vercel`
3. Set environment variables in Vercel dashboard (or `vercel env add`):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `SESSION_SECRET`
   - `GEO_KEY`
   - `EMAIL`
   - `EMAIL_PASSWORD`
   - `APP_ORIGIN` (your Vercel URL, e.g. `https://orderenvy.vercel.app`)
   - `CORS_ORIGIN` (Expo app origin, or `*` for dev)

4. Deploy: `vercel --prod`

API will be at `https://<your-app>.vercel.app/api/v1/health`

## Cold start comparison

| Host | Idle cost | Typical wake time |
|------|-----------|-------------------|
| Render free | $0 | 30–60s |
| Vercel serverless | $0 at low traffic | ~1–3s |

## Architecture

- `api/index.js` — Vercel serverless entry point
- `api/createApp.js` — Express API app (also mounted locally at `/api`)
- `routes/api/v1/` — JSON route handlers
- `services/` — Business logic extracted from EJS routes
- `lib/mongoose.js` — Connection cache for serverless warm starts

## Notes

- MongoDB Atlas M0 (free) works unchanged
- Email flows still use Gmail SMTP via nodemailer
- Geocoding uses MapQuest API (server-proxied to protect `GEO_KEY`)

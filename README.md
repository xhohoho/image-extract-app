# Image Extract App

Upload an image, store it in Cloudflare R2, and use Google Gemini to extract structured data into Cloudflare D1.

## Stack
- Next.js (App Router) deployed on Cloudflare Pages via `@cloudflare/next-on-pages`
- Cloudflare R2 for image storage
- Cloudflare D1 for metadata + extracted data
- Google Gemini API for AI extraction

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create Cloudflare resources
```bash
# Create R2 bucket
wrangler r2 bucket create image-extract-bucket

# Create D1 database
wrangler d1 create image-extract-db
```

Copy the `database_id` from the output into `wrangler.toml`.

### 3. Run migrations
```bash
npm run db:migrate:local   # for local dev
npm run db:migrate:remote  # for production
```

### 4. Set secrets
```bash
wrangler pages secret put GEMINI_API_KEY
```

Get a free Gemini API key at https://aistudio.google.com/app/apikey

### 5. Local development
```bash
npm run dev
```

### 6. Deploy
```bash
npm run deploy
```

## Project structure
```
src/
  app/
    page.tsx              # Upload UI
    api/
      upload/route.ts     # Upload image -> R2, create D1 record
      extract/route.ts     # Send image to Gemini, save extracted JSON
      results/route.ts     # List all records
  lib/
    env.ts                 # Cloudflare bindings (R2, D1, secrets)
    r2.ts                  # R2 helpers
    d1.ts                  # D1 helpers
    gemini.ts              # Gemini API call
migrations/
  0001_init.sql            # D1 schema
wrangler.toml               # Cloudflare bindings config
```

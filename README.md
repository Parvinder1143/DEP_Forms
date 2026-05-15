# Institute Forms App

Next.js project scaffolded for digitalizing institute forms with:

- Next.js (App Router, TypeScript, Tailwind)
- Supabase Postgres (current SQL source)
- Prisma (client + schema + migration workflow ready)

## 1) Install

Dependencies are already installed in this workspace. If needed later:

```bash
npm install
```

## 2) Environment Variables

Create a local env file:

```bash
cp .env.example .env
```

Set both URLs from Supabase in `.env`:

- `DATABASE_URL`: pooled/transactional URL (usually port `6543`)
- `DIRECT_URL`: direct DB URL for migrations (usually port `5432`)

For password reset via Supabase OTP, also set:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

For custom OTP login email delivery (Nodemailer), set:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## 3) Prisma Commands

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## 4) Run the App

```bash
npm run dev
```

Open `http://localhost:3000`.

## 5) Add Existing Migrations Later

When you bring the migration files generated externally:

1. Put them under `prisma/migrations/`.
2. Ensure `prisma/schema.prisma` matches your actual schema.
3. Run `npm run prisma:generate`.
4. If needed, run `npm run prisma:migrate` against your migration strategy.

## Project Notes

- Prisma singleton client is in `src/lib/prisma.ts`.
- Current schema uses PostgreSQL datasource with `DATABASE_URL` and `DIRECT_URL`.
- You can now start building the 5 form modules in `src/app` routes.

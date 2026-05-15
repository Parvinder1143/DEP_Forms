# Institute Forms App

Next.js project scaffolded for digitalizing institute forms with:

- Next.js (App Router, TypeScript, Tailwind)
- Supabase Postgres (current SQL source)
- Prisma (client + schema + migration workflow ready)

---

# 1) Install

Dependencies are already installed in this workspace. If needed later:

```bash
npm install
```

---

# 2) Environment Variables

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

---

# 3) Prisma Commands

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

---

# 4) Run the App

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

# 5) Default System Admin Credentials

Use the following credentials to access the System Admin dashboard:

```txt
Email: admin@iitrpr.ac.in
Password: 123456
```

---

# 6) Accessing Different Dashboards

To explore role-based dashboards and workflow queues:

1. Sign up using a non IIT Ropar domain email(external) OR
2. Sign up using an IIT Ropar domain email (`@iitrpr.ac.in`).
3. Fill in your preferred role during signup.
4. Login using the System Admin account.
5. Approve the signup request from the Admin Dashboard.
6. Login again using the approved account.

Supported roles include:

- Dean
- Student
- Intern
- Registrar
- External Entity
- Etc

> Note:
> External entities are restricted to filling only 2 forms.

---

# 7) Dynamic Workflow Visualisor

The application includes a Dynamic Workflow Visualisor that allows you to:

- View form routing queues
- Inspect approval flow
- Observe delegation handling
- Track role-based workflow transitions
- Test different approval hierarchies and queues

You can experiment with different roles and form states after approval from the admin dashboard.

---

# 8) Add Existing Migrations Later

When you bring the migration files generated externally:

1. Put them under `prisma/migrations/`.
2. Ensure `prisma/schema.prisma` matches your actual schema.
3. Run:

```bash
npm run prisma:generate
```

4. If needed, run:

```bash
npm run prisma:migrate
```

against your migration strategy.

---

# Project Notes

- Prisma singleton client is in `src/lib/prisma.ts`.
- Current schema uses PostgreSQL datasource with `DATABASE_URL` and `DIRECT_URL`.
- You can now start building the 5 form modules in `src/app` routes.
- Role requests require admin approval before dashboard access is granted.
- Workflow queues dynamically change based on role delegation and approval hierarchy.

# TerraNova

**An open preprint server for the Earth and environmental sciences.**

TerraNova is a complete, self-hostable web application where researchers create
an account, submit research papers as preprints (PDF + metadata), and have them
published to a public, searchable archive after a moderator approves them. It is
a fully functional product — not a demo — with a built-in moderation dashboard
for the site owner.

## Features

- **Public archive** — browse, search, filter by subject, and paginate published
  preprints; each has a permanent page, abstract, metadata, citation, and PDF.
- **Author accounts** — register, sign in, submit preprints, and track their
  moderation status from a personal dashboard.
- **PDF submissions** — title, authors, abstract, subject area, license,
  keywords, and a validated PDF upload (max 30 MB).
- **Moderation workflow** — every submission starts as `PENDING`. A moderator
  reviews it and can **publish**, **reject** (with a note sent to the author), or
  **unpublish**. Only published preprints are publicly visible.
- **Role-based access** — a single admin/moderator role, granted automatically to
  the configured `ADMIN_EMAIL`.
- **Secure by default** — hashed passwords (bcrypt), signed httpOnly session
  cookies (JWT), PDF content sniffing, and access-controlled file downloads.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for the design system
- [Prisma](https://www.prisma.io/) ORM with SQLite (swap the datasource for
  Postgres/MySQL in production)
- Local filesystem storage for uploaded PDFs

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (copy and edit)
cp .env.example .env
#   - set SESSION_SECRET to a long random string
#   - set ADMIN_EMAIL to the moderator's email

# 3. Create the database
npx prisma migrate deploy   # or: npx prisma migrate dev

# 4. Create the moderator account
npm run db:seed

# 5. Run it
npm run dev                 # development at http://localhost:3000
# or for production:
npm run build && npm start
```



Once signed in as the moderator, open the **Moderation dashboard** from the user
menu (or visit `/admin`) to review, publish, and reject submissions.

## Environment variables

| Variable               | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `DATABASE_URL`         | Prisma datasource (defaults to SQLite `dev.db`)        |
| `SESSION_SECRET`       | Secret used to sign session cookies — **change this**  |
| `ADMIN_EMAIL`          | Email granted moderator privileges automatically       |
| `ADMIN_PASSWORD`       | Optional password used when seeding the admin account  |
| `UPLOAD_DIR`           | Directory where uploaded PDFs are stored               |
| `NEXT_PUBLIC_SITE_URL` | Public site URL used in metadata                       |

## Project structure

```
prisma/
  schema.prisma        # User + Preprint data models
  seed.ts              # Provisions the moderator account
src/
  app/                 # Routes (pages + API handlers)
    api/               #   auth, preprints, files, account, admin moderation
    admin/             #   moderation dashboard
    browse/            #   public archive + search
    preprint/[slug]/   #   preprint detail page
    submit/            #   submission form
    dashboard/         #   author's submissions
  components/          # UI components
  lib/                 # db, session/auth, storage, utils, constants
data/uploads/          # stored PDF files (gitignored)
```

## Notes for production

- Set a strong `SESSION_SECRET` and serve over HTTPS (cookies are marked
  `secure` automatically in production).
- SQLite is fine for small deployments; for scale, point `DATABASE_URL` at
  Postgres and update `prisma/schema.prisma`'s `provider`, then re-run migrate.
- Uploaded PDFs live on local disk under `UPLOAD_DIR`. For multi-instance or
  serverless hosting, switch `src/lib/storage.ts` to an object store (e.g. S3).

---

Preprints posted to TerraNova are not peer-reviewed. Moderation is a suitability
check, not a scientific endorsement.

# Dari-MVP

A working MVP of a digital real estate registry, modelled on the Abu Dhabi DARI platform. It replicates the three services the business runs on: registering property transactions, protecting off-plan buyers with escrow, and issuing verifiable ownership certificates.

Built end to end with an AI coding agent in one working session. See [BUILD_LOG.md](BUILD_LOG.md) for the timeline.

> Demonstration product. Payments and UAE Pass login are simulated. Not affiliated with any government entity.

![Landing page](docs/screenshots/landing.png)

## The three core features

| Feature | Who uses it | What it does |
| --- | --- | --- |
| Transaction registration | Owners, developers, registry reviewers | Five-step wizard (property, parties, contract, documents, review and pay) with live fee calculation and mock payment. Reviewers approve, reject or return with comments. Approval transfers ownership and issues a certificate. |
| Off-plan projects and escrow | Developers, buyers, reviewers | Developers register projects; approval opens an escrow account and creates units. Buyer down payments and installments flow into escrow. Money is released to the developer only when a reviewer approves a construction milestone report. |
| Ownership and certificates | Owners, banks, the public | Property portfolio, instant title deed and ownership certificates, reviewer-approved valuation certificates, PDF with QR code, public verification page and API. |

Also included: English and Arabic with full right-to-left layout, role-based access, an application history timeline, and a JSON REST API.

## How the pieces fit

```mermaid
flowchart LR
  owner[Owner] --> wizard[Transaction wizard]
  developer[Developer] --> wizard
  developer --> projects[Projects and milestones]
  owner --> certs[Certificates]
  owner --> deposits[Escrow installments]
  reviewer[Registry reviewer] --> queue[Review queue]
  wizard --> queue
  projects --> queue
  queue -->|approve sale| transfer[Ownership transfer]
  transfer --> issue[Certificate issued]
  transfer -->|off-plan| inflow[Escrow inflow]
  queue -->|approve milestone| outflow[Escrow release]
  issue --> verify[Public verify page and QR]
```

## Tech stack

- Next.js 15 (App Router, React Server Components, Server Actions), TypeScript in strict mode
- Tailwind CSS v4, using the DARI colour palette and the Tajawal typeface
- PostgreSQL with Prisma ORM (Neon in production, embedded PGlite for local development)
- Zod validation, signed JWT sessions with `jose`, PDF generation with `pdf-lib` and `qrcode`
- Vitest unit tests and a bash end-to-end API smoke test

Business rules live in `src/server/*` and are shared by the UI (server actions) and the REST API, so both paths enforce the same checks.

```
src/
  app/(app)/        authenticated pages: dashboard, services, applications, review, properties, certificates, projects, escrow
  app/api/v1/       REST API
  app/verify/       public certificate verification
  server/           domain services: applications, certificates, escrow, pdf
  lib/              fees, workflow state machine, session, i18n, formatting
prisma/             schema and demo seed
```

## Demo personas

| Persona | Role | Try this |
| --- | --- | --- |
| Ahmed Al Mansoori | Property owner | Sell the Al Reem apartment to Fatima (Emirates ID `784-1990-7654321-2`), request a title deed, pay an escrow installment |
| Fatima Al Hashimi | Buyer | See properties appear in her portfolio after a sale is approved |
| Omar Haddad | Developer | Sell an off-plan unit, register a new project, submit the milestone 2 progress report |
| Mariam Al Dhaheri | Registry reviewer | Approve, return or reject applications, approve projects and escrow releases |

## A five-minute pitch script

1. Open the landing page and verify certificate `CRT-202611-000001`. That is the trust layer banks use.
2. Log in as Ahmed and start a sell/purchase registration. Pick the Reem apartment, look up Fatima by Emirates ID, enter AED 1,900,000 and watch the fees compute. Use the sample files and pay.
3. Log in as Mariam. The application is in the queue with automatic checks: seller owns the property, price is in market range, fees paid. Return it with a comment, then show Ahmed resubmitting without paying again, then approve. The timeline shows every step.
4. Log in as Fatima. The apartment is now hers, with a new title deed and a QR code.
5. Log in as Omar and open Saadiyat Grove Residences. Escrow balance, buyer deposits and milestones are on one screen. Submit the milestone 2 report.
6. Back as Mariam, approve the milestone. Thirty percent of deposits is released to the developer, and the ledger and completion bar update.
7. Switch to Arabic to show the full right-to-left interface.

## Run locally

Requires Node.js 20+. No Docker needed; the database is an embedded Postgres.

```bash
npm install
cp .env.example .env    # then use the local values below
npm run db:local        # terminal 1: Postgres on port 5433
npm run db:push && npm run db:seed
npm run dev             # terminal 2: http://localhost:3000
```

Local `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable&connection_limit=1&pgbouncer=true"
DATABASE_URL_UNPOOLED="postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable&connection_limit=1"
SESSION_SECRET="any-long-random-string"
```

Checks:

```bash
npm run typecheck && npm run lint && npm test
./scripts/smoke.sh      # full API walkthrough of all three features against a freshly seeded DB
```

## REST API

All responses use `{ "data": ... }` or `{ "error": { "message", "status" } }`. Authenticate with a bearer token:

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/v1/auth/demo-login \
  -H 'content-type: application/json' -d '{"email":"ahmed@demo.dari-mvp.ae"}' | jq -r .data.token)
curl -s localhost:3000/api/v1/properties -H "authorization: Bearer $TOKEN"
```

| Method | Path | Role |
| --- | --- | --- |
| GET | `/api/v1/health` | public |
| GET | `/api/v1/fees?type=SELL_PURCHASE&price=2000000` | public |
| GET | `/api/v1/certificates/:number` | public verification |
| POST | `/api/v1/auth/demo-login` | public |
| GET | `/api/v1/me` | any |
| GET | `/api/v1/properties[?eligibleFor=FIRST_SALE\|SELL_PURCHASE]` | owner, developer |
| GET, POST | `/api/v1/applications` | list, create draft |
| GET | `/api/v1/applications/:id` | applicant, buyer, reviewer |
| PUT | `/api/v1/applications/:id/steps/{property\|parties\|contract\|documents}` | applicant |
| POST | `/api/v1/applications/:id/submit` | applicant (pays fees) |
| POST | `/api/v1/applications/:id/review` | reviewer: `APPROVE`, `REJECT`, `RETURN` |
| GET, POST | `/api/v1/certificates` | owner |
| GET, POST | `/api/v1/projects` | developer, reviewer |
| GET | `/api/v1/projects/:id` | developer, reviewer |

## Deploy (Vercel and Neon)

1. Create a Neon Postgres database, either at neon.tech or through the Vercel Marketplace integration.
2. Import the GitHub repo in Vercel and add `SESSION_SECRET` (the Neon integration adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you).
3. Load the schema and demo data once from your machine:
   `DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx prisma db push && npm run db:seed`
4. Deploy. Run `npm run db:seed` again any time to reset the demo.

## Fee rules (mock)

| Service | Fee |
| --- | --- |
| Off-plan first sale | 1% of price (min AED 500) + AED 200 admin |
| Sell/purchase | 2% of price (min AED 500) + AED 200 admin + AED 250 title deed |
| Title deed / ownership / valuation certificate | AED 250 / 100 / 500 |

Escrow releases per milestone: 15% at foundation (20% built), 30% at superstructure (50%), 30% at MEP and finishing (80%), and 25% at handover (100%).

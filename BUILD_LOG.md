# Build log

Dari-MVP was built end to end by one developer working with an AI coding agent (Cursor) in a single session. The agent analysed the original DARI frontend codebase and public service catalogue, then planned, coded, tested and deployed the MVP. The developer set the direction and approved the plan.

All times are on 9 November 2026, PKT (UTC+5).

| Time | Milestone |
| --- | --- |
| 15:39 | Plan approved. Project folder and git repository created |
| 15:43 | Next.js 15, TypeScript, Tailwind v4 and Prisma scaffolded |
| 15:46 | Embedded Postgres running locally. Schema with 11 models pushed |
| 15:49 | Domain services written: transaction workflow, fee engine, certificates, escrow |
| 15:50 | Seed script with realistic Abu Dhabi demo data |
| 15:52 | Design system: DARI palette, Tajawal font, logo, app shell, EN/AR with RTL |
| 15:54 | Feature 1: five-step transaction wizard, mock payment, reviewer queue, history timeline |
| 15:55 | Feature 3: property portfolio, certificate requests, PDF with QR code, public verification |
| 15:56 | Feature 2: project registration, escrow ledger, milestone reports and releases, buyer installments |
| 15:58 | REST API (`/api/v1`, 14 endpoints) with bearer-token auth |
| 15:59 | Typecheck, lint and 13 unit tests passing |
| 16:00 | End-to-end API smoke test of all three features passing. All 24 pages render for every persona |
| 16:04 | Production build passing (33 routes). Browser QA of the UI flows started |
| 16:04 to 16:30 | Waiting on the developer to sign in to GitHub and Vercel and accept the Neon terms |
| 16:31 | GitHub repository created and pushed |
| 16:33 | Vercel project linked. Neon Postgres provisioned through the Vercel Marketplace. Schema pushed and demo data seeded |
| 16:37 | Live on Vercel. End-to-end smoke test passing against production |

## Totals

- Plan approved to live production URL: 58 minutes, including about 26 minutes waiting on account sign-ins
- Agent working time: about 32 minutes
- Planning to production-ready build: about 25 minutes of agent time
- Size: about 5,400 lines of TypeScript and TSX across 69 source files, 11 database models, 33 routes
- Quality gates: strict TypeScript, ESLint, Vitest unit tests, a scripted end-to-end API test, browser QA

## How the work was split

| Developer | AI agent |
| --- | --- |
| Chose the client and the target features | Read the 59-module legacy React codebase and the live service catalogue to find the core business flows |
| Picked the stack and hosting | Wrote the plan, data model, business rules, UI, API, tests and docs |
| Reviewed and approved the plan | Ran the checks, debugged problems (Prisma prepared statements on PGlite, Tailwind v4 utilities) and fixed them |
| Authenticated GitHub, Vercel and the database | Set up the repository, deployment and seed data |

# Forge CDL ELDT Platform

Multi-tenant education software foundation for independent CDL schools. Everything currently included is for demonstration and development only. It is not approved curriculum and is not authorization to provide regulated training.

## Prerequisites

- Node.js 20.9 through 24
- pnpm 10.28.1 (via Corepack)
- Docker-compatible runtime and Supabase CLI for the standard local database workflow, **or** PostgreSQL plus `psql` and a `DATABASE_URL` for database-only tests

## Setup

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
supabase start
supabase db reset
pnpm dev
```

Open `http://localhost:3000`. Local Supabase prints development-only project values for `.env.local`; never commit that file or a service-role key.

## Checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:db
pnpm build
```

To test an already-running PostgreSQL database directly:

```bash
DATABASE_URL=postgresql://localhost/forge_test pnpm test:db
```

The database test script applies a Supabase-compatible auth bootstrap, the migrations, fake seed, and real RLS assertions. This validates PostgreSQL behavior; it does not by itself validate hosted Supabase Auth, JWT issuance, or the REST API.

## Documentation

- `ARCHITECTURE.md` — system boundaries and permanent decisions
- `DATABASE.md` — data ownership, constraints, and migrations
- `SECURITY.md` — threat model and verification standard
- `TODO.md` — phased delivery checklist
- `AGENTS.md` — mandatory contributor rules

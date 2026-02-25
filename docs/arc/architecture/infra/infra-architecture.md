# DVT+ Local Infra + API Readiness (Dev Baseline)

## Scope

This document describes the **local development** baseline:

- PostgreSQL runs in Docker Compose.
- API exposes `/health` and `/db/ready`.
- Frontend remains decoupled and calls API over HTTP(S).

## Local runtime diagram

```mermaid
flowchart TB
  subgraph DevMachine["Developer Machine"]
    subgraph Docker["Docker Compose"]
      PG["Postgres 16\n(dvt-postgres)"]
    end

    API["Node.js API (Fastify)"]
    WEB["Frontend (React+TS)"]
  end

  WEB -->|HTTP(S)| API
  API -->|DATABASE_URL| PG
```

## API endpoints

```mermaid
flowchart LR
  Client["Client (browser/curl)"] --> H["GET /health\n{ ok: true }"]
  Client --> R["GET /db/ready\nSELECT 1\n503 if unavailable"]
```

## Deploy target mapping (unchanged)

```mermaid
flowchart TB
  subgraph Vercel["Vercel"]
    FE["Frontend (React)"]
  end

  subgraph Render["Render"]
    API["API (Docker Web Service)"]
    PG["Managed Postgres"]
  end

  FE -->|HTTPS| API
  API --> PG
```

## Sequence: local dev smoke

```mermaid
sequenceDiagram
  participant Dev as Developer
  participant DC as Docker Compose
  participant PG as Postgres
  participant API as Fastify API

  Dev->>DC: up postgres
  DC->>PG: start + healthcheck
  Dev->>API: start dev server
  Dev->>API: GET /db/ready
  API->>PG: SELECT 1
  PG-->>API: ok
  API-->>Dev: { ok: true }
```

## Notes

- `/db/ready` returns **503** when `DATABASE_URL` is missing or the DB is unreachable.
- For production, use **Render Managed Postgres** and set `DATABASE_URL` in Render env vars.

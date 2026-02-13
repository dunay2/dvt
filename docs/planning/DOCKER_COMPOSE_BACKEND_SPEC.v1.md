# DOCKER_COMPOSE_BACKEND_SPEC.v1.md — DVT+ Backend (Node) Dockerization

**Version**: 1.0  
**Date**: 2026-02-13  
**Status**: Normative (MVP)  
**Scope**: Local development + CI smoke (baseline for later Kubernetes)

---

## 0. Executive summary

This specification defines the **Docker Compose baseline** to run the DVT+ backend as **Node services** (API / Planner / Engine) plus the minimum infra dependencies (**Temporal + Postgres**), with an optional **ArtifactStore** via **MinIO (S3-compatible)**.

Goals:

- Reproducible “one command” environment: `docker compose up -d --build`
- CI smoke-ready (stack boots, health endpoints OK)
- Preserve responsibility boundaries (boundary / planning / execution)
- Keep a mechanical migration path to Kubernetes (12-factor alignment)

References:

- Docker Compose docs: https://docs.docker.com/compose/
- Compose Specification: https://compose-spec.io/
- Docker + Node: https://docs.docker.com/language/nodejs/
- Temporal self-hosted (Docker): https://docs.temporal.io/self-hosted-guide/docker
- Temporal docker-compose (reference): https://github.com/temporalio/docker-compose
- Postgres image: https://hub.docker.com/_/postgres
- MinIO containers: https://min.io/docs/minio/container/index.html
- 12-factor app: https://12factor.net/

---

## 1. Non-goals (MVP)

- No production-grade HA/DR for Temporal/Postgres (out of scope)
- No ingress/TLS and production perimeter hardening (out of scope)
- No full observability stack by default (OTel/Prometheus/Grafana optional next phase)

---

## 2. Components and boundaries

### 2.1 Services to dockerize (Node, built from this repository)

- **api**: external boundary (REST/WS), AuthZ/RBAC gateway, orchestrates internal calls
- **planner**: plan generation/validation, capability checks, ordering decisions
- **engine**: execution runtime; Temporal client + workers/activities; persists run state

### 2.2 Dependencies (external images)

- **postgres**: RunStateStore + Outbox persistence
- **temporal**: workflow orchestration backend
- **temporal-ui**: development UI (disabled in CI profile)
- **minio** (optional): S3-compatible ArtifactStore for immutable artifacts

---

## 3. Global view diagram (Docker assets + runtime topology)

> This diagram includes **all Docker-related assets** (Compose + Dockerfile + env) and the **runtime graph**.

```mermaid
flowchart TB
  %% ---------- Docker assets ----------
  subgraph ASSETS["Repository Docker assets"]
    COMPOSE["docker-compose.yml<br/>(profiles: dev, ci)"]
    DOCKERFILE["docker/node-service.Dockerfile<br/>(multi-stage, pnpm workspace)"]
    DOCKERIGNORE[".dockerignore"]
    ENVEX[".env.example"]
    DOCS["docs/ops/docker/DOCKER_COMPOSE_BACKEND_SPEC.v1.md"]
  end

  %% ---------- Built images ----------
  subgraph IMAGES["Images built from this repo"]
    IMG_API["image: dvt-api"]
    IMG_PLANNER["image: dvt-planner"]
    IMG_ENGINE["image: dvt-engine"]
  end

  COMPOSE --> IMG_API
  COMPOSE --> IMG_PLANNER
  COMPOSE --> IMG_ENGINE
  DOCKERFILE --> IMG_API
  DOCKERFILE --> IMG_PLANNER
  DOCKERFILE --> IMG_ENGINE
  DOCKERIGNORE --> COMPOSE
  ENVEX --> COMPOSE
  DOCS --> COMPOSE

  %% ---------- Runtime ----------
  subgraph RUNTIME["docker compose runtime (single network)"]
    NET["network: dvt-backend"]

    PG[("postgres<br/>port: 5432<br/>volume: pg_data")]
    TEMPORAL[("temporal<br/>port: 7233")]
    TUI[("temporal-ui<br/>host: 8088 -> 8080<br/>profile: dev")]
    MINIO[("minio (optional)<br/>ports: 9000/9001<br/>volume: minio_data<br/>profile: dev")]

    API_SVC["api (Node)<br/>port: 8080"]
    PLANNER_SVC["planner (Node)<br/>port: 8081"]
    ENGINE_SVC["engine (Node)<br/>port: 8082"]
  end

  %% images -> services
  IMG_API --> API_SVC
  IMG_PLANNER --> PLANNER_SVC
  IMG_ENGINE --> ENGINE_SVC

  %% network membership (visual cue)
  NET --- PG
  NET --- TEMPORAL
  NET --- TUI
  NET --- MINIO
  NET --- API_SVC
  NET --- PLANNER_SVC
  NET --- ENGINE_SVC

  %% startup dependencies (depends_on intent)
  TEMPORAL --> PG
  TUI --> TEMPORAL
  API_SVC --> PG
  API_SVC --> TEMPORAL
  API_SVC -. "S3 (optional)" .-> MINIO
  PLANNER_SVC --> PG
  ENGINE_SVC --> PG
  ENGINE_SVC --> TEMPORAL

  %% logical runtime calls
  API_SVC -. "HTTP internal" .-> PLANNER_SVC
  API_SVC -. "HTTP internal" .-> ENGINE_SVC
  ENGINE_SVC -. "Temporal gRPC" .-> TEMPORAL
```

---

## 4. Profiles (dev vs ci)

Profiles minimize noise and exposure in CI.

### 4.1 dev profile (default for local)

- Enables: `temporal-ui`, `minio`
- Publishes developer ports (api 8080, temporal-ui 8088, minio 9000/9001, optional postgres 5432)

### 4.2 ci profile

- Disables: `temporal-ui`
- May disable: `minio` (unless smoke requires artifacts)
- Avoid publishing ports unless the CI job needs them (often only `api`)

```mermaid
flowchart LR
  DEV["profile: dev"] --> DEV_SET["postgres + temporal + api + planner + engine + temporal-ui + minio(optional)"]
  CI["profile: ci"] --> CI_SET["postgres + temporal + api + planner + engine<br/>temporal-ui: disabled<br/>minio: optional"]
```

---

## 5. Port matrix (MVP defaults)

| Service     | Container port | Host port (dev) | Notes        |
| ----------- | -------------: | --------------: | ------------ |
| api         |           8080 |            8080 | main entry   |
| planner     |           8081 | 8081 (optional) | debug        |
| engine      |           8082 | 8082 (optional) | debug        |
| postgres    |           5432 | 5432 (optional) | local tools  |
| temporal    |           7233 | 7233 (optional) | SDK/debug    |
| temporal-ui |           8080 |            8088 | dev UI       |
| minio       |    9000 / 9001 |     9000 / 9001 | S3 + console |

---

## 6. Configuration (12-factor)

### 6.1 Common env vars (Node services)

All Node services MUST accept configuration via env vars.

- `NODE_ENV=development|production`
- `PORT`
- `DATABASE_URL=postgresql://USER:PASS@postgres:5432/DB`

### 6.2 Temporal

- `TEMPORAL_ADDRESS=temporal:7233`

### 6.3 Artifacts (MinIO)

- `ARTIFACT_S3_ENDPOINT=http://minio:9000`
- `ARTIFACT_S3_ACCESS_KEY=...`
- `ARTIFACT_S3_SECRET_KEY=...`
- `ARTIFACT_S3_BUCKET=dvt-artifacts` (default)

### 6.4 .env.example (required)

The repository MUST include `.env.example` with safe defaults for local dev (no real secrets).

---

## 7. Compose contract (files and locations)

### 7.1 Required files

- `docker-compose.yml` (repo root) **or** `docker/compose/docker-compose.yml` (if standardized)
- `docker/node-service.Dockerfile`
- `.dockerignore`
- `.env.example`
- `docs/ops/docker/DOCKER_COMPOSE_BACKEND_SPEC.v1.md`

### 7.2 Reference compose snippet (informative)

> Implementation MAY differ, but MUST meet the requirements in this spec.

```yaml
name: dvt-backend

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dvt
      POSTGRES_PASSWORD: dvt
      POSTGRES_DB: dvt
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U dvt -d dvt']
      interval: 5s
      timeout: 3s
      retries: 20

  temporal:
    image: temporalio/auto-setup:latest
    environment:
      DB: postgresql
      DB_PORT: 5432
      POSTGRES_USER: dvt
      POSTGRES_PWD: dvt
      POSTGRES_SEEDS: postgres
    depends_on:
      postgres:
        condition: service_healthy

  temporal-ui:
    image: temporalio/ui:latest
    profiles: ['dev']
    environment:
      TEMPORAL_ADDRESS: temporal:7233
    depends_on:
      - temporal
    ports:
      - '8088:8080'

  minio:
    image: minio/minio:latest
    profiles: ['dev']
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio12345
    volumes:
      - minio_data:/data
    ports:
      - '9000:9000'
      - '9001:9001'

  api:
    build:
      context: .
      dockerfile: docker/node-service.Dockerfile
      args:
        SERVICE_PATH: packages/api
    environment:
      PORT: 8080
      DATABASE_URL: postgresql://dvt:dvt@postgres:5432/dvt
      TEMPORAL_ADDRESS: temporal:7233
      ARTIFACT_S3_ENDPOINT: http://minio:9000
      ARTIFACT_S3_ACCESS_KEY: minio
      ARTIFACT_S3_SECRET_KEY: minio12345
    depends_on:
      postgres:
        condition: service_healthy
      temporal:
        condition: service_started
    ports:
      - '8080:8080'
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://localhost:8080/healthz >/dev/null 2>&1']
      interval: 5s
      timeout: 3s
      retries: 20

  planner:
    build:
      context: .
      dockerfile: docker/node-service.Dockerfile
      args:
        SERVICE_PATH: packages/planner
    environment:
      PORT: 8081
      DATABASE_URL: postgresql://dvt:dvt@postgres:5432/dvt
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://localhost:8081/healthz >/dev/null 2>&1']
      interval: 5s
      timeout: 3s
      retries: 20

  engine:
    build:
      context: .
      dockerfile: docker/node-service.Dockerfile
      args:
        SERVICE_PATH: packages/engine
    environment:
      PORT: 8082
      DATABASE_URL: postgresql://dvt:dvt@postgres:5432/dvt
      TEMPORAL_ADDRESS: temporal:7233
    depends_on:
      postgres:
        condition: service_healthy
      temporal:
        condition: service_started
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://localhost:8082/healthz >/dev/null 2>&1']
      interval: 5s
      timeout: 3s
      retries: 20

volumes:
  pg_data:
  minio_data:
```

---

## 8. Standard Dockerfile (Node service, monorepo pnpm)

Requirements:

- MUST be multi-stage
- MUST support filtered builds by package (`SERVICE_PATH`)
- MUST run as non-root at runtime
- SHOULD copy only `dist/` + minimal metadata to runtime

Reference (informative):

```dockerfile
# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
RUN pnpm -w install --frozen-lockfile

FROM deps AS build
ARG SERVICE_PATH
RUN pnpm -w --filter "./${SERVICE_PATH}" build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
USER nodeuser

ARG SERVICE_PATH
COPY --from=build /repo/${SERVICE_PATH}/dist ./dist
COPY --from=build /repo/${SERVICE_PATH}/package.json ./package.json

EXPOSE 8080
CMD ["node", "dist/index.js"]
```

References:

- Multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Build context & dockerignore: https://docs.docker.com/build/building/context/

---

## 9. .dockerignore (required)

The repository MUST include a `.dockerignore` excluding at least:

- `**/node_modules`
- `.git`
- large build outputs not needed in build context (e.g., `**/.turbo`, `**/.next`, `**/dist` depending on strategy)
- test artifacts and OS junk files

Reference:

- https://docs.docker.com/build/building/context/#dockerignore-files

---

## 10. Healthchecks (MVP requirement)

- `postgres`: MUST use `pg_isready`
- `api/planner/engine`: MUST expose `GET /healthz` where:
  - `200` when ready (minimum deps connectable)
  - `>=500` when not ready
- Compose MUST include `healthcheck` probes against the service within the container

Reference:

- https://docs.docker.com/compose/compose-file/05-services/#healthcheck

---

## 11. Volumes (required)

- `pg_data`: persistent Postgres data
- `minio_data`: persistent artifacts data (when enabled)

MUST use named volumes (no anonymous volumes).

---

## 12. Minimum security (dev)

- Local `.env` MUST NOT be committed; only `.env.example` is committed
- Runtime containers MUST run as non-root
- Avoid mounting the entire repo read-write in “production-like” mode (if bind mounts are used for dev, keep them explicit and minimal)
- SHOULD prepare future compatibility with `read_only: true` + `tmpfs` (non-MVP)

Reference:

- https://docs.docker.com/develop/security/

---

## 13. Developer workflow

Expected commands:

- Start (dev): `docker compose --profile dev up -d --build`
- Start (ci): `docker compose --profile ci up -d --build`
- Logs: `docker compose logs -f api`
- Stop: `docker compose down`
- Reset data: `docker compose down -v`

---

## 14. Acceptance criteria

- [ ] `docker compose --profile dev up -d --build` boots the stack and healthchecks pass
- [ ] `curl -f http://localhost:8080/healthz` succeeds
- [ ] Temporal UI is reachable at `http://localhost:8088` (dev)
- [ ] Node services run as non-root
- [ ] `.env.example` exists and the stack runs with it
- [ ] Documentation is present under `docs/ops/docker/`

---

## 15. Future migration to Kubernetes (informative)

This baseline is designed for a mechanical move to k8s:

- same env vars
- same ports
- same health endpoints
- same service boundaries

References:

- Kubernetes concepts: https://kubernetes.io/docs/concepts/
- Temporal on Kubernetes: https://docs.temporal.io/self-hosted-guide/deployment#kubernetes

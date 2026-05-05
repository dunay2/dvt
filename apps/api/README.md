# dvt-api

`dvt-api` is the authenticated HTTP composition root for DVT.

It owns:

- HTTP route registration
- request parsing and canonical rejection shaping
- auth and tenant-scope checks at the API boundary
- composition of planner, engine, delivery, and adapter dependencies
- operational routes such as health, readiness, version, and admin rebuild

It does not own run lifecycle semantics. Those remain in `@dvt/engine` and the
relevant adapters.

## Local component guides

- [Start-run HTTP entrypoint component](./docs/start-run-http-entrypoint-component.md)
- [Start-run control boundary component](./docs/start-run-control-boundary-component.md)
- [Start-run platform identity component](./docs/start-run-platform-identity-component.md)
- [HTTP runtime error translation component](./docs/http-runtime-error-translation-component.md)
- [Start-run application component](./docs/start-run-application-component.md)
- [Start-run runtime composition component](./docs/start-run-runtime-composition-component.md)
- [Start-run execution capacity admission component](./docs/start-run-execution-capacity-admission-component.md)
- [Workspace graph draft runtime composition component](./docs/workspace-graph-draft-runtime-composition-component.md)

## Authentication boundary

The authentication and authorization boundary lives across:

- `apps/api/src/domain/auth`
- `apps/api/src/application`
- `apps/api/src/entrypoints/http`
- `apps/api/src/infrastructure/auth`

Tests for that boundary live under `apps/api/test`.

## Local run

```bash
cp .env.example .env
pnpm install
pnpm --filter dvt-api dev
```

- `http://localhost:3000/healthz`
- `http://localhost:3000/readyz`
- `http://localhost:3000/version`

## Deploy notes

`dvt-api` is a monorepo workspace package. Deploy from the repository root so
`workspace:*` dependencies resolve through `pnpm`.

Canonical commands:

```bash
pnpm install --frozen-lockfile --filter dvt-api...
pnpm --filter dvt-api build
pnpm --filter dvt-api start
```

### Railway

1. Push the repo to GitHub.
2. Create a new Railway project from the repository root.
3. Use the repository-root `nixpacks.toml`; Railway/Nixpacks applies it from
   the app root. `apps/api/nixpacks.toml` is kept aligned for explicit
   service-directory configuration. If custom commands are required, use:

- build: `pnpm install --frozen-lockfile --filter dvt-api... && pnpm --filter dvt-api build`
- start: `pnpm --filter dvt-api start`

1. Set environment variables:

- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `SERVICE_NAME=dvt-api`
- `CORS_ORIGIN=*` or the allowed origin list

Railway injects `PORT` automatically.

### Render

1. Push the repo to GitHub.
2. Create a new Web service in Render from the repository root.
3. Set commands:

- build: `pnpm install --frozen-lockfile --filter dvt-api... && pnpm --filter dvt-api build`
- start: `pnpm --filter dvt-api start`

1. Configure environment variables using `.env.example` as the baseline:

- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `SERVICE_NAME=dvt-api`
- `CORS_ORIGIN=*` or the allowed origin list

Render injects `PORT` automatically and commonly uses `HOST=0.0.0.0`.

### Docker

Build from the repository root so the image can resolve workspace packages:

```bash
docker build -f apps/api/Dockerfile -t dvt-api .
docker run --rm -p 3000:3000 --env-file apps/api/.env dvt-api
```

## Health checks

- liveness: `/healthz`
- readiness: `/readyz`

## Notes

- `nixpacks.toml` pins the Railway build and start posture to repo-root
  `pnpm` commands.
- `apps/api/nixpacks.toml` mirrors the root Nixpacks config for platforms that
  are explicitly pointed at the API service directory.
- TypeScript is strict and local docs for subcomponents live under `apps/api/docs/`.

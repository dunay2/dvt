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
- [HTTP runtime error translation component](./docs/http-runtime-error-translation-component.md)
- [Start-run application component](./docs/start-run-application-component.md)
- [Start-run execution capacity admission component](./docs/start-run-execution-capacity-admission-component.md)

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

### Railway

1. Push the repo to GitHub.
2. Create a new Railway project from the repository.
3. Set environment variables:

- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `SERVICE_NAME=dvt-api`
- `CORS_ORIGIN=*` or the allowed origin list

Railway injects `PORT` automatically.

### Render

1. Push the repo to GitHub.
2. Create a new Web service in Render from this repository.
3. Configure environment variables using `.env.example` as the baseline:

- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `SERVICE_NAME=dvt-api`
- `CORS_ORIGIN=*` or the allowed origin list

Render injects `PORT` automatically and commonly uses `HOST=0.0.0.0`.

## Health checks

- liveness: `/healthz`
- readiness: `/readyz`

## Notes

- `nixpacks.toml` pins the Railway build and start posture.
- TypeScript is strict and local docs for subcomponents live under `apps/api/docs/`.

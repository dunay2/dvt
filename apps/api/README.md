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

## Architecture and design

Architecture, component placement, command/query rails, relations, evidence,
and document lifecycle are owned by Planning DB. Query that authority before
using repository documents for design work:

```bash
pnpm planning:db:query architecture-designs --limit 100 --no-refresh
pnpm planning:db:query component-profile --component SYS-API-ROOT --no-refresh
pnpm planning:db:query command-query-rails --filter API --no-refresh
pnpm planning:db:query documentation-lifecycle --component SYS-API-ROOT --no-refresh
```

The authored architecture entry is
[`docs/architecture/components/api/index.md`](../../docs/architecture/components/api/index.md).
Generated file, component, test, and traceability views are disposable outputs
assembled only by the explicit `pnpm docs:publish` command.

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

### Optional local data setup

`DVT_LOCAL_DATA_ENABLED=false` is the default. Opt-in requires an absolute,
operator-provisioned, service-owned POSIX mode-0700 `DVT_LOCAL_DATA_ROOT`,
separate from and not nested with `DVT_WORKSPACE_FILES_ROOT`. Enabled Windows
configuration fails closed: POSIX permission checks cannot establish Windows
ACL privacy. Do not enable it there as a way to obtain LOCAL Preview.

Use [`.env.example`](.env.example) to supply explicit positive memory, thread,
spill, open-workspace and concurrent-session budgets before enabling the
option. Memory and spill settings apply per instance, not per session or as
hard RSS limits; retain process/container memory and disk limits.

The protected runtime composes internal capture and exact-generation metadata
ports with the current authorization service, catalog and credential resolver.
Capture is capped at 100000 rows, 16 MiB logical bytes, 1024 rows per pull and
60000 ms. PostgreSQL bigint, boolean and text/varchar (including nullable values)
are admitted; other types fail closed. No HTTP trigger, LOCAL analytical execution
or Preview is exposed. Disabled configuration exposes neither capability.

For the built service, pnpm --dir apps/api start:local selects the private-creation
preload before native modules load and sets process umask 0077. This affects ALL
newly created API files and children, including logs and authoring artifacts.
Custom launchers need equivalent private creation policy. Existing files are
never chmodded or repaired. Reconcile shared-artifact requirements and inherited
ACLs before selecting this entrypoint.

The native driver is pinned in `package.json` and the generated lockfile.
Driver upgrades require dependency review and rerunning the actual native
security, persistence/reopen, session-isolation and shutdown tests on a
supported POSIX host; Windows fail-closed tests are not that positive proof.

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
- TypeScript is strict; source and test topology are discovered from Git and
  Planning DB rather than maintained in local component maps.

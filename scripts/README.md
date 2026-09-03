# Script Utilities

This directory contains repository utilities for validation, documentation
generation, contract governance, and operator preflight workflows.

## Operator and PR Workflow

### `hygiene.ps1`

Canonical repo hygiene and PR-preflight entrypoint.

What it does:

- fetches and prunes remotes unless `-SkipFetch` is set
- reports branch ahead/behind state, `git cherry` supersession signal, and
  changed-file previews
- supports shared PR preflight with `-Preflight`
- supports custom slice validation with `-SliceCommand`
- summarizes PR checks with `-PrCheckSummary`
- performs first-red CI log triage with `-LogFirstTriage`
- retains the legacy `-RunSliceChecks` and `-RunChecks` modes

Usage examples:

```powershell
# diagnostics only
powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main

# shared PR preflight for the affected scope
powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -Preflight

# shared PR preflight for a specific validation slice
powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -Preflight -SliceCommand "pnpm test:ci-tools"

# summarize the current branch PR checks
powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -PrCheckSummary

# fail fast when the current branch PR has failed or pending Actions checks
pnpm pr:checks

# extract the first failing GitHub Actions job snippet for the current branch PR
powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -LogFirstTriage

# remove superseded branches explicitly
powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -DeleteLocalSuperseded -DeleteRemoteSuperseded -Yes
```

Implementation notes:

- `-Preflight` runs the selected slice checks, then `pnpm fix:changed`, then
  `pnpm verify:prepush`.
- PR check classification and failed-job selection are backed by
  `tools/ci/pr-check-triage.mjs`.
- `pnpm pr:checks` uses the same helper as an immediate non-watch gate:
  exit `1` for failed Actions checks, exit `2` for pending Actions checks, and
  exit `0` only when Actions checks are settled and green. It prints a compact
  text summary by default; use `pnpm pr:checks:json` for the full JSON payload.
- destructive cleanup remains opt-in.

## Changed-file Gates and Autofix

### `skip-pretest-if-ci.cjs`

Lifecycle-hook helper reused by `prebuild`, `pretypecheck`, and `pretest`
scripts that normally build dependency graphs before the main command.

Behavior:

- exits `0` when `DVT_CI=1|true`, so the `|| pnpm ... build` fallback is skipped
- exits `0` when `TURBO_HASH` is present, so `turbo run typecheck` and
  `turbo run test` do not recurse back into package-local dependency builds
- exits `1` otherwise, so local builds keep the normal dependency prebuild path

Use this only when CI already ran an explicit workspace-graph build step before
the guarded command, or when a local operator intentionally runs a warm rebuild
on an already-built worktree.

Safe local warm-build usage:

```powershell
cmd /c "set DVT_CI=1&& pnpm -r build"
```

```bash
env DVT_CI=1 pnpm -r build
```

Guardrail:

- use this only on an already-built worktree or after an explicit graph build
- prefer one-shot command forms that do not leave `DVT_CI` exported in the
  current shell
- do not treat `DVT_CI=1` as a fresh-worktree substitute, because the guarded
  hooks intentionally skip their dependency-build fallback when the variable is
  set

### `skip-prebuild-if-orchestrated.cjs`

Lifecycle-hook helper reused by `prebuild` scripts that should keep direct
package builds safe, but skip redundant dependency graph builds when a
top-level orchestrator already owns the current build.

Behavior:

- exits `0` when `DVT_CI=1|true`, so CI and explicit warm-build flows skip the
  fallback dependency build
- exits `0` when `TURBO_HASH` is present, so `turbo run build` does not recurse
  back into package-local dependency builds
- exits `1` otherwise, so direct package `build` commands still keep their
  fresh-worktree dependency fallback

Use this only for `prebuild` hooks whose dependency closure is now owned by the
root `turbo` build graph.

### `run-turbo-workspace-task.cjs`

Canonical wrapper for governed Turbo workspace tasks used by affected local
commands and lightweight CI matrix lanes.

Usage:

```bash
node scripts/run-turbo-workspace-task.cjs build
node scripts/run-turbo-workspace-task.cjs lint
node scripts/run-turbo-workspace-task.cjs typecheck
node scripts/run-turbo-workspace-task.cjs test
node scripts/run-turbo-workspace-task.cjs build --filter @dvt/engine
```

Behavior:

- only allows the governed task set: `build`, `lint`, `typecheck`, and `test`
- defaults to the affected-work filter `...[origin/main]`
- accepts an explicit `--filter <value>` override for CI/package-targeted runs
- delegates dependency ownership to the Turbo graph, which surfaces
  `TURBO_HASH` inside package-local hooks so `prebuild`/`pretypecheck`/`pretest`
  fallbacks do not re-run the same dependency builds

### `build-workspace-runtime-deps.cjs`

Builds the real workspace runtime dependency closure for a target package while
excluding its `devDependencies`. Optional extra workspace packages can be added
explicitly for integration-only lanes.

Usage:

```bash
node scripts/build-workspace-runtime-deps.cjs @dvt/adapter-temporal
node scripts/build-workspace-runtime-deps.cjs @dvt/adapter-temporal --include-package @dvt/adapter-postgres
node scripts/build-workspace-runtime-deps.cjs @dvt/adapter-temporal --build-self
```

Behavior:

- asks PNPM for the real runtime closure via `pnpm list --filter-prod <pkg>...`
- follows only `dependencies` and `optionalDependencies` as resolved by PNPM
- runs `pnpm ... run build` for the selected runtime closure with
  `--workspace-concurrency=4` and `DVT_CI=1`, so dependency package hooks do
  not recurse again inside the explicit orchestrator
- `--build-self` rebuilds the target package afterward with `DVT_CI=1`, so its
  own `prebuild` hook does not re-run the dependency closure

Intended usage:

- local package hooks keep dependency builds available for direct local runs
- CI workflows call this helper explicitly before integration tests instead of
  relying on implicit `pretest:*` hooks

### `run-local-postgres.cjs`

Local PostgreSQL lifecycle used by the development stack and browser proofs.

Usage:

```bash
pnpm postgres:local:up
pnpm postgres:local:reset
pnpm postgres:local:down
```

Behavior:

- manages `infra/docker/postgres/docker-compose.yml`
- prefers `docker compose` and falls back to `docker-compose` when only the
  standalone Compose binary is available
- waits for the `dvt-postgres` container healthcheck
- verifies the seeded proof baseline after destructive reset
- exposes the canonical local DSN to callers as `defaultPgUrl`
- does not own a runtime execution proof; current DBT, RLS and object-file
  guarantees remain in their dedicated test lanes

### `run-dev-stack.cjs`

Canonical local wrapper for coordinated backend + frontend startup.

Usage:

```bash
node scripts/run-dev-stack.cjs
node scripts/run-dev-stack.cjs --test-only
node scripts/run-dev-stack.cjs --skip-postgres
```

Behavior:

- starts `dvt-api` and `@dvt/web` together with coordinated shutdown
- injects `DVT_READYZ_ENABLED=true` into the API process
- injects `VITE_API_BASE_URL` into the web dev server
- if `DATABASE_URL` is not already configured, bootstraps the canonical local
  Docker Postgres proof environment before starting the API
- exports the canonical local proof DSN as `DATABASE_URL` to the API when local
  bootstrap is used
- starts a local Temporal dev service when the protected runtime is active
  locally and `TEMPORAL_ADDRESS` is not already set
- injects the resulting local Temporal runtime posture plus
  `TEMPORAL_TASK_QUEUE=dvt-temporal` into the API and worker processes
- preserves explicitly configured external `TEMPORAL_ADDRESS` posture instead
  of replacing it with the local dev service
- explicitly builds the runtime workspace dependency closure for
  `dvt-temporal-worker` before starting API, worker, or web processes when the
  protected runtime requires that worker
- starts the API, then `dvt-temporal-worker` with the same Temporal/Postgres
  posture, and waits for the worker's `GET /readyz` probe before starting the
  web dev server
- fails bootstrap explicitly if the Temporal worker exits or never becomes
  ready, instead of allowing the API to surface a generic no-adapters error
- enables `/db/ready` and waits for that probe before declaring the API ready
- `--skip-postgres` leaves database bootstrap disabled and preserves the old
  degraded-local behavior when no `DATABASE_URL` is set; in that posture the
  protected runtime is not locally bootstrapped and the Temporal worker is not
  started

### `check-changed.cjs`

Runs changed-file quality checks against the Git diff baseline. It is used by
`pnpm verify:changed` and as a substep of `pnpm verify:prepush`.

Checks:

- Prettier on changed `js/json/md/yml/yaml` files
- ESLint on changed `ts/tsx/js/jsx` files

Diff policy:

- prefers `origin/main...HEAD` when `origin/main` exists
- falls back to the configured upstream or `HEAD~1..HEAD`

### `verify-changed.cjs`

Runs the fast changed-slice verification plan used during local iteration. It
keeps closeout validation separate and only selects mechanical checks from the
canonical changed-file set.

The shared plan definitions, path predicates, and command execution helper live
in `local-validation-plan.cjs`; this wrapper owns CLI argument parsing, local
changed-file discovery, and operator output.

Always runs:

- changed docs location, filename, frontmatter, ARC, QA, markdown, feature
  mechanization, lint/format, and forbidden-file checks

Adds scoped checks:

- `pnpm planning:db:inventory:check` when planning DB surfaces changed
- adjacent `node --test scripts/<name>.test.cjs` checks for changed planning
  workflow scripts that own a focused test file
- `pnpm test:planning:db` only for planning/governance DB implementation
  surfaces that require the full planning DB suite
- `node --test scripts/verify-changed.test.cjs` when the verifier itself
  changed

Use `pnpm verify:changed -- --dry-run` to print the selected plan without
executing it.

### `verify-prepush.cjs`

Runs the local pre-push closeout wrapper. By default it delegates changed-slice
routing to `pnpm verify:changed` once, so package tests, changed docs checks,
format/lint checks, and developer-workflow self-tests are selected by the same
plan used during iteration.

The Git hook calls `pnpm verify:prepush -- --hook`. A successful manual
`verify:prepush` writes a local `.git` stamp for the current `HEAD`, changed
file set, and diff fingerprint; the hook skips only when that same state
already passed an equivalent or stronger gate.

Use `pnpm verify:prepush -- --full` only when a full local closeout is required.
Full mode adds the prepush-only regression, governance, traceability,
architecture, and type-check groups after the changed-slice gate.

### `type-check-prepush.cjs`

Chooses the strict pre-push type-check path from the changed diff.

Type-check triggers:

- changed `ts/tsx/mts/cts` files
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig*.json`
- `vitest.config.ts`

Behavior:

- skips cleanly when the diff contains no TypeScript-affecting files
- runs `pnpm ci:affected:typecheck` when the relevant diff maps to one or more
  workspace scopes without touching root graph inputs
- runs full `pnpm type-check` when root or cross-workspace TypeScript graph
  inputs changed, or when a relevant file cannot be mapped to a workspace scope

Classification is driven by the shared CI scope policy in `tools/ci/`, so the
strict pre-push gate reuses the same workspace inventory already governing the
affected CI matrix.

### `lint-markdown-changed.cjs`

Runs `markdownlint-cli2` only for changed Markdown files.

Diff policy:

- prefers `origin/main...HEAD` when `origin/main` exists
- falls back to the configured upstream or `HEAD~1..HEAD`

### `format-markdown-changed.cjs`

Runs Prettier `--write` only on changed Markdown files.

Usage:

```bash
pnpm format:md:changed
```

### `fix-changed.cjs`

Applies changed-file autofixes before the verification gate.

What it does:

- runs Prettier `--write` on changed supported text files
- runs ESLint `--fix` on changed JavaScript and TypeScript files
- skips missing files and empty changed-file sets cleanly

Usage:

```bash
pnpm fix:changed
```

## CI Triage Helper

### `../tools/ci/pr-check-triage.mjs`

GitHub CLI-backed helper used by `hygiene.ps1` for PR status inspection.

Capabilities:

- normalize GitHub Actions and external status checks
- print compact PR check gate summaries for operator closeout
- classify checks into failed, pending, successful, skipped, and external
- pick the first failing GitHub Actions check deterministically
- fetch failed-job logs and extract a compact failure snippet

Validation:

```bash
node --test tools/ci/pr-check-triage.test.mjs
pnpm test:ci-tools
```

## Contract and Documentation Validators

### `validate-rfc2119.cjs`

Scans contract Markdown under `docs/architecture/engine/contracts/**` for
lowercase RFC 2119 keywords in prose and reports deterministic findings.

Usage:

```bash
pnpm contracts:rfc2119:validate
```

### `validate-executable-examples.cjs`

Validates TypeScript code fences embedded in contract Markdown docs.

Usage:

```bash
pnpm contracts:examples:validate
```

### `validate-glossary-usage.cjs`

Validates canonical glossary usage in contract Markdown and reports prohibited
synonyms with deterministic `file:line:column` output.

Usage:

```bash
pnpm contracts:glossary:validate
pnpm validate:glossary
```

### `validate-references.cjs`

Validates cross-contract Markdown references, including local target existence
and version-label alignment.

Usage:

```bash
pnpm contracts:references:validate
```

### `validate-idempotency-vectors.cjs`

Validates RunEvents idempotency vectors by recomputing canonical SHA-256
digests from the documented inputs.

Usage:

```bash
pnpm contracts:idempotency:validate
```

## Data and Runtime Utilities

### `db-migrate.cjs`

Runs ordered SQL migrations from
`packages/@dvt/adapter-postgres/migrations/*.sql` and records applied versions
in the target schema.

Usage:

```bash
pnpm db:migrate
```

### `outbox-worker-canary-evidence.ps1`

Captures canary evidence for the standalone outbox worker, including readiness,
metrics, a single trigger path, and an evidence doc under `docs/evidence/`.

## Common Repository Commands

These scripts are typically exercised through package scripts in
[`package.json`](../package.json):

- `pnpm verify:prepush`
- `pnpm docs:sync`
- `pnpm docs:quality:check`
- `pnpm docs:doctor`
- `pnpm docs:canonical:check`
- `pnpm docs:gov:locations`
- `pnpm test:ci-tools`
- `pnpm fix:changed`

## References

- [Testing and CI Capabilities](../docs/guides/testing-and-ci-capabilities.md)
- [PR Preflight And CI Triage](../docs/guides/pr-preflight-and-ci-triage.md)
- [AI Work Protocol](../docs/guides/ai-work-protocol.md)

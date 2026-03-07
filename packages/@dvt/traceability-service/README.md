# @dvt/traceability-service (DVT+)

Traceability governance subsystem implementing **ADR-0000**.

## What this is

A service + CLI (initially CLI-first) that:

- Scans governed files for traceability headers
- Validates ADR existence and `Status: Accepted`
- Generates a traceability manifest (machine-readable)
- Produces deterministic governance output without external graph infrastructure

## Why a service (not just scripts)

Scripts enforce rules in one repo. A service turns traceability into reusable governance:

- Org-wide governance (multi-module / multi-repo)
- Central audit history (optional persistence adapters later)
- Deterministic enforcement in CI

## Quick start (local)

### 1) Install

```bash
pnpm i
pnpm -C packages/@dvt/traceability-service build
```

### 2) Configure

Copy config:

```bash
cp packages/@dvt/traceability-service/traceability.config.example.json traceability.config.json
```

### 3) Run (validate + build manifest)

```bash
pnpm -C packages/@dvt/traceability-service trace validate-and-build-manifest \
  --repoRoot . \
  --component "@dvt/contracts" \
  --componentVersion "1.0.0" \
  --repoSha "local" \
  --config "./traceability.config.json"
```

## CI

See `docs/ci/github-actions.yml`.

## References

- C4 Model: https://c4model.com/

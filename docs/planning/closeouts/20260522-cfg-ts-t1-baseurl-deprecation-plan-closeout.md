---
title: CFG-TS-T1 BaseUrl Deprecation Plan Closeout
status: Accepted
date: 2026-05-22
owner: Runtime / CI / Architecture
planning_type: closeout
task_id: CFG-TS-T1
---

# CFG-TS-T1 BaseUrl Deprecation Plan Closeout

## Outcome

`CFG-TS-T1` is closed by adding the canonical staged migration plan for
TypeScript `baseUrl` retirement. The active tracked `tsconfig*.json` inventory
has no `compilerOptions.baseUrl`; remaining module-resolution risk is explicitly
tracked as `paths` and package-boundary migration work.

## Evidence

- `docs/planning/proposals/mandatory/runtime-and-contracts/cfg-ts-t1-baseurl-deprecation-migration-plan-20260522.md`
- `docs/architecture/typescript-package-classification.md`
- `docs/planning/closeouts/20260318-typescript-package-classification-closeout.md`
- `docs/planning/closeouts/20260318-ts-esm-monorepo-m02-closeout.md`

## Validation

Passed on 2026-05-22:

- `node -e "scan tracked tsconfig*.json and print baseUrl/paths inventory"`
- `pnpm docs:sync`

Final closeout validation for this PR also requires:

- `pnpm governance:refresh`
- `pnpm verify:prepush`

## No-Debt / No-Stub Statement

No TypeScript config was changed. No path alias was removed without a package
boundary or runtime validation slice. No stub, placeholder, fake implementation,
or rule relaxation was introduced.

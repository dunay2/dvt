# refactor: consolidate repository architecture around package boundaries

## Goal

Finish migration and cleanup so all active code paths, tests, and tooling are package-scoped and deterministic.

## Context

The project has completed most monorepo path alignment work, but follow-up tasks remain for lint debt, legacy cleanup, and documentation consistency.

## Scope

1. Finalize lint/type boundary cleanup package-by-package.
2. Remove or explicitly deprecate any remaining legacy top-level code paths.
3. Keep CI and scripts aligned with canonical package paths.
4. Complete final documentation consistency pass.

## Acceptance Criteria

- `pnpm -r lint` passes for targeted packages after debt cleanup.
- `pnpm -r test` passes for packages with test suites.
- No active CI or script references to obsolete top-level paths.
- Strategic documentation reflects current implementation reality.

## Risks

- Hidden references to legacy paths in low-traffic files.
- Lint rule tightening revealing additional pre-existing issues.

## Mitigations

- Apply fixes in small, reviewable commits.
- Validate CI behavior after each path-sensitive change.

## References

- `docs/REPO_STRUCTURE_SUMMARY.md`
- `docs/ARCHITECTURE_ANALYSIS.md`
- `ROADMAP.md`

## WHAT

- Added `RunEventCatalog.v1.md` as a normative alias entrypoint for issue/roadmap naming alignment.
- Updated engine index to reference the new catalog alias alongside existing canonical contracts.

## FOR (goal)

- Close issue #9 with explicit discoverability of the run-event catalog while preserving a single normative source of truth.

## HOW

1. Created `docs/architecture/engine/contracts/engine/RunEventCatalog.v1.md` as an alias document.
2. Mapped issue #9 acceptance coverage to canonical sections in `RunEvents.v1.1.md`.
3. Added index entries in `docs/architecture/engine/INDEX.md`.
4. Ran markdown lint validation.

## WHY

- The repository already contains a comprehensive canonical event contract (`RunEvents.v1.1.md`).
- Creating a thin alias avoids duplicate specifications and semantic drift while satisfying roadmap/issue naming.

## Suitability

- Documentation-only, low-risk alignment work.

## Blockers

- None.

## Opportunities

- Future cleanup can standardize naming between "Catalog" and "RunEvents" in long-tail docs.

## Risk

- Low.

## Risks & Mitigation

- Risk: readers could treat alias as a second source of truth.
- Mitigation: explicit governance rule in alias document stating canonical source remains `RunEvents.v1.1.md`.

## Impact

- Improves contract discoverability and acceptance traceability for roadmap critical path.

## Validation evidence

- `pnpm lint:md` ✅

Closes #9

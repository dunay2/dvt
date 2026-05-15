# WE-HX-3 QA Hardening Task Breakdown

## Purpose

This document expands the QA follow-up work for commit `a87cc142`
(`test(engine): Hardcut WE-HX-3 start-run decomposition`).

The previous QA note identified real issues, but it was not detailed enough to
execute safely. This version defines the target outcome, affected files,
implementation steps, red/green cases, acceptance criteria, and closeout
evidence required to fix the problems.

## Scope

The work applies to the `WE-HX-3-START-RUN-DECOMPOSITION` architecture and
documentation guard only.

The work does not change runtime engine behavior. It hardens the way the repo
proves the WE-HX-3 component documentation and architecture invariants.

## Governing Sources

| Source                                                                                                          | Why it governs this work                                                         |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `AGENTS.md`                                                                                                     | Requires governance-first work, no hidden debt, no stubs, and closeout evidence. |
| `docs/planning/status/governance-document-rule-inventory.md`                                                    | Classifies this as docs plus test infrastructure work.                           |
| `docs/guides/ai-work-protocol.md`                                                                               | Requires doc-driven changes, declared validation, and closeout evidence.         |
| `docs/architecture/command-query-rail-governance.md`                                                            | Keeps the guard tied to the `IWorkflowEngine.startRun` command rail.             |
| `docs/architecture/fowler-opportunity-planning-governance.md`                                                   | Requires ownership, root opportunity, allowed surfaces, and semantic tests.      |
| `docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md` | Owns the WE-HX-3 mechanization manifest and declared guard surfaces.             |

## Current QA Findings

| Finding                                               | Severity | Current location                                                                               | Why it matters                                                                                                                                                                               |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prose-based architecture assertions                   | Medium   | `packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts` | The test can fail on harmless heading or wording changes while missing the real question: whether the component still declares public API, invariants, transitions, consumers, and diagrams. |
| Architecture test imports a CLI script helper         | Medium   | `scripts/check-feature-mechanization.cjs` imported from the engine test                        | A refactor of the CLI can break an engine architecture test even if the feature-mechanization contract is still valid.                                                                       |
| Semantic guard and documentation-pack guard are mixed | Medium   | `startRunApplicationDecomposition.architecture.test.ts`                                        | Failures are less diagnostic. A missing closeout doc and a broken command-rail invariant show up in the same test family.                                                                    |
| No red/green proof for the hardening itself           | Medium   | No focused parser or document-pack fixture tests                                               | The repo only proves the current happy path. It does not prove that the new guard is less brittle while remaining semantically strict.                                                       |

## Target Architecture For The Fix

The target shape is:

| Concern                                   | Owner after hardening                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Start-run semantic ownership              | `startRunApplicationDecomposition.architecture.test.ts`                                                      |
| Reusable repo path and markdown readers   | `engineArchitectureTestSupport.ts` where engine-test scoped, or a script-level parser module where repo-wide |
| Feature-mechanization manifest extraction | New stable parser module, not the CLI script file                                                            |
| WE-HX-3 document-pack completeness        | Separate WE-HX-3 documentation-pack guard                                                                    |
| Parser behavior                           | Focused script/parser unit test with fixtures                                                                |
| Documentation semantics                   | Structured declaration in the docs, not heading text                                                         |

## Proposed Structured Document Contract

The component guide should expose machine-readable semantics. The exact syntax
can be adjusted during implementation, but the guard should validate a stable
contract like this instead of literal prose headings:

```yaml
componentDocContract:
  componentId: WE-HX-3-START-RUN-DECOMPOSITION
  commandRails:
    - IWorkflowEngine.startRun
  publicApi:
    - StartRunApplicationService
    - StartRunAdmissionService
    - StartRunIntentService
    - StartRunExecutionService
    - StartRunFailurePolicy
  requiredSemantics:
    - public-api
    - invariants
    - transitions
    - consumers
    - diagrams
  diagramPack: docs/architecture/components/engine/architecture/start-run-application-decomposition-diagrams.md
```

The parser should treat that block as the stable contract. Human headings can
then be renamed without breaking architecture QA.

## Task QH-1: Define The WE-HX-3 Component Doc Contract

**Objective**

Give the component guide a structured contract that can be validated without
depending on exact heading text.

**Affected files**

| File                                                                                                            | Expected change                                                                      |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `docs/architecture/components/engine/architecture/start-run-application-decomposition-component.md`             | Add the structured component-document contract.                                      |
| `docs/architecture/components/engine/architecture/start-run-application-decomposition-diagrams.md`              | Add a small structured diagram-pack declaration if the document-pack guard needs it. |
| `docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md` | Declare any new guard symbols and surfaces.                                          |

**Implementation steps**

1. Add a structured contract block to the component guide.
2. Include the command rail `IWorkflowEngine.startRun`.
3. Include all required component collaborators.
4. Include required semantic slots: public API, invariants, transitions,
   consumers, diagrams.
5. Point to the diagram pack by repo-relative path.
6. Avoid using heading text as the contract source.

**Red case**

Remove `transitions` from the structured contract. The documentation-pack guard
must fail with a message naming the missing semantic slot.

**Green case**

Rename `## Public API` to another human-readable heading while keeping
`public-api` in the structured contract. The guard must pass.

**Acceptance criteria**

| Requirement                                            | Acceptance check                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Editorial heading changes do not break architecture QA | A heading rename does not fail the guard when the structured contract remains valid. |
| Missing required semantics still fail                  | Removing a required contract item fails with a clear message.                        |
| The command rail remains explicit                      | `IWorkflowEngine.startRun` is present in the structured contract.                    |

## Task QH-2: Extract Feature-Mechanization Parsing From The CLI Script

**Objective**

Stop importing `scripts/check-feature-mechanization.cjs` directly from engine
architecture tests.

**Current problem**

The function `extractFeatureMechanizationManifests` is exported from the same
file that owns CLI behavior. The engine architecture guard imports it through
`createRequire`. That creates a false dependency from engine tests to a CLI
implementation file.

**Affected files**

| File                                                                                           | Expected change                                                                                |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `scripts/check-feature-mechanization.cjs`                                                      | Keep CLI behavior, but delegate parsing to a stable module.                                    |
| `scripts/lib/feature-mechanization-manifest.cjs`                                               | New parser module with an explicit API.                                                        |
| `scripts/feature-mechanization-manifest.test.cjs`                                              | New focused unit tests for parsing behavior.                                                   |
| `packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts` | Import the stable parser module or avoid parser import entirely if the doc-pack guard owns it. |

**Implementation steps**

1. Move `manifestFencePattern` and `extractFeatureMechanizationManifests` into
   `scripts/lib/feature-mechanization-manifest.cjs`.
2. Export an explicit function such as `extractFeatureMechanizationManifests`.
3. Update `scripts/check-feature-mechanization.cjs` to require the new module.
4. Keep the CLI output and validation behavior unchanged.
5. Add parser unit tests for valid YAML, invalid YAML, multiple manifests, and
   no manifest.
6. Update the engine test to stop requiring the CLI file.

**Red cases**

| Case                                                     | Expected failure before implementation                          |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| CLI internals renamed while parser behavior is unchanged | Engine architecture test fails because it imports the CLI file. |
| Invalid `feature-mechanization` YAML exists              | Parser unit test reports a parse error with source path.        |

**Green cases**

| Case                                          | Expected behavior after implementation                                |
| --------------------------------------------- | --------------------------------------------------------------------- |
| CLI file changes internal function layout     | Engine architecture test still imports the stable parser module.      |
| Multiple manifests exist in one markdown file | Parser returns each manifest with source path.                        |
| Bad YAML exists in one fence                  | Parser returns parse error for that fence without hiding source path. |

**Acceptance criteria**

- Engine architecture tests do not import `scripts/check-feature-mechanization.cjs`.
- CLI behavior remains compatible for `pnpm docs:feature-mechanization`.
- Parser behavior has direct unit coverage.

## Task QH-3: Split Semantic Architecture Guard From Document-Pack Guard

**Objective**

Separate engine semantic invariants from document completeness checks.

**Affected files**

| File                                                                                               | Expected change                                                                                                   |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `packages/@dvt/engine/test/architecture/startRunApplicationDecomposition.architecture.test.ts`     | Keep only command-rail and component-ownership semantics.                                                         |
| `packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts` | New documentation-pack guard, or equivalent existing architecture docs test if the repo already has that pattern. |
| `packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts`                          | Add reusable helpers only if they are engine-test scoped and not already available.                               |

**Semantic guard should keep**

| Invariant                                                                                         | Why it belongs in the architecture test                           |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `StartRunApplicationService` delegates to admission, intent, execution, and failure collaborators | This proves application orchestration remains decomposed.         |
| Forbidden implementation tokens are absent from `StartRunApplicationService`                      | This proves phase logic did not drift back into the orchestrator. |
| Start-run phase modules declare `@ownedConcern`                                                   | This proves semantic ownership remains explicit.                  |
| WE-HX-3 remains the single active start-run decomposition feature identity                        | This prevents duplicate active architecture identities.           |
| `IWorkflowEngine.startRun` remains the command rail                                               | This preserves the owning rail.                                   |

**Document-pack guard should own**

| Check                                            | Why it belongs outside the semantic guard         |
| ------------------------------------------------ | ------------------------------------------------- |
| Component guide exists                           | Document-pack completeness.                       |
| Diagram pack exists                              | Document-pack completeness.                       |
| User stories exist                               | Document-pack completeness.                       |
| Evidence and risk files are present              | ARC-2 pack completeness.                          |
| Structured component-document contract is valid  | Documentation contract, not runtime architecture. |
| Required docs are listed in the WE-HX-3 manifest | Mechanization completeness.                       |

**Implementation steps**

1. Move all broad document existence and heading checks out of
   `startRunApplicationDecomposition.architecture.test.ts`.
2. Keep only the semantic assertions listed above in that file.
3. Create a documentation-pack guard with explicit failure messages.
4. Use structured doc contract parsing in the documentation-pack guard.
5. Update the WE-HX-3 feature mechanization manifest to declare the new guard.

**Red case**

Delete the diagram-pack path from the structured component-document contract.
The documentation-pack guard must fail. The semantic architecture guard should
not fail for that reason.

**Green case**

Keep the structured contract valid while changing headings or prose. Both guards
must pass.

**Acceptance criteria**

- A missing command rail fails the semantic guard.
- A missing diagram-pack declaration fails the documentation-pack guard.
- Failure messages identify whether the issue is architecture semantics or
  documentation-pack completeness.

## Task QH-4: Replace Heading Assertions With Structured Markdown Parsing

**Objective**

Stop using `expect(markdown).toContain('## ...')` as a proxy for architecture
truth.

**Affected files**

| File                                                                      | Expected change                                                                           |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `packages/@dvt/engine/test/architecture/engineArchitectureTestSupport.ts` | Replace or supplement `expectMarkdownSections` with structured document-contract helpers. |
| New parser helper if shared beyond engine tests                           | Parse frontmatter or fenced structured contract.                                          |
| `startRunApplicationDecompositionDocs.architecture.test.ts`               | Use the helper to validate component-document semantics.                                  |

**Implementation steps**

1. Search for current use of `expectMarkdownSections`.
2. Decide whether it remains useful for low-risk docs tests or should be
   replaced in WE-HX-3 only.
3. Add a helper that reads the structured component contract.
4. Validate required semantic keys by stable identifiers.
5. Keep human-readable heading checks only when the document explicitly treats
   headings as a public contract.

**Red cases**

| Case                                           | Expected result |
| ---------------------------------------------- | --------------- |
| Rename a heading but keep structured semantics | No failure.     |
| Remove `requiredSemantics: transitions`        | Failure.        |
| Point `diagramPack` to a missing file          | Failure.        |

**Acceptance criteria**

- WE-HX-3 tests do not treat human headings as semantic authority.
- Structured contract validation has clear missing-field messages.
- Existing unrelated docs tests are not refactored unless required.

## Task QH-5: Add Focused Red/Green Fixtures

**Objective**

Prove the guard hardening does what we claim.

**Affected files**

| File                                                                                               | Expected change                                                 |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `scripts/feature-mechanization-manifest.test.cjs`                                                  | Parser fixtures for feature-mechanization fences.               |
| `packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts` | Red/green documentation-pack cases or helper-backed assertions. |
| `packages/@dvt/engine/test/architecture/fixtures/**` if needed                                     | Small fixture docs for parser and doc-pack behavior.            |

**Required fixture cases**

| Fixture                                          | Purpose                                   |
| ------------------------------------------------ | ----------------------------------------- |
| Valid component contract with renamed headings   | Proves heading text is not the authority. |
| Missing required semantic slot                   | Proves semantics are still enforced.      |
| Missing diagram pack path                        | Proves doc pack completeness.             |
| Duplicate `*START-RUN-DECOMPOSITION` feature IDs | Proves the hardcut rule remains enforced. |
| Invalid feature-mechanization YAML               | Proves parser errors are explicit.        |

**Acceptance criteria**

- Each fixture has one clear reason to fail.
- The tests do not depend on old DHM artifact names except as negative input
  when proving duplicate active identity rejection.
- Failure messages mention the missing semantic key or duplicated feature ID.

## Task QH-6: Update Mechanization, Evidence, And Closeout

**Objective**

Keep governance surfaces aligned after the QA hardening implementation.

**Affected files**

| File                                                                                                            | Expected change                                                                    |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md` | Add new guard symbols, red/green cycle, allowed surfaces, and validation commands. |
| `docs/evidence/ed-20260512-we-hx-3-start-run-decomposition.md`                                                  | Add QA-hardening validation evidence.                                              |
| `docs/risk-register/quality/R-20260512-WE-HX-3-START-RUN-DECOMPOSITION.yaml`                                    | Note mitigation for brittle architecture QA.                                       |
| `docs/planning/closeouts/20260512-we-hx-3-start-run-application-decomposition-closeout.md`                      | Add closeout addendum for QA hardening.                                            |
| `buzon/20260515-codex-we-hx-3-qa-hardening-tasks.md`                                                            | Mark task plan as executed or superseded by the final implementation notes.        |

**Implementation steps**

1. Update the WE-HX-3 manifest before touching tests.
2. Declare any new top-level symbols introduced by parser modules or tests.
3. Add red/green cycles for parser extraction and doc-pack guard split.
4. Update evidence and risk after implementation.
5. Keep the closeout concise but explicit about QA findings fixed.

**Acceptance criteria**

- `docs:feature-mechanization:implementation` sees all new files and symbols.
- ARC-2 evidence and risk still cover the engine-test change.
- Closeout explains that QA means review findings plus validation, not scripts
  alone.

## Execution Order

| Step | Task                                                | Why first or later                                            |
| ---- | --------------------------------------------------- | ------------------------------------------------------------- |
| 1    | Update WE-HX-3 manifest for this QA hardening slice | New files and symbols must be declared before implementation. |
| 2    | Extract feature-mechanization parser module         | Removes script/test coupling before more guards depend on it. |
| 3    | Add parser unit tests                               | Locks down parser behavior before moving callers.             |
| 4    | Add structured component-doc contract               | Gives the docs guard a stable semantic source.                |
| 5    | Split semantic guard and documentation-pack guard   | Reduces diagnostic ambiguity.                                 |
| 6    | Replace heading assertions                          | Removes the brittle behavior that triggered QA.               |
| 7    | Add red/green fixture cases                         | Proves the hardening is real.                                 |
| 8    | Update evidence, risk, and closeout                 | Aligns governance after implementation.                       |
| 9    | Run closeout validation                             | Confirms code, docs, and governance surfaces agree.           |

## Validation Baseline

Run focused validation first:

```bash
node --test scripts/feature-mechanization-manifest.test.cjs
pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecomposition.architecture.test.ts
pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
pnpm docs:feature-mechanization:implementation
```

Run closeout validation after docs and governance surfaces are updated:

```bash
pnpm --filter @dvt/engine typecheck
pnpm --filter @dvt/engine test
pnpm docs:sync
pnpm governance:refresh
pnpm docs:arc:evidence:check
pnpm verify:prepush
```

## Definition Of Done

| Requirement                      | Done when                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| No prose-fragile architecture QA | WE-HX-3 architecture tests do not depend on exact human heading text.                     |
| Stable parser API                | Engine tests import a stable parser module or a local helper, not the CLI script.         |
| Guard responsibilities separated | Semantic architecture failures and document-pack failures are reported by separate tests. |
| Red/green proof exists           | Fixtures prove heading drift is tolerated and semantic drift is rejected.                 |
| Governance updated               | Manifest, evidence, risk, and closeout mention the QA hardening.                          |
| No hidden debt                   | No TODO, placeholder, compatibility alias, or restored DHM active artifact is introduced. |

## Do Not Do

- Do not restore deleted DHM start-run decomposition docs, evidence, risk, or
  tests.
- Do not add compatibility aliases for the old DHM feature identity.
- Do not weaken the single active `WE-HX-3-START-RUN-DECOMPOSITION` rule.
- Do not replace fragile heading checks with equally fragile prose checks.
- Do not make the CLI script the stable API by convention only; extract a real
  parser module if tests need shared parsing.
- Do not claim QA is complete by running scripts without documenting review
  findings and risk closure.

## Implementation Record

Status: implemented in the active QA hardening slice.

| Task | Implementation result                                                                                                                                                                                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QH-1 | `start-run-application-decomposition-component.md` declares a structured `component-doc-contract` with the `IWorkflowEngine.startRun` rail, public API, semantic slots, and diagram-pack path.                                                                                    |
| QH-2 | `scripts/lib/feature-mechanization-manifest.cjs` owns feature-mechanization parsing; `scripts/check-feature-mechanization.cjs` delegates to it; `scripts/feature-mechanization-manifest.test.cjs` covers parser behavior.                                                         |
| QH-3 | Runtime semantic checks remain in `startRunApplicationDecomposition.architecture.test.ts`; document-pack checks moved to `startRunApplicationDecompositionDocs.architecture.test.ts`.                                                                                             |
| QH-4 | WE-HX-3 documentation QA validates stable structured keys instead of exact prose headings.                                                                                                                                                                                        |
| QH-5 | The WE-HX-3 manifest declares the new parser, doc-pack guard, QA task document, and component-document contract symbols. Stale entries for retired broad document constants were removed, and the implementation checker now ignores symbols that do not exist in the final tree. |
| QH-6 | ARC-2 evidence, risk, and closeout record the QA hardening and no-retrocompatibility posture.                                                                                                                                                                                     |

| Cycle                  | Red signal                                                                                                                                                                          | Green signal                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Parser extraction      | `node --test scripts/feature-mechanization-manifest.test.cjs` failed because `scripts/lib/feature-mechanization-manifest.cjs` did not exist.                                        | The same command passed after adding the parser module and tests.             |
| Document-pack contract | `pnpm --filter @dvt/engine test -- test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts` failed because the component guide lacked `component-doc-contract`. | The same guard passed after adding the structured contract and helper parser. |

No compatibility or historic alias was introduced. The older DHM-named active
artifacts remain retired; WE-HX-3 stays the single active start-run
decomposition feature identity.

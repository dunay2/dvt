---
title: DOC1.1 Repository Map Projection Plan
status: Review
owner: Engineering
last_reviewed: 2026-08-07
planning_type: mandatory-proposal
task_ids:
  - DOC1.1
  - GH-2144
---

# DOC1.1 Repository Map Projection Plan

## Intent

[Task: DOC1.1] [GitHub Issue: #2144]

The repository needs one deterministic, reviewable Repository Map. The existing
code-status generator already owns repository status generation, so this slice
extends that owner instead of introducing a second scanner, registry, or
projection mechanism.

The map derives effective workspace membership only from
`pnpm list -r --depth -1 --json`. It enriches those exact paths with exact,
non-drift Planning DB component and canonical-document bindings. Missing or
ambiguous identity remains visible as an explicit gap; names, package scopes,
directory conventions, and prose are never used as inferred bindings.

## Current And Target State

```mermaid
flowchart LR
  Manual[Manually maintained map] --> Drift[Stale or inferred repository picture]
  Directories[Directory scan] --> Drift
  Drift --> Reader[Reader cannot distinguish fact from guess]
```

```mermaid
flowchart LR
  Pnpm[Effective pnpm workspace rows] --> Generator[Existing code-status generator]
  Planning[(Migrated and imported Planning DB)] --> ExactJoin[Exact path and canonical binding join]
  ExactJoin --> Generator
  Generator --> Map[Tracked Repository Map]
  Generator --> Local[Ignored local code-state report]
  Map --> Checks[Drift, docs build, and link checks]
```

## Vertical Slices

1. Membership truth: obtain effective workspaces from pnpm and prove add,
   remove, rename, excluded-directory, and non-standard-layout behavior.
2. Architecture truth: join exact Planning DB component paths and exact
   canonical document bindings; expose missing and ambiguous facts.
3. Publication truth: render deterministic grouped Markdown with governed
   coverage classifications, local README fallback, and stable bytes.
4. Operational truth: preserve DB-free `--code-state-only`, make
   `--repository-map-only` explicitly DB-backed, and validate the map in the PR
   gate against migrated and imported state.
5. Refresh truth: generate local sources first, prepare/import the current DB,
   render the final map, and reconverge if that tracked projection changes a
   governed fingerprint.
6. Closeout and publication truth: keep Planning DB available for every full
   pre-push invocation, and build the published map with an exact Python patch
   plus a hash-locked pip/Zensical dependency graph.

## Definition Of Ready

- Issue #2144 owns delivery state and acceptance.
- The existing generator and generated-doc policy are identified as the owning
  mechanism.
- `GeneratePlanningDerivedSurfaces`, `ReadArchitectureDesignAuthority`, and
  `ReadComponentEngineeringRecord` are the reused command/query rails; no new
  rail or parallel service is needed.
- Planning DB migration and import are available for real integration proof.
- The behavior can be driven by failing unit and live-DB tests before each
  implementation increment.
- CI, workflow-scope policy, tracked generated output, and refresh ordering are
  included in the same vertical.

## Fowler Opportunity Matrix

| Opportunity           | Signal                             | Selected response                                     | Rejected alternative                           | Evidence                                             |
| --------------------- | ---------------------------------- | ----------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Competing generators  | Divergent Change / Shotgun Surgery | Extend `generate-code-status.cjs`                     | Add a second map scanner                       | One generator and one generated-doc policy entry     |
| Workspace discovery   | Speculative Generality             | Use effective pnpm output only                        | Infer membership from `apps/` or `packages/`   | Add/remove/rename and non-standard-layout tests      |
| Architecture identity | Primitive Obsession / Feature Envy | Exact normalized path and canonical-binding joins     | Guess from names, scopes, or prose             | Missing and ambiguous identities stay explicit       |
| Mode coupling         | Inappropriate Intimacy             | Separate DB-free and DB-backed modes                  | Make every status generation require Postgres  | Invalid-DB code-state test and mode-separation tests |
| Refresh ordering      | Temporal Coupling                  | Import current state before final map and reconverge  | Render from stale imported state               | Refresh order and fingerprint-change tests           |
| CI confidence         | Test Double overreach              | Run a migrated/imported Planning DB integration       | Treat mocked rows as end-to-end proof          | Opt-in live integration plus docs/link gates         |
| Closeout lifecycle    | Temporal Coupling                  | Enclose every full pre-push in the owned DB lifecycle | Infer DB need from a partial changed-file list | Generic-input closeout ordering test                 |
| Publication toolchain | Uncontrolled dependency            | Pin Python and install a hash-locked dependency graph | Resolve newest pip or transitive packages      | Workflow parity and lock-integrity tests             |

## Decision

- Reuse the current code-status generator as the single owner.
- Derive membership exclusively from the effective pnpm recursive list.
- Match Planning DB components only on exact normalized repository paths.
- Publish only exact, current canonical bindings; show gaps and ambiguities
  without inference.
- Preserve the local code-state projection as DB-free.
- Keep the Repository Map tracked, generator-owned, byte-stable, and checked in
  CI using a real migrated and imported Planning DB.
- Run the final map after the final import and reconverge all governed surfaces
  before validation if its content changes.
- Treat full pre-push as a Planning DB consumer for every closeout input class.
- Install the publication toolchain only from exact Python and hash-locked
  Python dependency versions shared by PR validation and docs deployment.

## Definition Of Done

- Effective workspace add, removal, rename, exclusion, and non-standard layout
  are covered by tests.
- Exact component and document identity, ambiguity, no-inference, coverage
  classes, and deterministic Markdown are covered by tests.
- `--code-state-only`, `--repository-map-only`, and `--check` remain visibly
  distinct and fail closed in their declared boundaries.
- A live migrated/imported Planning DB test proves production-shaped joins.
- The generated map builds and its links validate.
- Workspace-local README fallbacks remain clickable in the built site through
  the root package repository URL; they never render as unpublished relative
  site paths.
- Governance refresh converges after the final DB-backed map.
- Local closeout routes every canonical-binding and workspace-fallback input
  through the same Repository Map gate used by CI, including the root and
  non-standard workspace paths.
- A Planning DB runtime started by local closeout remains available through the
  full pre-push consumer and is released only afterward or during fail-closed
  cleanup.
- Every closeout input class prepares Planning DB before the unconditional full
  pre-push consumer, including code/config files outside Repository Map scope.
- The entire synchronous closeout executes while the same Node process owns a
  deterministic loopback TCP listener. The operating system performs the
  atomic bind, rejects every concurrent contender, and releases the endpoint
  when the process exits; no stale owner record, token comparison, quarantine,
  or pathname deletion participates in mutual exclusion.
- PR publication and docs deployment use the same exact Python patch and the
  same hash-locked pip/Zensical dependency graph, with no moving upgrade step.
- Feature mechanization, docs governance, CI tools, ARC evaluation, and the full
  pre-push gate pass without disabled rules or bypassed hooks.
- Review threads are answered with commit/test evidence, the temporary
  validation PR is retired, PR #2150 is integrated, and issue #2144 is closed
  with administrative evidence.

## Demanding User Check

A reader unfamiliar with repository internals must be able to answer, from one
page, which workspaces are effectively active, which bounded context owns each
workspace, which canonical document is bound to it, and which gaps remain. The
reader must not need to know directory conventions or distinguish inferred data
from canonical data: every non-canonical relation is displayed as a gap.

## Feature Mechanization

### Historical ordering deviation and corrective evidence

The first implementation commits inherited by this branch preceded this
mandatory plan. That ordering did not comply with the repository's
documentation-before-implementation rule and cannot be made compliant
retroactively by marking the final manifest closed. The deviation is retained
here explicitly rather than hidden.

Corrective work began only after this plan recorded the DoR, DoD, diagrams,
Fowler matrix, rails, allowed surfaces, and red/green cycles. Subsequent review
increments were each driven by failing tests and include exact governed
document bindings, published README links, operational mode separation, strict
canonicality, real pnpm lifecycle fixtures, no-write generation proof, the
effective root workspace, and the prepared PR-closeout path. `closed` below
describes the final mechanized tree and remaining-decision state; it does not
claim that the original commit ordering was compliant.

```feature-mechanization
version: 1
featureId: DOC1-1-REPOSITORY-MAP-20260807
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/doc1-1-repository-map-projection-plan-20260807.md
componentGuides:
  - docs/concepts/repository-map.md
  - docs/architecture/command-query-rail-governance.md
userStories:
  - docs/planning/proposals/mandatory/governance-and-docs/doc1-1-repository-map-projection-plan-20260807.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/state/github-mvp-issue-workflow.md
  - docs/generated-docs-policy.json
allowedImplementationSurfaces:
  - .github/requirements/zensical.in
  - .github/requirements/zensical.lock
  - .github/workflows/docs-deploy.yml
  - .github/workflows/pr-quality-gate.yml
  - AGENTS.md
  - docs/.manifest.json
  - docs/**/index.md
  - docs/DOCS_README.md
  - docs/concepts/repository-map.md
  - docs/generated-docs-policy.json
  - docs/guides/documentation-maintenance-guide-20260407.md
  - docs/guides/pr-preflight-and-ci-triage.md
  - docs/planning/proposals/mandatory/governance-and-docs/doc1-1-repository-map-projection-plan-20260807.md
  - docs/planning/status/generated-code-state.md
  - docs/runbooks/planning-generated-artifacts-operations-20260403.md
  - package.json
  - scripts/pr-closeout.cjs
  - scripts/pr-closeout.test.cjs
  - scripts/generate-code-status.cjs
  - scripts/generate-code-status.test.cjs
  - scripts/governance-refresh.cjs
  - scripts/governance-refresh.test.cjs
  - scripts/planning-db-run.cjs
  - scripts/planning-db-run.test.cjs
  - tools/ci/policy/workflow-scope.json
  - tools/ci/workflow-pattern-parity.test.mjs
  - tools/ci/workflow-scope-classification.test.mjs
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
  - specs/**
commandQueryRails:
  - name: GeneratePlanningDerivedSurfaces
    type: command
    dddOwner: PlanningGeneratedArtifact
  - name: ReadArchitectureDesignAuthority
    type: query
    dddOwner: ArchitectureDesignAuthority
  - name: ReadComponentEngineeringRecord
    type: query
    dddOwner: ComponentEngineeringRecordReadModel
  - name: InspectPlanningQueryStoreRuntime
    type: query
    dddOwner: PlanningQueryStoreRuntime
domainObjects:
  - Effective pnpm workspace membership
  - Repository Map projection
  - Exact component and canonical-document binding
  - Generated governance refresh
fowlerSignals:
  - Divergent Change
  - Shotgun Surgery
  - Speculative Generality
  - Temporal Coupling
architectureGuards:
  - node --test scripts/generate-code-status.test.cjs scripts/governance-refresh.test.cjs
  - node --test scripts/planning-db-run.test.cjs scripts/pr-closeout.test.cjs
  - DVT_REPOSITORY_MAP_INTEGRATION=1 node --test scripts/generate-code-status.test.cjs
  - pnpm test:ci-tools
  - pnpm docs:build
  - pnpm docs:gov:links
cypressFlows:
  - N/A - repository documentation projection with no browser interaction
completionGate:
  - node --test scripts/generate-code-status.test.cjs scripts/governance-refresh.test.cjs
  - node --test scripts/planning-db-run.test.cjs scripts/pr-closeout.test.cjs tools/ci/workflow-scope-classification.test.mjs
  - DVT_REPOSITORY_MAP_INTEGRATION=1 node --test scripts/generate-code-status.test.cjs
  - pnpm docs:status:check
  - pnpm test:ci-tools
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:build
  - pnpm docs:gov:links
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: effective-workspace-membership
    redTest: node --test scripts/generate-code-status.test.cjs
    expectedFailure: Directory scanning cannot represent effective pnpm inclusion, exclusion, rename, and non-standard workspace layout.
    patchSurfaces:
      - scripts/generate-code-status.cjs
      - scripts/generate-code-status.test.cjs
    greenTest: node --test scripts/generate-code-status.test.cjs
  - id: exact-planning-db-identity
    redTest: node --test scripts/generate-code-status.test.cjs
    expectedFailure: The map lacks exact component and canonical-document identity with explicit missing and ambiguous states.
    patchSurfaces:
      - scripts/generate-code-status.cjs
      - scripts/generate-code-status.test.cjs
    greenTest: node --test scripts/generate-code-status.test.cjs
  - id: generation-mode-separation
    redTest: node --test scripts/generate-code-status.test.cjs
    expectedFailure: Local code-state generation and tracked DB-backed map validation share hidden database behavior.
    patchSurfaces:
      - package.json
      - scripts/generate-code-status.cjs
      - scripts/generate-code-status.test.cjs
    greenTest: node --test scripts/generate-code-status.test.cjs
  - id: operational-mode-guidance
    redTest: node --test scripts/generate-code-status.test.cjs
    expectedFailure: DB-free workflows, generated-doc ownership, CI scope, and contributor guidance do not explicitly select the correct generation mode.
    patchSurfaces:
      - AGENTS.md
      - docs/DOCS_README.md
      - docs/generated-docs-policy.json
      - docs/guides/documentation-maintenance-guide-20260407.md
      - docs/guides/pr-preflight-and-ci-triage.md
      - docs/planning/status/generated-code-state.md
      - docs/runbooks/planning-generated-artifacts-operations-20260403.md
      - package.json
      - scripts/generate-code-status.test.cjs
      - tools/ci/policy/workflow-scope.json
    greenTest: node --test scripts/generate-code-status.test.cjs
  - id: demanding-fowler-qa
    redTest: node --test scripts/generate-code-status.test.cjs
    expectedFailure: Undeclared document canonicality is accepted, workspace lifecycle fixtures bypass real pnpm rules, and a second generation is not proven to avoid a write.
    patchSurfaces:
      - scripts/generate-code-status.cjs
      - scripts/generate-code-status.test.cjs
    greenTest: node --test scripts/generate-code-status.test.cjs
  - id: review-root-and-closeout-rail
    redTest: node --test scripts/generate-code-status.test.cjs scripts/pr-closeout.test.cjs
    expectedFailure: The pnpm root row is dropped and the governed PR-closeout rail invokes an implicit DB-backed generator without preparing Planning DB.
    patchSurfaces:
      - scripts/generate-code-status.cjs
      - scripts/generate-code-status.test.cjs
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
    greenTest: node --test scripts/generate-code-status.test.cjs scripts/pr-closeout.test.cjs
  - id: refresh-reconvergence
    redTest: node --test scripts/governance-refresh.test.cjs
    expectedFailure: A final Repository Map write can leave governance fingerprints stale after the final Planning DB import.
    patchSurfaces:
      - scripts/governance-refresh.cjs
      - scripts/governance-refresh.test.cjs
    greenTest: node --test scripts/governance-refresh.test.cjs
  - id: current-head-review-closeout-hardening
    redTest: node --test scripts/generate-code-status.test.cjs scripts/planning-db-run.test.cjs scripts/pr-closeout.test.cjs tools/ci/workflow-scope-classification.test.mjs
    expectedFailure: Status-mode commands use ambiguous pnpm separators; canonical-binding, canonical-state, and materializer inputs can skip the live map gate; and closeout neither waits for Planning DB readiness, reacts to workspace-manifest-only changes, nor releases only the runtime it owns.
    patchSurfaces:
      - AGENTS.md
      - docs/DOCS_README.md
      - docs/generated-docs-policy.json
      - docs/guides/documentation-maintenance-guide-20260407.md
      - docs/guides/pr-preflight-and-ci-triage.md
      - docs/planning/status/generated-code-state.md
      - docs/runbooks/planning-generated-artifacts-operations-20260403.md
      - scripts/generate-code-status.test.cjs
      - scripts/planning-db-run.cjs
      - scripts/planning-db-run.test.cjs
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
      - tools/ci/policy/workflow-scope.json
      - tools/ci/workflow-scope-classification.test.mjs
    greenTest: node --test scripts/generate-code-status.test.cjs scripts/planning-db-run.test.cjs scripts/pr-closeout.test.cjs tools/ci/workflow-scope-classification.test.mjs
  - id: final-source-and-lifecycle-review
    redTest: node --test scripts/generate-code-status.test.cjs scripts/pr-closeout.test.cjs tools/ci/workflow-scope-classification.test.mjs
    expectedFailure: Local closeout releases its owned Planning DB before full pre-push, canonical-binding inputs do not schedule Repository Map regeneration, and root or non-standard workspace README/source inputs can bypass local and remote gates.
    patchSurfaces:
      - docs/generated-docs-policy.json
      - scripts/generate-code-status.test.cjs
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
      - tools/ci/policy/workflow-scope.json
      - tools/ci/workflow-scope-classification.test.mjs
    greenTest: node --test scripts/generate-code-status.test.cjs scripts/pr-closeout.test.cjs tools/ci/workflow-scope-classification.test.mjs
  - id: final-runtime-determinism-review
    redTest: node --test scripts/generate-code-status.test.cjs scripts/pr-closeout.test.cjs
    expectedFailure: A generic full-prepush closeout can omit Planning DB preparation, while publication resolves a moving Python patch, upgrades pip to newest, and installs an unhashed transitive graph.
    patchSurfaces:
      - .github/requirements/zensical.lock
      - .github/workflows/docs-deploy.yml
      - .github/workflows/pr-quality-gate.yml
      - scripts/generate-code-status.test.cjs
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
    greenTest: node --test scripts/generate-code-status.test.cjs scripts/pr-closeout.test.cjs
  - id: publication-contract-parity-review
    redTest: pnpm test:ci-tools:executable
    expectedFailure: The executable workflow parity contract still requires the superseded direct Zensical install instead of the shared hash-locked publication command.
    patchSurfaces:
      - tools/ci/workflow-pattern-parity.test.mjs
    greenTest: pnpm test:ci-tools:executable
  - id: concurrent-closeout-and-reader-clarity-review
    redTest: node --test scripts/generate-code-status.test.cjs scripts/pr-closeout.test.cjs tools/ci/workflow-scope-classification.test.mjs
    expectedFailure: Concurrent closeouts can both claim the shared Planning DB lifecycle, the publication lock has no versioned direct-input source, and conventional src/test counters read as repository-wide totals.
    patchSurfaces:
      - .github/requirements/zensical.in
      - .github/requirements/zensical.lock
      - docs/concepts/repository-map.md
      - scripts/generate-code-status.cjs
      - scripts/generate-code-status.test.cjs
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
      - tools/ci/policy/workflow-scope.json
      - tools/ci/workflow-scope-classification.test.mjs
    greenTest: node --test scripts/generate-code-status.test.cjs scripts/pr-closeout.test.cjs tools/ci/workflow-scope-classification.test.mjs
  - id: ownerless-closeout-lease-recovery-review
    redTest: node --test scripts/pr-closeout.test.cjs
    expectedFailure: A process terminated between lease-directory creation and owner-file creation leaves a permanent machine-local busy lease.
    patchSurfaces:
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
    greenTest: node --test scripts/pr-closeout.test.cjs
  - id: closeout-lease-interleaving-review
    redTest: node --test scripts/pr-closeout.test.cjs
    expectedFailure: An owner can appear between stale checks and quarantine, or be replaced before the initializer records runtime ownership, allowing a live lease to be deleted or misclaimed.
    patchSurfaces:
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
    greenTest: node --test scripts/pr-closeout.test.cjs
  - id: partial-closeout-owner-recovery-review
    redTest: node --test scripts/pr-closeout.test.cjs
    expectedFailure: An empty, truncated, or schema-invalid owner file is treated as a permanent read error instead of an initializing lease with bounded stale recovery.
    patchSurfaces:
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
    greenTest: node --test scripts/pr-closeout.test.cjs
  - id: reused-pid-closeout-owner-review
    redTest: node --test scripts/pr-closeout.test.cjs
    expectedFailure: PID liveness alone treats an unrelated process that reused a stale owner's PID as the live lease owner forever.
    patchSurfaces:
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
    greenTest: node --test scripts/pr-closeout.test.cjs
  - id: monotonic-linux-closeout-identity-review
    redTest: node --test scripts/pr-closeout.test.cjs
    expectedFailure: Linux process identity combines start ticks with wall-clock boot time, so a clock correction can misclassify a live owner as a reused PID.
    patchSurfaces:
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
    greenTest: node --test scripts/pr-closeout.test.cjs
  - id: reserved-public-closeout-recovery-review
    redTest: node --test scripts/pr-closeout.test.cjs
    expectedFailure: Quarantining the whole lease directory vacates its public path, so a third closeout can acquire it before a newly visible live owner is restored.
    patchSurfaces:
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
    greenTest: node --test scripts/pr-closeout.test.cjs
  - id: os-owned-closeout-socket-review
    redTest: node --test scripts/pr-closeout.test.cjs
    expectedFailure: Check-then-delete recovery can remove a late initializer, a successor marker, or an entire successor lease; repeated ownerless retries can also rejuvenate the stale threshold indefinitely.
    patchSurfaces:
      - scripts/pr-closeout.cjs
      - scripts/pr-closeout.test.cjs
    greenTest: node --test scripts/pr-closeout.test.cjs
symbols:
  - &repositoryMapSymbol
    name: GENERATION_MODES
    path: scripts/generate-code-status.cjs
    dddOwner: PlanningGeneratedArtifact
    cqRails:
      - GeneratePlanningDerivedSurfaces
      - ReadArchitectureDesignAuthority
      - ReadComponentEngineeringRecord
    fowlerSignals:
      - Single generator owner
      - Exact identity
    architectureGuard: node --test scripts/generate-code-status.test.cjs
    cypressCoverage: N/A - repository documentation projection with no browser interaction
    unitTests:
      - node --test scripts/generate-code-status.test.cjs
  - <<: *repositoryMapSymbol
    name: assertTrackedRepositoryMapClean
  - <<: *repositoryMapSymbol
    name: buildRepositoryMapRows
  - <<: *repositoryMapSymbol
    name: codeStateOutputPath
  - <<: *repositoryMapSymbol
    name: collectRepositoryWorkspaceStats
  - <<: *repositoryMapSymbol
    name: databaseUrl
  - <<: *repositoryMapSymbol
    name: generateCodeState
  - <<: *repositoryMapSymbol
    name: generateRepositoryMap
  - <<: *repositoryMapSymbol
    name: isCurrentCanonicalDocument
  - <<: *repositoryMapSymbol
    name: listPnpmWorkspaceDirs
  - <<: *repositoryMapSymbol
    name: localReadmeLink
  - <<: *repositoryMapSymbol
    name: main
  - <<: *repositoryMapSymbol
    name: markdownCell
  - <<: *repositoryMapSymbol
    name: markdownTable
  - <<: *repositoryMapSymbol
    name: normalizeRepoPath
  - <<: *repositoryMapSymbol
    name: parsePnpmWorkspaceRows
  - <<: *repositoryMapSymbol
    name: pnpmCommand
  - <<: *repositoryMapSymbol
    name: readRepositoryArchitectureFacts
  - <<: *repositoryMapSymbol
    name: relativeDocLink
  - <<: *repositoryMapSymbol
    name: renderCodeState
  - <<: *repositoryMapSymbol
    name: renderRepositoryMap
  - <<: *repositoryMapSymbol
    name: repositoryMapOutputPath
  - <<: *repositoryMapSymbol
    name: repositoryBrowserUrl
  - <<: *repositoryMapSymbol
    name: resolveCanonicalDocuments
  - <<: *repositoryMapSymbol
    name: resolveDocumentationProjection
  - <<: *repositoryMapSymbol
    name: resolveGenerationMode
  - <<: *repositoryMapSymbol
    name: resolveWorkspaceArchitecture
  - <<: *repositoryMapSymbol
    name: toPosix
  - &planningDbLifecycleSymbol
    name: isPlanningDbActive
    path: scripts/planning-db-run.cjs
    dddOwner: PlanningQueryStoreRuntime
    cqRails:
      - InspectPlanningQueryStoreRuntime
    fowlerSignals:
      - Fail-closed ownership probe
      - Bounded readiness
    architectureGuard: node --test scripts/planning-db-run.test.cjs
    cypressCoverage: N/A - local Planning DB lifecycle with no browser interaction
    unitTests:
      - node --test scripts/planning-db-run.test.cjs
  - <<: *planningDbLifecycleSymbol
    name: runPlanningDbHealth
  - &prCloseoutLifecycleSymbol
    name: probePlanningDbActive
    path: scripts/pr-closeout.cjs
    dddOwner: PlanningGeneratedArtifact
    cqRails:
      - GeneratePlanningDerivedSurfaces
      - InspectPlanningQueryStoreRuntime
    fowlerSignals:
      - Explicit lifecycle ownership
      - Guaranteed cleanup
    architectureGuard: node --test scripts/pr-closeout.test.cjs
    cypressCoverage: N/A - repository closeout command with no browser interaction
    unitTests:
      - node --test scripts/pr-closeout.test.cjs
  - <<: *prCloseoutLifecycleSymbol
    name: releasePlanningDbIfOwned
  - <<: *prCloseoutLifecycleSymbol
    name: resolveCloseoutLockEndpoint
  - <<: *prCloseoutLifecycleSymbol
    name: runWithCloseoutLock
  - &prCloseoutRoutingSymbol
    name: workflowScopePolicy
    path: scripts/pr-closeout.cjs
    dddOwner: PlanningGeneratedArtifact
    cqRails:
      - GeneratePlanningDerivedSurfaces
    fowlerSignals:
      - Canonical policy reuse
      - Single routing vocabulary
    architectureGuard: node --test scripts/pr-closeout.test.cjs tools/ci/workflow-scope-classification.test.mjs
    cypressCoverage: N/A - repository closeout routing with no browser interaction
    unitTests:
      - node --test scripts/pr-closeout.test.cjs tools/ci/workflow-scope-classification.test.mjs
  - <<: *prCloseoutRoutingSymbol
    name: repositoryMapSourcePatterns
  - <<: *prCloseoutRoutingSymbol
    name: workspaceSourcePatterns
  - <<: *prCloseoutRoutingSymbol
    name: escapeRegexCharacter
  - <<: *prCloseoutRoutingSymbol
    name: globToRegExp
  - <<: *prCloseoutRoutingSymbol
    name: matchesAnyPattern
  - <<: *prCloseoutRoutingSymbol
    name: hasRepositoryMapSourceChange
```

## No-Debt Boundary

This plan adds no stub, placeholder, alternate registry, inferred binding, or
temporary success path. A missing canonical fact remains a visible map gap and
must be repaired at its owning Planning DB or documentation source.

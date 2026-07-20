---
title: CI Delivery Governance Component
status: Active
owner: Engineering / CI Governance
last_reviewed: 2026-07-19
---

# CI Delivery Governance Component

Owned concern: canonical CI delivery governance semantics for required workflow
gates, local reproduction commands, and the absorbed delivery action-plan state.

This component turns the CI Delivery Governance Consolidated Action Plan into a
current architecture contract instead of leaving each wave as an open planning
assertion.

## Public API

| Surface                                             | Owner               | Contract                                                                                                                                                                                  |
| --------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test:ci-tools`                                | root `package.json` | Runs the CI-tool contract suite over `tools/ci/*.test.mjs` and `tools/ci/test/*.test.mjs`.                                                                                                |
| `.github/workflows/ci.yml` `CI tool contracts`      | CI - Code Quality   | Required CI-tool contract lane for pull requests, pushes to `main`, and manual workflow runs.                                                                                             |
| `.github/workflows/release.yml`                     | Release governance  | Runs Release Please with the mandatory trusted governance credential and repository-owned manifest/config so generated release PRs trigger required checks.                               |
| `.github/workflows/release-candidate-integrity.yml` | Release governance  | Classifies trusted PR metadata before mutation, then coordinates the single `Release candidate integrity` check from `pull_request_target`; candidate assessment has read-only authority. |
| `.github/workflows/pr-labeler.yml`                  | PR metadata policy  | Applies file-derived labels from trusted base configuration without checking out or executing candidate code.                                                                             |
| `release-please-config.json`                        | Release governance  | Owns Release Please title/version behavior instead of relying on action defaults.                                                                                                         |
| `.release-please-manifest.json`                     | Release governance  | Owns the current release base version used by Release Please manifest mode.                                                                                                               |
| `CHANGELOG.md`                                      | Release governance  | Generated Release Please artifact; it is not hand-authored documentation and is ignored by changed-markdown lint.                                                                         |
| `tools/ci/release-candidate-integrity/`             | Release governance  | Pure candidate read model, check-publication service, and Git/GitHub adapters for exact-tree assessment, merge policy, and Checks API lifecycle.                                          |
| `.markdownlintignore`                               | Markdown governance | Records generated Markdown artifacts that changed-file markdownlint must not lint as hand-authored prose.                                                                                 |
| `scripts/lint-markdown-changed.cjs`                 | Markdown governance | Computes the changed Markdown read model after applying repository ignore policy before invoking markdownlint.                                                                            |
| `tools/ci/workflow-pattern-parity.test.mjs`         | CI governance tests | Semantic guard that proves the workflow still invokes `pnpm test:ci-tools` and shared scope policy emitters.                                                                              |
| `tools/ci/ci-delivery-governance-canon.test.mjs`    | CI governance tests | Canonical absorption guard for the local component guide, user stories, and mandatory proposal state.                                                                                     |
| `docs/guides/testing-and-ci-capabilities.md`        | CI documentation    | Operator-facing command map for reproducing local and remote delivery gates.                                                                                                              |

Command/query rail:

| Rail                                     | Type    | Bounded context                     | DDD owner                                     | Port / adapter                                                        | Negative guard                                                                                                                                                                     |
| ---------------------------------------- | ------- | ----------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ValidateCiDeliveryGovernanceCanon`      | query   | Repository delivery governance      | `CiDeliveryGovernanceCanon` read model        | `pnpm test:ci-tools` and `CI tool contracts` workflow lane            | Fails when the plan claims an absorbed gate is still open, or when component docs lose public API, invariants, transitions, consumers, diagrams, or user stories.                  |
| `ConfigureReleasePleasePreMajorState`    | command | Repository release governance       | `ReleasePleasePreMajorState` policy object    | `.github/workflows/release.yml` and Release Please action             | Fails when Release Please falls back to default `1.0.0` behavior or opens a PR title that violates the semantic PR title gate.                                                     |
| `GenerateReleaseCandidate`               | command | Repository release governance       | `ReleaseCandidateIntegrityGate`               | `PORT-CI-GENERATE-RELEASE-CANDIDATE` and Release Please action        | Fails before mutation when `RELEASE_GOVERNANCE_TOKEN` is absent; `GITHUB_TOKEN` fallback and generated PRs without required workflow runs are forbidden.                           |
| `ConfigureReleasePullRequestMergePolicy` | command | Repository release governance       | `ReleasePullRequestMergePolicy` policy object | GitHub repository settings and main ruleset                           | Fails when plain merge or rebase is allowed, squash is unavailable, or squash bodies preserve internal branch commit messages.                                                     |
| `InspectReleasePullRequestMergePolicy`   | query   | Repository release governance       | `ReleaseMergePolicyAdapter`                   | `PORT-CI-INSPECT-RELEASE-PULL-REQUEST-MERGE-POLICY` and GitHub API    | Fails when policy identity cannot observe bypass actors or GitHub omits `bypass_actors`; unknown visibility is never equivalent to an empty bypass set.                            |
| `AssessReleaseCandidateIntegrity`        | query   | Repository release governance       | `ReleaseCandidateIntegrity` read model        | `pnpm release:candidate:check` and the trusted candidate workflow     | Fails on stale base/head identity, multiple candidate commits, version mismatch, post-1.0 versions, unexpected files, duplicate logical notes, or merge-policy drift.              |
| `ClassifyReleaseCandidateAuthority`      | query   | Repository release governance       | `ReleaseCandidateAuthoritySpecification`      | Trusted metadata CLI before every check-publication job               | Fails on missing identity, fork release candidates, release candidates outside `main`, or a fork product PR without a base-repository test merge SHA.                              |
| `PublishReleaseCandidateIntegrityCheck`  | command | Repository release governance       | `ReleaseCandidateCheckPublicationService`     | `PORT-CI-RELEASE-CANDIDATE-CHECK-PUBLISH` and GitHub Checks adapter   | Fails closed when the check is not opened and completed on the exact PR head SHA, candidate assessment receives write authority, or the final assessment failure is not published. |
| `ApplyPullRequestFileLabels`             | command | Repository collaboration governance | `PullRequestFileLabelPolicy` policy object    | `PORT-CI-APPLY-PR-FILE-LABELS` and `.github/workflows/pr-labeler.yml` | Fails when candidate code receives write authority, candidate configuration controls labels, or the trusted adapter checks out or executes candidate code.                         |
| `LintChangedMarkdownFiles`               | query   | Repository Markdown governance      | `ChangedMarkdownFileSet` read model           | `scripts/lint-markdown-changed.cjs` and `verify:prepush`              | Fails when generated Markdown artifacts are passed explicitly to markdownlint despite repository ignore policy.                                                                    |

## Invariants

1. CI helper logic is merge-gated through the existing `CI - Code Quality`
   workflow; a parallel workflow surface is not introduced for the same intent.
2. The `CI tool contracts` lane runs `pnpm test:ci-tools`; workflow parity tests
   keep that wiring executable.
3. Shared scope decisions remain owned by `tools/ci/scope-config.mjs`,
   `tools/ci/emit-scope.mjs`, and `tools/ci/emit-workspace-matrix.mjs`.
4. Generated-doc single-writer policy remains owned by
   `docs/generated-docs-policy.json` and its checker, not by the CI delivery
   action plan text.
5. The mandatory proposal may carry residual opportunities, but it must not
   describe already-absorbed gates as unimplemented current work.
6. Release Please MUST run from the repository-owned config and manifest while
   DVT is in pre-1.0 product development. Action defaults are not the release
   source of truth.
7. Generated Release Please changelog entries MUST NOT block changed-file
   markdownlint when their generated formatting differs from the repository's
   hand-authored Markdown style rules.
8. Each merged product PR MUST contribute one logical release identity. The
   repository therefore uses squash as its sole merge method, with the PR title
   as the commit title and no internal commit list in the squash body.
9. The release candidate MUST descend from the exact current `main` SHA by one
   generated release commit and may change only the manifest, package version,
   and changelog. Unsupported extra-file strategies fail closed.
10. Package, manifest, and latest changelog versions MUST match and remain below
    `1.0.0` while the product is in pre-release development.
11. `Release candidate integrity` has exactly one producer: the check
    publication service invoked by the trusted `pull_request_target` workflow
    loaded from the PR base. Candidate code is checked out without credentials
    in a separate read-only assessment job and is inspected as Git data; it is
    never installed or executed in that workflow.
12. `All Checks Required for Merge` and `Release candidate integrity` MUST both
    be strict required checks from GitHub Actions on the active ruleset for the
    default branch. Product CI cannot be bypassed by an integrity-only success.
13. The candidate check result MUST be attached to the exact candidate head
    SHA; a green result from an older candidate revision is not release evidence.
14. Jobs that check out pull-request candidate code MUST remain read-only and
    credential-free. Pull-request metadata mutation is owned only by the trusted
    `pull_request_target` labeler workflow.
15. The trusted labeler MUST load policy from the base repository and MUST NOT
    check out or execute candidate code.
16. Pull-request scope assessment MUST use the immutable
    `github.event.pull_request.base.sha` already present in the shallow merge
    snapshot; it MUST NOT require an authenticated fetch after candidate code is
    checked out.
17. Pull-request authority MUST be classified from trusted event metadata before
    any job receives `checks:write`. Same-repository pull requests publish on
    their exact head SHA. Fork product pull requests publish on GitHub's
    base-repository test merge SHA so the required context is authoritative and
    does not mutate a foreign head.
18. A release-candidate branch MUST target `main` from the same repository. Its
    required check remains attached to the exact candidate head SHA; fork or
    non-main release candidates fail closed.
19. Release Please MUST use `RELEASE_GOVERNANCE_TOKEN`; an absent credential
    blocks before mutation and MUST NOT fall back to `GITHUB_TOKEN`.
20. Repository merge-policy evidence MUST include an explicit `bypass_actors`
    field. Omitted protected data is unknown authority, not an empty set, and
    MUST fail closed.
21. `InspectReleasePullRequestMergePolicy` returns an evidence envelope. The
    workflow composition boundary MUST project only its nested `policy` into
    `AssessReleaseCandidateIntegrity`; passing the envelope as domain policy is
    forbidden.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> Planned: delivery action plan records residual gap
  Planned --> Implemented: workflow and tool tests land
  Implemented --> Canonized: component guide, user stories, plan state, and semantic guard align
  Canonized --> Regression: workflow loses CI tool lane or plan reopens absorbed work
  Regression --> Canonized: restore wiring and docs/test alignment
```

```mermaid
flowchart LR
  ProductPR[Product PR] -->|squash only| Main[main: one conventional identity]
  ProductPR -->|changed files only| TrustedLabeler[Trusted base labeler]
  TrustedLabeler --> Labels[PR metadata]
  Main --> ReleasePlease[Release Please + trusted governance credential]
  ReleasePlease --> Candidate[Release candidate PR]
  Candidate --> TrustedWorkflow[Trusted pull_request_target coordinator]
  TrustedWorkflow --> Authority[Classify trusted PR authority]
  Authority --> BeginCheck[Open check on authoritative publication SHA]
  BeginCheck --> Integrity[Read-only ReleaseCandidateIntegrity query]
  Integrity -->|valid exact tree| Check[Complete required check on candidate SHA]
  Integrity -->|any violation| Block[Fail closed]
```

```mermaid
sequenceDiagram
  participant Contributor
  participant Local as pnpm test:ci-tools
  participant Workflow as CI tool contracts
  participant Parity as workflow-pattern-parity.test.mjs
  participant Canon as ci-delivery-governance-canon.test.mjs

  Contributor->>Local: Run local CI-tool contract suite
  Local->>Parity: Prove workflow wiring and shared scope policy
  Local->>Canon: Prove plan/component/user-story canon
  Contributor->>Workflow: Open PR or push to main
  Workflow->>Local: Execute same command in CI
  Workflow-->>Contributor: Merge-gate result
```

```mermaid
sequenceDiagram
  participant Main
  participant RP as Release Please
  participant GitHub
  participant Workflow as Trusted base workflow
  participant Gate as ReleaseCandidateIntegrity
  participant Publisher as CheckPublicationService

  Main->>RP: push with one squashed identity per PR
  RP->>GitHub: create or update release candidate with trusted credential
  GitHub-->>Workflow: exact base/head/merge SHA and repository identity
  Workflow->>Workflow: classify authority with read-only trusted code
  Workflow->>Publisher: begin(authoritative publication SHA)
  Publisher->>GitHub: create in-progress required check
  Workflow->>Gate: immutable Git objects and projected merge policy
  Gate->>Gate: assess tree, versions, files and logical notes
  Gate-->>Workflow: deterministic pass/fail result
  Workflow->>Publisher: complete(head SHA, pass/fail)
  Publisher->>GitHub: verify identity and complete the sole required check
```

## Consumers

- CI maintainers use this component to decide whether delivery-governance work
  belongs in workflow wiring, shared scope tooling, docs governance, or
  planning state.
- Contributors use `pnpm test:ci-tools` as the local reproduction command for
  the CI-tool contract lane.
- Planning agents use the mandatory proposal only for residual work after the
  absorbed gates are checked against this component.
- Reviewers use the semantic tests to reject regressions that would otherwise
  look like harmless documentation drift.

## Fowler Analysis Summary

Improved patterns:

- Replaced advisory CI policy with an executable **Service Layer** around the
  `CI tool contracts` lane.
- Converged duplicated scope semantics behind shared scope emitters.
- Promoted generated-doc ownership into a named policy instead of treating
  broad generated outputs as incidental files.
- Replaced commit-history interpretation drift with one PR identity per squash
  commit and an explicit candidate **Specification** evaluated by a pure query.
- Kept GitHub and Release Please behind adapters; the domain rule does not parse
  workflow YAML or call the network.
- Isolated write authority behind a trusted adapter so candidate validation and
  pull-request mutation no longer share one execution context.
- Split check publication into an application service and a GitHub Checks
  adapter; workflow jobs coordinate the lifecycle without owning API semantics.

Anti-patterns removed or bounded:

- **Duplicate semantics**: workflow-specific path lists are no longer the
  planning source of truth for already-shipped gates.
- **Documentation drift**: the action plan now distinguishes absorbed gates
  from residual opportunities.
- **Test-only confidence**: the new guard validates semantic component
  structure and proposal state, not only a thin workflow string.

Future opportunities remain in residual plan items such as the strict pre-push
type-check selector, lifecycle-policy automation, and any remaining
merge-hotspot reduction.

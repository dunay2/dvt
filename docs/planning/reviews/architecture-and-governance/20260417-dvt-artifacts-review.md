---
title: DVT artifacts review
status: Active
owner: Architecture / Artifacts / Frontend / Docs
last_reviewed: 2026-04-18
planning_type: review
---

# DVT artifacts review

**Reviewer stance:** architecture review rewritten to keep only conclusions that
still matter for execution. Closed decisions are treated as closed; this
document is not a second roadmap.

## Governing sources

- [AGENTS.md](../../../AGENTS.md)
- [Governance document and rule inventory](../../status/governance-document-rule-inventory.md)
- [Planning control tower](../../state/planning-control-tower.md)
- [ADR-0034: bounded context boundaries and communication rules](../../../adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md)
- [ADR-0043: plan record, plan store, and artifacts ownership](../../../adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md)
- [Contracts domain ownership migration plan](../../proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md)
- [Closeout: MW-A3 StepArtifactRef generalization](../../closeouts/20260406-mw-a3-step-artifact-ref-generalization-closeout.md)
- [Closeout: TF-C3 production plugin host composition](../../closeouts/20260414-tf-c3-production-plugin-host-composition-closeout.md)

## Review intent

This review answers one question only:

> What artifact conclusions are still useful for execution after the recent
> contract and runtime work already landed?

The answer is narrower than the earlier draft suggested.

## Current-state conclusions

### 1. Do not reopen already-closed boundary decisions

Two earlier concerns are no longer the active problem:

- `compiledCodeRef` is no longer the correct architectural center of gravity.
  The canonical direction already moved to `StepArtifactRef` under `MW-A3`.
- `runExecutionContext` is no longer a speculative boundary. The shared
  artifact-backed readers and the worker composition path already landed under
  `TF-C3`.

Useful conclusion:

- do not spend new planning energy reopening those two decisions
- new artifact work should build on them, not replace them

### 2. The real open architecture gap is ownership and package-surface closure

The artifact bounded context is accepted at the ADR level, but ownership
closure is still not fully finished in the package graph.

The useful follow-up is:

- finish moving non-shared artifact behavior ports and related package surfaces
  to the artifact owner path
- keep shared serializable refs in `@dvt/contracts`
- stop treating `@dvt/contracts` as a convenience host for artifact behavior

This is the active `RC-G1-C` problem, not a new artifact-model redesign.

### 3. The real product gap is consumer adoption, not more internal theory

The operator-visible gap is still that `ArtifactsView`, `DiffView`, and the
Monaco-backed read surfaces do not yet converge on real backend artifact truth.

Useful conclusion:

- connecting real artifact-backed consumption matters more than inventing a
  richer internal artifact abstraction right now
- the next product-facing value sits in `F-11` and `F-17-F`, not in another
  abstract artifact review

### 4. DBT-specific runtime readers are acceptable for now

The contract direction is step-kind-agnostic. The runtime reality is still that
the concrete shipped artifact readers are concentrated on DBT bundle and
execution-context flows.

That is not, by itself, an architecture defect that needs immediate redesign.

Useful conclusion:

- keep the contract model generic
- allow concrete runtime readers to remain product-vertical specific until a
  second real artifact-producing runtime needs them
- do not generalize readers only because the abstraction looks cleaner on paper

### 5. Storage API scaling concerns are real, but secondary

The earlier draft correctly identified concerns around:

- full-buffer reads
- unbounded concurrency on artifact publication paths
- weak `Noop` semantics
- cloud dependencies leaking through the package surface

Those are still worth fixing, but they are not the first architecture move.

Useful conclusion:

- treat storage API hardening as a follow-on slice after ownership closure and
  consumer truth land
- do not let secondary storage refinements displace `RC-G1-C`, `F-11`, or
  `F-17-F`

## Execution mapping

| Conclusion                                                                               | Disposition                        | Existing task linkage                              | Why                                                                    |
| ---------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| Keep `StepArtifactRef` as the canonical artifact direction                               | `closed; do not reopen`            | `MW-A3`, `MW-A4`                                   | The core generalization decision already landed.                       |
| Keep `runExecutionContext` as a governed shared artifact boundary                        | `closed; build on it`              | `S08-5-B`, `TF-C3-B`, `TF-C3`                      | The API, worker, and shared readers already converged.                 |
| Finish artifacts ownership and package-surface closure                                   | `execute now`                      | `RC-G1-C`                                          | This is the real remaining architecture debt in the artifact boundary. |
| Wire real artifact truth into operator-facing consumers                                  | `execute after contract readiness` | `F-11`, `F-17-F`                                   | This is the real product gap still visible to operators.               |
| Revisit streaming, bounded concurrency, stronger storage contracts, and `Noop` semantics | `defer until above work lands`     | `future artifacts hardening slice; not yet opened` | These are worthwhile, but not the current blocker.                     |

## Recommended execution order

1. Finish `RC-G1-C` so artifact behavior ownership and package surfaces match
   the bounded context.
2. Advance `F-11` so Artifacts and Diff consume real backend data instead of
   placeholders.
3. Advance `F-17-F` so Monaco-backed read surfaces converge on governed backend
   artifact truth.
4. Open a dedicated artifact-storage hardening slice only after the three steps
   above prove that a stronger storage contract is still needed.

## Explicit non-goals

This review does **not** recommend:

- reopening `compiledCodeRef` versus `StepArtifactRef`
- reopening the accepted `runExecutionContext` boundary
- inventing a new artifact mega-model before current consumers are real
- forcing every concrete artifact reader to become step-kind-generic before a
  second real runtime needs that generalization
- prioritizing storage micro-optimizations ahead of ownership and product truth

## Final judgment

The useful artifact story is now simpler than the earlier draft implied.

The repository already made the two important architectural moves:

- generic artifact direction at the contract level
- real artifact-backed runtime composition for DBT execution inputs

What remains is mostly execution, not theory:

- close the owner-package migration under `RC-G1-C`
- make operators consume real artifacts under `F-11` and `F-17-F`
- defer lower-priority storage hardening until those two truths are in place

That is the actionable conclusion set. Everything else in the earlier draft is
secondary or already closed.

# Fowler Architecture Governance Review Canon Analysis

## Fowler Analysis

The 2026-04-02 review is strong architecture work, but before this slice it
behaved like an advisory document with latent task semantics. Fowler's lesson
here is boundary ownership: a review finding must not become a shadow service,
shadow backlog, or informal rule. It needs a named model and a named owner.

The applied model is `ArchitectureGovernanceReviewCanon`: a review finding
catalog, a disposition ledger, and a traceability policy. This turns review
prose into explicit states: closed, queued, follow-up, risk-accepted, or
candidate promotion.

## Mature-System Comparison

Mature systems keep architecture reviews alive through ledgers, not through
unbounded prose. A review board row points to the owning task, ADR, risk, or
evidence record. Product planning can then choose the next high-value task
without re-triaging every historical recommendation.

DVT already has the ingredients: Planning DB, ADRs, risk register, evidence
docs, generated workboard views, and semantic CI guards. The gap was semantic
encapsulation for the review itself.

## Improved Patterns

- Review findings now have a canonical disposition owner.
- Product-facing rows stay visible when architecture hardening rows are closed.
- Closed findings cite status or evidence instead of relying on memory.
- The semantic guard validates the review canon as a component, not a loose doc.

## Antipatterns

- **Shadow backlog:** review prose carrying task semantics outside Planning DB.
- **Stale blocker:** a closed finding appearing open because the review text is
  older than the implementation.
- **Platform-product conflation:** security or CI hygiene competing with billing,
  projection, or pilot work without explicit product value classification.
- **Syntax-only confidence:** markdown checks passing while review traceability
  drifts.

## Component Grouping

The component belongs under `ci-governance` because its executable surface is a
semantic repository guard. Its business concern is architecture governance, but
its implementation surface is documentation, planning, and CI validation.

Grouped concerns:

- finding classification;
- disposition recording;
- task/risk/evidence traceability;
- product-relevant next-work selection;
- semantic drift validation.

## Future Lessons

- Every active review should have a disposition ledger once it starts driving
  tasks.
- A review is not product backlog until Planning DB owns the row.
- Residual risk is a valid disposition and should not be disguised as unfinished
  implementation.
- Product-facing work should be selected from value impact, not from whichever
  review prose is newest.

## Repetition And Drift

Repeated P0/P1 recommendations in the review now map to existing closures:
`AR-B1`, `AR-C1`, `S08-3`, `S08-4`, `AR-C5`, `AR-D1`, `AR-D4`, and `AR-D5`.
The remaining drift is explicit: `cost attribution model`, `projector
event-driven invalidation`, `Temporal -> API backpressure`, and `AR-C2-T3`
remain open or blocked through Planning DB state.

## Applied Pattern

Applied pattern: **Review Finding Ledger with Semantic Fitness Function**.

The ledger removes ambiguous task ownership. The fitness function prevents
future docs or planning edits from erasing disposition coverage while still
passing markdown lint.

## Opportunities

The next product-relevant opportunities after this canon are:

1. `cost attribution model`, because it enables billing and finance reporting.
2. `projector event-driven invalidation`, because it removes polling bottlenecks
   and unblocks backpressure closure.
3. `first enterprise pilot`, because it validates product-market fit once the
   needed runtime and access boundaries remain stable.

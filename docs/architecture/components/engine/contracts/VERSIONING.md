# Contract Versioning Policy

[<- Back to Engine Index](../index.md)

**Status**: NORMATIVE
**Version**: 1.0
**Scope**: Active engine-runtime contract pack and its published registries
**Owners**: Architecture team, engine leads

---

## Purpose

This policy governs the active engine-runtime contract pack while the repository
remains pre-stable.

Git is the historical record. The active `docs/` tree is not.

## Scope

This policy applies to the live engine-runtime boundary and the entrypoints that
publish it:

- `docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md`
- `docs/architecture/components/engine/contracts/engine/IProviderAdapter.v1.md`
- `docs/architecture/components/engine/contracts/engine/RunEvents.v1.md`
- `docs/architecture/components/engine/contracts/engine/ExecutionSemantics.v1.md`
- `docs/architecture/components/engine/contracts/engine/SignalsAndAuth.v1.md`
- `docs/architecture/components/engine/contracts/engine/index.md`
- `docs/architecture/components/engine/contracts/README.md`
- `docs/architecture/components/engine/contracts/capabilities/README.md`

## Repository mode

The repository is currently operating in pre-stable mode:

- one live contract line per topic
- one canonical `v1` file per active engine-runtime topic
- no parallel active generations for the same topic
- no redirect stubs, `reference` companions, or migration guides for the same
  active topic

## Canonical file naming

The active engine-runtime line is anchored on `v1`.

- `MyContract.v1.md` is the only active canonical contract for that topic.

The active tree must not publish for the same engine-runtime topic:

- `MyContract.v1.1.md`
- `MyContract.v2.0.md`
- `MyContract.reference.v1.md`
- redirect stubs that only point at another active contract
- migration companions that preserve a second active reading path

## Change rules in pre-stable mode

### Clarification-only changes

Rule:

- keep `MyContract.v1.md`
- update the file in place
- keep all dependent registries, ADRs, diagrams, and planning surfaces aligned

### Semantic changes

Rule:

- still keep `MyContract.v1.md` as the only active file
- rewrite the contract in place
- update registries, companion entrypoints, ADRs, diagrams, and planning
  surfaces in the same slice
- remove superseded sibling files for the same topic in the same slice

There is no active coexistence window in pre-stable mode.

## Required update set

When the engine-runtime boundary changes, update all applicable surfaces in the
same slice:

- `docs/architecture/components/engine/contracts/index.md`
- the affected `v1` contract files
- `docs/architecture/components/engine/contracts/README.md`
- `docs/architecture/components/engine/contracts/engine/index.md`
- `docs/architecture/components/engine/contracts/capabilities/README.md`
- `docs/CONTRIBUTING.md` when contributor-facing versioning guidance changes
- ADR and inventory references that point to the active pack
- current subsystem docs and diagrams when behavior changes

Do not leave multiple plausible reading paths for the same active boundary.

## References

- [IWorkflowEngine.v1.md](./engine/IWorkflowEngine.v1.md)
- [IProviderAdapter.v1.md](./engine/IProviderAdapter.v1.md)
- [RunEvents.v1.md](./engine/RunEvents.v1.md)
- [ExecutionSemantics.v1.md](./engine/ExecutionSemantics.v1.md)
- [SignalsAndAuth.v1.md](./engine/SignalsAndAuth.v1.md)
- [Engine Contracts Registry](./README.md)

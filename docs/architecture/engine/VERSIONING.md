# Contract Versioning Policy

[<- Back to Engine Index](./index.md)

**Status**: NORMATIVE
**Version**: 1.0
**Scope**: Contract documents under `docs/architecture/engine/contracts/**`
**Owners**: Architecture team, engine leads

---

## Purpose

This document defines how engine contracts evolve without creating avoidable filename churn or compatibility ambiguity.

Use this policy for:

- interface contracts
- execution semantics contracts
- state-store contracts
- security contracts
- versioned JSON schemas that are treated as normative artifacts

---

## Canonical File Naming

The default rule is one canonical file per active major line.

- `MyContract.v1.md` = canonical file for the `v1.x` major line
- `MyContract.v2.md` = canonical file for the `v2.x` major line
- `MyContract.reference.v1.md` = informative companion, not the normative contract itself
- `MyContract.v2.0-DRAFT.md` = allowed only for an explicitly staged future major release

Minor and patch changes do not require a new filename by default.

That means:

- update the in-file `Version` field and `Change Log`
- keep links pointing at the canonical major-line file
- avoid publishing `MyContract.v1.1.md` as a new canonical target unless two minor-line files must coexist temporarily for a controlled migration

Current example:

- `IWorkflowEngine.v1.md` is the canonical contract for the active `v1.x` line

---

## Version Bump Rules

### Patch

Use a patch update for clarification-only changes.

Examples:

- wording fixes
- examples corrected without changing meaning
- typo fixes
- metadata cleanup

Patch updates:

- keep the same filename
- update the in-file version, such as `1.0` -> `1.0.1`
- add a `Change Log` entry
- optionally tag the repo for traceability

### Minor

Use a minor update for backward-compatible changes.

Examples:

- adding an optional field
- adding an optional method
- adding a new enum value that consumers must tolerate
- relaxing a validation constraint

Minor updates normally:

- keep the same canonical major-line filename
- update the in-file version, such as `1.0` -> `1.1`
- update the `Change Log`
- update dependent docs if the new capability matters to readers

### Major

Use a major update for breaking changes.

Examples:

- removing a required field
- renaming a required field or method
- changing event semantics
- tightening compatibility in a way that breaks existing consumers

Major updates:

- create a new canonical file, such as `MyContract.v2.md`
- keep the old major file during the deprecation window
- add migration guidance where needed
- update the engine index and all canonical references

---

## Deprecation Process

When a major line is being retired:

1. Mark the old contract as deprecated in the file itself.
2. Point readers to the replacement contract.
3. Update indexes and other canonical entrypoints.
4. Keep the old major line available for the declared grace period.
5. Remove it only after the grace period and any migration commitments are complete.

Default grace period:

- 90 days from the release tag or published migration announcement, unless an ADR defines a different window

Minimum deprecation notice:

```md
> DEPRECATED: This contract is superseded by `MyContract.v2.md`.
> Support ends on YYYY-MM-DD.
```

---

## Required Update Set

When you change a normative contract, update all of the following as applicable:

- the contract `Version`
- the `Change Log`
- the engine index or other section index
- examples and snippets that describe the old behavior
- dependent contracts, guides, and runbooks when behavior changed

Do not leave reference docs pointing at filenames that are no longer canonical.

---

## Compatibility Expectations

Contract consumers are expected to:

- tolerate documented minor-version additions on the active major line
- reject unsupported major lines explicitly
- avoid hardcoding assumptions that contradict the contract `Change Log`

Contract authors are expected to:

- keep prose and examples aligned with the active canonical file
- prefer one canonical target per topic
- avoid creating alias files just to preserve old paths

---

## References

- [IWorkflowEngine.v1.md](./contracts/engine/IWorkflowEngine.v1.md)
- [ExecutionSemantics.v1.md](./contracts/engine/ExecutionSemantics.v1.md)
- [State Store Contract](./contracts/state-store/README.md)
- [Engine Index](./index.md)

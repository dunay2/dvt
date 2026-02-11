# Contract Versioning Policy

**Audience:** Architecture reviewers, SDK implementers, contract authors  
**Stability:** NORMATIVE (v1.0)  
**Effective Date:** February 11, 2026

---

## Overview

This document defines the versioning strategy for normative contracts in the DVT Workflow Engine. It establishes clear rules for when to increment major vs. minor versions, deprecation procedures, and migration paths.

### Why This Matters

- **Stability Guarantees**: Callers depend on contracts; breaking changes must be signaled clearly
- **Migration Windows**: Implementations need time to adapt; we provide structured timelines
- **Backward Compatibility**: Minor updates should never break existing implementations
- **Deprecation Clarity**: Sunset dates prevent indefinite legacy support

---

## Semantic Versioning

All contracts follow **Semantic Versioning 2.0.0** (semver):

```
MAJOR.MINOR.PATCH
v1.0.0
↓   ↓   ↓
│   │   └─ Patch: Documentation fixes, clarifications (no normative changes)
│   └───── Minor: Backward-compatible additions
└───────── Major: Breaking changes
```

### Releases vs. File Series

- **Contract files** are versioned as **MAJOR.MINOR series** (e.g., `IWorkflowEngine.v1.0.md`, `ExecutionSemantics.v2.0.md`)
- **PATCH versions are tracked via git tags** (e.g., `engine/IWorkflowEngine@v1.0.1`, `@v1.0.2`) and do not create new files
- PATCH changes are limited to documentation fixes or clarifications that do not change normative requirements
- **Auditability**: Each patch tag corresponds to a commit; revert/audit trails are clear in git history

**Example**:
```
File name (series):   IWorkflowEngine.v1.0.md
Release tags:         engine/IWorkflowEngine@v1.0.0  (initial release)
                      engine/IWorkflowEngine@v1.0.1  (doc clarification)
                      engine/IWorkflowEngine@v1.0.2  (typo fix, same semantics)
```

---

## Change Classification

### Backward Compatibility Definition

A change is considered **MINOR** (backward compatible) only if it is backward compatible for:
- **Producers** of the contract (they can continue emitting/sending old shapes without modification)
- **Consumers** of the contract (they can continue accepting/handling old shapes without modification)

**If either side can break without modification → the change is MAJOR.**

Examples:
- ✅ **MINOR**: Add optional field (producers ignore, consumers accept both old and new)
- ❌ **MAJOR**: Remove field from required set (consumers might assume it exists; contract semantic changes)
- ❌ **MAJOR**: Narrow enum or add pattern constraint (producers constrained tighter; silent breakage risk)
- ❌ **MAJOR**: Change field semantics (even if type stays same; meaning decoupled from structure)

---

### 1. MINOR Update (v1.0 → v1.1)

✅ **Allowed breaking change: NONE** — minor versions are backward compatible.

**Acceptable additions:**
- New optional field in JSON schema (`required: []` unchanged, no default-value semantics change)
- New optional method/procedure (existing code ignores it)
- Clarifications and documentation improvements (no normative change)
- Field constraint relaxation (e.g., wider valid range, relaxed pattern, expanded enum)

**Explicitly BANNED (these are MAJOR)**:
- Adding `minLength`, `pattern`, new enum constraints, or reducing numeric range
- Changing default semantics or interpreting an existing field's meaning
- Removing or renaming a field (even if optional)
- Any change that requires producer or consumer code modification

**Examples:**
- Add `TimeoutPolicy` as optional field to ExecutionRequest
- Add `onRetry` as optional callback in WorkflowHook
- Clarify error message wording for `InvalidTransitionError`

**Process:**
1. Draft changes in PR with title prefix `docs: (minor)`
2. Request review from contract author + 1 other maintainer
3. Update CHANGELOG: "Minor update to IWorkflowEngine (v1.0 → v1.1)"
4. Tag release as `engine/IWorkflowEngine@v1.1.0`
5. No deprecation window needed

**Backward Compatibility Guarantee:**
```
INVARIANT: Code consuming v1.0 works unmodified with v1.1
- Old implementations ignore new optional fields
- New methods have safe defaults
- Constraints never tighten (only relax)
```

---

### 2. MAJOR Update (v1.0 → v2.0)

⚠️ **Breaking changes allowed — requires deprecation window.**

**Examples of breaking changes:**
- Remove field from required set
- Rename field or method
- Change type of field (e.g., string → object)
- Add new `required` field with no default
- Change error code or exception type
- Modify execution guarantee (e.g., at-least-once → at-most-once)

**Examples:**
- Rename `StatusUpdate` → `ExecutionUpdate` in event schema
- Add mandatory `correlationId` field to execution request
- Change `ErrorCode.TIMEOUT` enum value
- Modify retry semantics from exponential → linear backoff

**Process:**

```
Month 1 (Proposal):
├─ Author creates RFC PR
├─ Title: "refactor: (major) IWorkflowEngine v1.0 → v2.0 proposal"
├─ Includes: rationale, migration guide, examples
└─ Requires: 3+ approvals (architecture, SDK lead, ops)

Month 2 (Stabilization):
├─ v2.0-DRAFT published (`IWorkflowEngine.v2.0-DRAFT.md` in feature branch)
├─ Implementations can opt-in to testing v2.0-DRAFT
├─ Feedback integrated into v2.0 final
└─ Timeline: 4 weeks for stabilization

Month 3 (Release):
├─ v2.0 released ("STABLE", v1.0 marked "DEPRECATED")
├─ v1.0 tagged with deprecation notice
├─ CHANGELOG entry: "v2.0 released; v1.0 sunset: Month 6"
└─ Implementations have 3-month grace period

Month 4-6 (Sunset Window):
├─ v1.0 contract remains available ("DEPRECATED, 90-day grace period")
├─ SDK continues accepting v1.0 implementations (issues warnings)
├─ Runbooks published: "Migrating from IWorkflowEngine v1.0 to v2.0"
└─ GitHub issues labeled: #migration-path, #support-window

Month 6+ (Removal):
├─ v1.0 moved to docs/deprecated/
├─ SDK drops support for v1.0 (next major SDK release)
└─ Runbooks archived
```

**Superseding Guarantees:**
```
INVARIANT: v2.0 can coexist with v1.0 briefly during grace period
- SDK may accept both v1.0 and v2.0 implementations
- Adapters clearly labeled by supported version
- Runtime must NOT assume all components v2.0
```

---

## Deprecation Window Details

### Timeline Triggers

**Start Date**: When v2.0 is **tagged as STABLE** (release tag, e.g., `engine/IWorkflowEngine@v2.0.0`), not when merged to main (main continues to evolve)
**Duration**: 90 calendar days from release tag date
**End Date**: 90 days after release tag date

### Notifications

**In contract file header** (all three versions):
```markdown
# IWorkflowEngine.v1.0.md
**Status**: DEPRECATED (EOL: May 11, 2026)
**Replacement**: [IWorkflowEngine.v2.0.md](./IWorkflowEngine.v2.0.md)
**Grace Period**: 90 days from release (Feb 11 → May 11, 2026)
```

**In SDK release notes**:
```
✋ DEPRECATION NOTICE
IWorkflowEngine v1.0 will reach end-of-life on May 11, 2026.
Current implementations: Migrate to v2.0
Migration guide: [docs/architecture/engine/migration/v1.0-to-v2.0.md](...)
Support: GitHub Discussions #tag:engine-migration
```

**In runbooks** (`docs/runbooks/engine-migration-v1.0-to-v2.0.md`):
```markdown
# Migrating from IWorkflowEngine v1.0 to v2.0

## Changes
- [ ] Replace imports: `IWorkflowEngine.v1.0` → `IWorkflowEngine.v2.0`
- [ ] Update error handlers (new error codes)
- [ ] Verify event consumption patterns
- [ ] Test adapter compatibility

## Support
- Deadline: May 11, 2026
- Stuck? File issue with label #migration-help
- Timeline: 90-day grace period from Feb 11, 2026
```

---

## Contract Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│  Contract Lifecycle: Birth → Superseding → Sunset              │
└────────────────────────────────────────────────────────────────┘

    PROPOSAL      STABLE          DEPRECATED          ARCHIVED
      ↓             ↓               ↓                   ↓
    Draft →      v1.0          v1.0 (90-day)      Moved to /
  (RFC stage)  (normative)     grace period      deprecated/
                                 ↓ 
                                v2.0
                             (normative)
                            [new default]


[Day 0]                    [Day 90]              [Day 180]
File created             v2.0 released         v1.0 removed
                         v1.0 deprecated       from HEAD
                         Grace period          (archived)
                         starts
```

### Status Markers in Filenames

**Standard naming**:
```
IWorkflowEngine.v1.0.md          (STABLE, current default)
IWorkflowEngine.v2.0-DRAFT.md    (proposal / pre-release for v2.0)
IWorkflowEngine.v2.0.md          (STABLE, new default after release)
```

**File naming rule**: Draft for vX.Y is named `vX.Y-DRAFT.md` (matches the target version: v2.0-DRAFT is the draft of v2.0)

**Status field in frontmatter:**
```yaml
---
title: IWorkflowEngine
version: 1.0.0
status: DEPRECATED
sunset_date: 2026-05-11
replacement: ./IWorkflowEngine.v2.0.md
---
```

---

## Review & Approval Gates

### Minor Update (v1.0 → v1.1) Gate
- **Required approvals**: 2 (contract author + 1 peer)
- **Review time**: 1 business day target
- **Merge path**: Direct to main (no release cycle)

### Major Update (v1.0 → v2.0) Gate
- **Required approvals**: 3+ (architecture + SDK lead + operations)
- **Review time**: 1 week target for RFC
- **Merge path**: Feature branch → release candidate → tagged release
- **Testing**: All adapter implementations tested against v2.0-DRAFT
- **Rollback**: If critical issues found, v2.0-DRAFT → v1.0-only for next quarter

---

## Examples

### Example 1: Adding Optional Field (Minor)

**Proposal:**
```
Title: docs: add optional TimeoutPolicy field to ExecutionRequest

Changes:
- ExecutionRequest.schema.json: add "timeoutPolicy": { optional }
- IWorkflowEngine.v1.0.md: document new field in "Optional Extensions"
- No type changes, no required field changes

Impact: Backward compatible (old implementations ignore field)
```

**Outcome:** v1.1 released, no deprecation window needed

---

### Example 2: Renaming Field (Major)

**Proposal:**
```
Title: refactor: (major) IWorkflowEngine v1.0 → v2.0 rename StatusUpdate

Changes:
- Rename "StatusUpdate" → "ExecutionUpdate" throughout
- Update all field names and docs
- Provide v1.0 ↔ v2.0 translation helper

Impact: BREAKING - old code using StatusUpdate breaks
```

**Timeline:**
- **Week 1**: RFC approved (3+ reviewers)
- **Weeks 2-4**: v2.0-DRAFT available, adapters tested
- **Week 5**: v2.0 released to main (v1.0 marked DEPRECATED)
- **Weeks 5-8**: 90-day grace period (implementations can still use v1.0)
- **Week 13+**: v1.0 removed from HEAD, archived

---

### Example 3: Adding Required Field (Major)

**Proposal:**
```
Title: refactor: (major) IWorkflowEngine v1.0 → v2.0 add correlationId

Changes:
- Add "correlationId": { type: string, required: true } to ExecutionRequest
- All executions must include a unique correlation ID
- Adapters must propagate correlationId through retry chains

Impact: BREAKING - old code without correlationId fails
Mitigation: SDK auto-generates UUID if missing (one generation cycle)
```

**Timeline:** Same as Example 2 (90-day grace period)

---

## Decision Tree

Use this tree to classify your change:

```
Is your change adding/clarifying WITHOUT removing required fields?
├─ YES: Can old code work unmodified? (e.g., ignore new optional field)
│  └─ YES: MINOR update (v1.0 → v1.1) ✅ Low friction
│  └─ NO: MAJOR update (requires deprecation) ⚠️
└─ NO: Are you removing, renaming, or changing types?
   └─ YES: MAJOR update (requires 90-day grace period) ⚠️
   └─ NO: (shouldn't happen; ask architecture team)
```

---

## Contract Design & Compatibility

### 3.1 Contract Surface Taxonomy

Contracts consist of multiple surfaces, each with compatibility rules:

| Surface Type | Examples | Compat Rule |
|--------------|----------|-------------|
| **Interfaces** | IWorkflowEngine methods, signal API | MAJOR bump if signature changes |
| **Event Envelopes** | RunStateUpdate (bus/StateStore format) | MAJOR bump if event schema breaks consumers |
| **Schemas** | PlanRef, capabilities.schema.json, payloads | MAJOR bump if required fields added/removed |
| **Error Model** | Error codes, categories, retryability flags | MAJOR bump if codes reinterpreted or removed |
| **Capability Matrix** | Temporal vs Conductor feature parity | MINOR if columns added; MAJOR if parity downgraded |

**Rule**: A MAJOR bump in **any one surface** bumps the contract **MAJOR** (synchronized).

---

### 3.2 Compatibility Test Suite is Mandatory for MAJOR

Every MAJOR version bump must include:

**Deliverable**: `compat-tests/<contract>/v1_to_v2/`
```
compat-tests/
├── IWorkflowEngine/
│   ├── v1_to_v2/
│   │   ├── fixtures/
│   │   │   ├── v1.0-request.json (old API call)
│   │   │   ├── v2.0-request.json (new API call)
│   │   │   └── v1_to_v2_translator.ts (OPTIONAL: only if translation helper needed)
│   │   └── goldenfiles/
│   │       ├── v1_expected_output.json
│   │       └── v2_expected_output.json
│   └── test.ts (runs fixtures against both versions)
```

**Test requirements**:
- [ ] Old consumer code can parse new-version output (forward compat)
- [ ] New consumer code can parse old-version output (backward compat)
- [ ] Producers emitting old format → consumers accept
- [ ] Producers emitting new format → consumers accept

Translators (v1 ↔ v2 adapters) are **optional** if format is self-documenting; **tests are mandatory**.

---

### 3.3 Feature Negotiation & Capability Flags

New behavior introduced in a MINOR version must be guarded by one of:
- **Capability flag**: Runtime feature discovery (e.g., `supports("CorrelationIdPropagation")`)
- **No-op default**: New field ignored if absent
- **Safe degradation**: Graceful fallback if feature not present

**Rule**: Runtime must **not assume a capability flag exists**; unknown flags must be safely ignored.

**Example** (v1.1 adds optional correlation ID tracking):
```json
{
  "version": "v1.1",
  "correlationIdPropagation": true  // New in v1.1; v1.0 consumers ignore
}
```

If v1.0 consumer sees `correlationIdPropagation`, it silently ignores it (no error). This preserves backward compat.

---

### 3.4 Deprecation Clock Triggers on Release Tag

The deprecation 90-day clock starts when the tag is created, not when code lands in main.

**Why**: main evolves; release tags are immutable. Consumers must have a clear, fixed end-date tied to a release artifact.

**Procedure**:
1. v2.0 code lands in main (feature branch)
2. Tag created: `engine/IWorkflowEngine@v2.0.0` (← **deprecation clock starts here**)
3. Release notes published with EOL date (tag date + 90 days)
4. v1.0 remains available; main may continue accepting both versions for grace period

---

## Exceptions & Appeals

**When can we skip the 90-day deprecation window?**

Only in cases of:
- **Security vulnerability** in v1.0 (immediate removal)
- **Critical bug** preventing any honest implementation (rare)
- **Legal/compliance requirement** (immediate sunset)

**Process:**
1. File issue with label `#version-exception-request`
2. Requires architecture team vote (unanimous approval)
3. Document rationale in git commit message

---

## Related Documents

- [IWorkflowEngine.v1.0.md](./contracts/engine/IWorkflowEngine.v1.0.md) — First normative contract
- [ExecutionSemantics.v1.0.md](./contracts/engine/ExecutionSemantics.v1.0.md) — Execution guarantees contract
- [docs/runbooks/engine-migration-*.md](../runbooks/) — Migration guides (created per major release)
- [CHANGELOG.md](../../CHANGELOG.md) — Cumulative log of all contract changes

---

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-02-11 | v1.0 | Initial versioning policy |
| 2026-02-11 | v1.1 | Add surface taxonomy, mandatory compat tests, capability flags, deprecation clock trigger clarification |


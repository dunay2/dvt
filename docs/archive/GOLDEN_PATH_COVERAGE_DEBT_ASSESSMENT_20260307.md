---
title: Golden Path Coverage Debt Assessment
status: Archived
owner: docs
last_reviewed: 2026-03-07
---

# Golden Path Coverage Debt Assessment

Date: 2026-03-04  
Status: Pending  
Priority: High (CI/CD quality)

## Summary

Current golden-path coverage provides a minimal functional baseline, but it is still too thin to validate the highest-risk engine and adapter scenarios end to end.

## Current Coverage

Golden paths currently implemented:

- `plan-minimal`
- `plan-parallel`
- `plan-cancel-and-resume`

Entries not active in the baseline:

- `hello-world` (deprecated)
- `pause-resume` (deprecated)
- `retry` (not implemented)

Current effective coverage:

- fixture and hash determinism
- baseline consistency in `.golden/hashes.json`

## Gaps Identified

- real retry behavior with controlled failure injection
- complex workflow error paths
- multi-tenant isolation in end-to-end golden validation
- dead-letter and replay coverage as contractual golden cases
- coverage for real adapters beyond `mock` on critical paths

## Impact

- higher risk of undetected regressions in execution behavior
- weak CI signal for merge decisions in sensitive areas
- lower confidence in production contract invariants

## Proposed Actions

1. Implement a `retry` golden path with controlled failure injection.
2. Add a deterministic terminal-error golden path.
3. Add a multi-tenant golden path for expected read/write isolation.
4. Add a dead-letter plus replay golden path that covers the full flow.

## Done Criteria

- `retry` moves from `not-implemented` to `implemented` in `.golden/hashes.json`.
- At least 3 new high-risk golden paths are added.
- `Contracts & Determinism` CI blocks drift correctly for those scenarios.
- Related contract and golden-path documentation is updated and traceable.

## Critical Assessment

The original version of this note raised a valid concern, but it mixed several document types and was not well aligned with the repository's traceability model.

Main issues in the earlier draft:

- no explicit links to ADRs, risks, or evidence policy
- imprecise use of "golden paths" across contracts, execution, and multi-tenancy concerns
- no owner, deadline, or measurable prioritization basis
- no links to concrete code, tests, issues, or affected adapters
- partial confusion between technical debt and backlog for not-yet-built functionality
- weak fit with the existing Evidence Doc and Risk Register workflows

## Recommended Restructuring

Choose one of these target forms before continuing:

### Option A: Split into Risk Register Entries

Use one risk entry per gap, for example:

- missing retry golden coverage
- missing multi-tenant golden coverage
- missing dead-letter and replay golden coverage

### Option B: Convert into an Evidence Doc

Use a single evidence doc if the purpose is to justify and plan a coordinated coverage expansion.

### Option C: Turn it into a Guide

If the real intent is instructional, move the material into a guide that explains how to add new golden paths correctly.

## Conclusion

The concern is legitimate, but the document is more useful as a structured input to the traceability workflow than as a standalone mixed note. The next update should pick a single document type and align it with the established ADR, risk, and evidence patterns.

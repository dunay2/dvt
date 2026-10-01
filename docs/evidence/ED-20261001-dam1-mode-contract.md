---
title: DAM1 explicit LIVE and LOCAL mode contract
status: Draft
date: 2026-10-01
owners:
  - '@dvt/contracts'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/data-access/DataAccess.v1.ts
  - packages/@dvt/contracts/src/index.ts
evidence:
  tests:
    - packages/@dvt/contracts/test/data-access-mode.contract.test.ts
---

# DAM1 explicit mode contract

## Authority and scope

[#3511](https://github.com/dunay2/dvt/issues/3511) and its preimplementation [design](https://github.com/dunay2/dvt/issues/3511#issuecomment-5942049146) and [Fowler matrix](https://github.com/dunay2/dvt/issues/3511#issuecomment-5942073307) govern this contract-only slice. Governing sources: AGENTS.md, the governance inventory, ADR-0058/0064, command/query rail governance, the DAM1/LDC1 decisions and `.arc-policy.yaml`. Planning DB design `GH-3511-DATA-ACCESS-MODES` reuses Preview/Run rails; it introduces no new command/query, runtime adapter or persisted data authority.

## Change and proof

`DataAccessSelection` makes LIVE versus a pinned LOCAL generation explicit. `WorkingDataState` separates absent, provisional, ready and interrupted states. Its transition guard rejects a change of capture mid-attempt, loss of the previous READY generation, an invalid direct READY publication and a refresh that reuses the old generation identity. `DataPreviewProvenance` distinguishes a remote query, local sample and EOF-proven full local copy. Strict schemas reject SQL, paths, credentials, AUTO/HYBRID, mixed timestamps and ambiguous identifiers.

The RED contract run failed because none of these shared schemas existed. The subsequent focused run passed 37 tests, including a dependency-boundary assertion. Final package/lint/type/prepush results are recorded on #3511 and the PR after completion. No browser or provider claim is made by these contract tests.

## Limit and compatibility

This is a new public contract and export, not a replacement of `SourceDataSample.v1` or `TransformDataSample.v1`. Existing remote Preview/Run behavior remains unchanged. The contract does **not** make LOCAL execution operational; #3512/#3514-#3518 own wiring, storage, acquisition, provider limits and browser evidence. Client-provided generation IDs still require authorization and READY resolution in the protected rail. PostgreSQL, workspace DuckDB and Substrait authorities remain separate.

No test, lint or type rule was relaxed. No stub, fake adapter, fallback success path, compatibility façade or hidden TODO was introduced. This evidence does not count routed/skipped CI work as executed.

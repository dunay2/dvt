---
id: R-20260601-PLANNER-LOCAL-DOC-ARCHIVE
title: Planner local documentation archive can hide stale reference paths
status: Open
date: 2026-06-01
last_reviewed: 2026-09-15
owners:
  - '@dvt/planner'
  - docs
severity: Low
probability: Low
---

# R-20260601-PLANNER-LOCAL-DOC-ARCHIVE

## Context

The obsolete Planner documentation archive is retired under
[issue #3004](https://github.com/dunay2/dvt/issues/3004) and
[PR #3223](https://github.com/dunay2/dvt/pull/3223). Historical content remains in
Git, not in package-local copies, archive indexes, or preservation summaries.
Planning DB remains the architecture authority; current contracts, code, and
tests govern implementation.

## Risk

Active readers or evidence consumers can still follow retired Planner paths
instead of the current owning authority. This risk remains open until the
relevant consumers and integration checks are reconciled. Retaining obsolete
files is no longer an accepted mitigation.

## Mitigation

- Resolve current architecture through the existing Planning DB query rail;
  fail closed when that authority is unavailable instead of rebuilding it from
  historical Markdown.
- Reconcile active links, generated indexes, and current evidence obligations
  against surviving owners. Do not restore the retired archive to satisfy a
  stale reference.
- Run `pnpm docs:sync` and the manifest generator after structural changes.
- Run affected link, Markdown, governance, and pre-push checks before merge;
  record actual results and unexecuted checks in the governing issue and PR.
- Use exact Git revisions only where an existing current obligation requires
  provenance. An old migration record does not require preserving its former
  directory layout.

## Evidence

- [Retirement implementation and validation](https://github.com/dunay2/dvt/pull/3223)
- [Original migration record at its pre-retirement Git revision](https://github.com/dunay2/dvt/blob/88b7922f7246386959700da5866e330076f8dd97/docs/evidence/ed-20260601-planner-local-doc-archive.md)

The original migration record describes June's repository state, not a current
requirement to retain archived snapshots. This reconciliation does not claim
that all repository backlinks or the operational architecture authority have
been validated.

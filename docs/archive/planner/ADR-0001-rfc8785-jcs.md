---
title: Planner Local ADR-0001 RFC 8785 Canonicalization
status: Archived
owner: Architecture / Planner / Docs
last_reviewed: 2026-05-31
planning_type: historical
---

# ADR-0001: RFC 8785 Canonicalization (JCS)

Archived from `packages/@dvt/planner/docs/adr/ADR-0001-rfc8785-jcs.md`.
This is a historical package-local ADR snapshot, not a repository ADR.

Decision:

- Use `json-canonicalize` to canonicalize JSON according to RFC 8785.
- Compute hashes from canonical JSON only.

Rationale:

- Eliminates runtime-dependent object serialization behavior.
- Provides cross-language stable canonical format.

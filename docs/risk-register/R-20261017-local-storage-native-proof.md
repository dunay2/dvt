---
title: LOCAL storage pathname and native-creation verification limits
status: Open
date: 2026-10-17
owners:
  - api
planning_type: risk
---

# LOCAL storage pathname and native-creation verification limits

Scope: #3392-B candidate. This records remaining proof obligations, not approval
for a debt-bearing production rollout. Default OFF and Draft remain mandatory.

| Risk | Treatment | Remaining gate |
| --- | --- | --- |
| Native DB/WAL mode incompatible with strict 0600 | Reject, never auto-chmod or seed an empty DB | Real pinned-driver creation/reopen/WAL tests |
| Path replaced between checks and native use | Private service-owned ancestors; verify before/after session; pin physical identity | Threat-model review; no claim of atomic pathname security |
| Legitimate native temp lifecycle conflicts with pinned directory | No cleanup or recreation by session; preserve instance ownership | Actual spill/checkpoint lifecycle and concurrent native tests |
| Native callback already committed before final check fails | Return failure without fabricated rollback; preserve bytes | Consumers must reconcile result/evidence and not blindly retry writes |
| Caller mistakes storage identity for permission or generation | Infrastructure-only type; no auth token or metadata-store contract | Future #3393/#3394 composition before product exposure |
| Child spill permissions/ACLs not inspected continuously | Dedicated private directory; no per-request tree scan | Operator policy and native spill proof, no recursive repair |
| Driver regression despite positive filesystem suite | No native stub and no false PASS | Full dependency-backed suite, ARC-3 and prepush/CI |

The change does not address malicious same-UID/root/mount actors, Windows ACLs,
forensic erasure, shared filesystem writers, source permission revocation or
persisted generation correctness. It does not widen external DuckDB access.

Owner coordination: #3392 security, #3389 instance lifecycle, #3398 retention and
budgets; #3393 promotion and #3394 acquisition are still unimplemented consumers.
No new pipeline, scheduler, grants, endpoint or replacement security authority.

Acceptance evidence must distinguish native engine files from arbitrary filesystem
fixtures and shared-directory sentinel survival from measured engine spill.

Design/evidence: `docs/security/local-data-storage-boundary.md`;
`docs/evidence/ED-20261017-local-data-storage-boundary.md`.

---
title: Docs Staleness Audit 2026-05-05
status: Review
owner: Architecture / Docs
last_reviewed: 2026-05-06
planning_type: status
---

# Docs Staleness Audit 2026-05-05

This is a non-normative status snapshot. It records audit findings that were
preserved in a local stash and rechecked against current `main` after PR #1115,
PR #1116, and PR #1118. It does not replace canonical governance documents,
ADRs, lane state, docs policy, or CI rules.

## Governing Sources

- [Governance Document And Rule Inventory](./governance-document-rule-inventory.md)
- [DVT Docs Structure](../../DOCS_README.md)
- [Canonical Doc Code Matrix](./canonical-doc-code-matrix.md)
- [AI Work Protocol](../../guides/ai-work-protocol.md)
- [Planning Control Tower](../state/planning-control-tower.md)

## Integration Recommendation

Track this file as an audit snapshot only. Do not integrate the scratch files
that accompanied the original audit (`docs-audit.csv`, `docs-stale.txt`,
`docs-status.txt`, and `docs/planning/status/lanes-status-snapshot-20260505.md`)
unless a future task establishes a canonical source requirement for one of
them.

The original audit is useful because it identifies concrete staleness patterns,
but its remediation steps should be split into separate governed docs cleanup
tasks before files are moved, renamed, or promoted. This status file should not
be used as a parallel workboard or a replacement for lane YAML.

## Rechecked Findings

The following high-confidence findings still match current `main` and are worth
triage in a dedicated documentation cleanup PR:

| Area                   | Current observation                                                                                                                                                        | Recommendation                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Legacy review location | Five files still live under `docs/reviews/` rather than the current planning review/archive surfaces.                                                                      | Move or archive only after backlink checks and docs validation.                             |
| Superseded proposals   | Two `status: Superseded` runtime-and-contract proposals still live under `docs/planning/proposals/mandatory/runtime-and-contracts/`.                                       | Move to the existing superseded proposal area if current links can be preserved or updated. |
| Closeout filenames     | `docs/planning/closeouts/G7.1-closeout.md` and `docs/planning/closeouts/engine-deps-refactor-closeout.md` still lack the prevailing date-prefixed closeout naming pattern. | Rename in a focused docs structure PR with docs sync.                                       |
| Generated indexes      | Eight generated index files still show `last_reviewed: 2026-02-25`.                                                                                                        | Refresh through the canonical generator rather than hand-editing generated output.          |
| Draft closeouts        | Five closeout files are still marked `status: Draft`.                                                                                                                      | Review each against lane state and promote only when the closeout is confirmed final.       |

## Items Requiring Human Decision

The preserved audit also identified broader categories that should not be batch
changed without owner review:

- component architecture outputs marked `Draft`;
- feature manuals for shipped work that remain `Draft`;
- older planning reviews whose findings may already be closed;
- active TF-E2 frontend planning drafts;
- execution-model drafts that are cited by governance but still marked Draft;
- evidence files with lowercase status values.

These groups mix real drift with intentionally draft or historical material.
They should become owner-reviewed cleanup tasks rather than mechanical status
changes.

## Drop Recommendation

Drop the raw scratch artifacts from integration for this task:

- `docs-audit.csv`
- `docs-stale.txt`
- `docs-status.txt`
- `docs/planning/status/lanes-status-snapshot-20260505.md`

Those files are transient scan outputs or lane snapshots. Current governance
uses tracked source docs, lane YAML, and generated views instead of checked-in
scratch exports.

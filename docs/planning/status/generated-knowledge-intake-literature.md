---
title: Generated Knowledge Intake Literature
status: Active
owner: Architecture / Planning DB
last_reviewed: 2026-06-04
planning_type: status
---

# Generated Knowledge Intake Literature

The generated knowledge-intake literature is rendered outside Git to avoid
turning `buzon/` retirement into another large tracked prose surface.

Run:

```bash
pnpm governance:db:import -- --if-stale
pnpm docs:knowledge-intake:generate
```

The local render is written to:

```text
.generated-docs/planning/status/generated-knowledge-intake-literature.md
```

Use this render and `pnpm planning:db:query knowledge-intake` when retiring raw
analysis intake files. Do not copy the rendered inventory back into tracked
docs. The tracked page is only the stable navigation pointer.

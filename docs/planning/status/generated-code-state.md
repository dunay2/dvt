---
title: Generated Code State
status: Active
owner: docs
last_reviewed: 2026-05-12
planning_type: status
---

# Generated Code State

The generated code-state inventory is rendered outside Git to avoid merge
conflicts from source and test inventory churn.

Run:

```bash
pnpm docs:status:generate
```

The local render is written to:

```text
.generated-docs/planning/status/generated-code-state.md
```

Do not copy the rendered inventory back into tracked docs. The tracked page is
only the stable navigation pointer.

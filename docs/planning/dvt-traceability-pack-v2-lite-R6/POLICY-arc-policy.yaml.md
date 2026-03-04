---
title: ARC Policy (Policy-as-data)
status: Template
---

# `.arc-policy.yaml` (Template)

This file is **policy-as-data**. CI scripts read it to determine:

- whether a PR is ARC,
- minimum ARC level enforced by triggers,
- required artifacts per level,
- required checks per level,
- when risk register updates are mandatory.

```yaml
version: 1

# Glob triggers: if any changed file matches, enforce at least that ARC level.
triggers:
  - name: contracts
    globs:
      - 'specs/contracts/**'
      - 'packages/@dvt/contracts/**'
    min_arc_level: ARC-2
    require:
      evidence_doc: true
      risk_update: true

  - name: engine-core
    globs:
      - 'packages/@dvt/engine/**'
    min_arc_level: ARC-2
    require:
      evidence_doc: true
      risk_update: true

  - name: security
    globs:
      - 'security/**'
      - 'docs/security/**'
    min_arc_level: ARC-3
    require:
      evidence_doc: true
      risk_update: true
      rollout_notes: true

# Required tooling checks by ARC level (IDs referenced in CI guide)
checks:
  ARC-0: ['lint', 'test']
  ARC-1: ['lint', 'test']
  ARC-2: ['lint', 'test', 'schema-validate', 'contract-golden']
  ARC-3: ['lint', 'test', 'schema-validate', 'contract-golden', 'security-scan', 'compat-matrix']

# Paths for artifacts
artifacts:
  evidence_dir: 'docs/evidence'
  risk_dir: 'docs/risk-register'

# PR checklist markers (strings CI looks for)
pr_checklist:
  arc_level_key: 'ARC Level:'
  adr12_section_key: 'ADR-012 Criteria'
```

References:

- ADR-0000c (modular enforcement)
- ADR-012 (quality checklist)

---
title: DVT+ Traceability Pack v2 Lite R6
status: Archived
owner: docs
last_reviewed: 2026-03-07
planning_type: archive
---

# DVT+ Traceability Pack v2 Lite R6

Reference bundle snapshot imported into this repository on 2026-03-04.

This pack is kept as a bundled reference, not as the canonical source of the active repo workflow. The live implementation for ARC checks and documentation gates lives in the repo root under [`tools/ci`](../../../tools/ci) and in the active documentation tree under [`docs/evidence`](../../evidence/index.md) and [`docs/risk-register`](../../risk-register/index.md).

## Core Bundle Docs

- [Bundle README](README.md)
- [ADR-0000c - Modular Traceability Policy](ADR-0000c-modular-traceability-policy.en.md)
- [ADR-012 - Design Quality Criteria](ADR-012-design-quality-criteria.en.md)
- [Quick Start for Developers](QUICKSTART-dev.md)
- [AI Guide for Documentation Generation](AI-GUIDE-doc-generation.md)
- [CI Implementation Guide](GUIDE-ci-implementation.md)
- [ADR-012 Self-Evaluation Guide](GUIDE-adr012-self-eval.md)
- [Risk Register Guide](GUIDE-risk-register.md)
- [VS Code Productivity Guide](TOOLS-vscode-productivity.md)

## Templates and Examples

- [ARC Policy YAML Reference](POLICY-arc-policy.yaml.md)
- [PR Checklist Template](TEMPLATE-pr-checklist.md)
- [Evidence Doc Template](TEMPLATE-evidence-doc.md)
- [Risk Register Template](TEMPLATE-risk-register.md)
- [ARC-3 Example Change](EXAMPLE-arc3-breaking-change.md)
- [Real Change Example](EXAMPLE-real-change.md)

## Domain Guides

- [12-Factor Guide](./docs/guides/GUIDE-12factor.md)
- [Adapter Semantics Guide](./docs/guides/GUIDE-adapter-semantics.md)
- [API Design Guide](./docs/guides/GUIDE-api-design.md)
- [Append Authority / Event Store Guide](./docs/guides/GUIDE-append-authority-eventstore.md)
- [dbt Artifacts Ingestion Guide](./docs/guides/GUIDE-dbt-artifacts-ingestion.md)
- [Determinism and Replay Guide](./docs/guides/GUIDE-determinism-replay.md)
- [Event-Driven Guide](./docs/guides/GUIDE-event-driven.md)
- [OpenLineage / Marquez Guide](./docs/guides/GUIDE-lineage-openlineage-marquez.md)
- [Observability Guide](./docs/guides/GUIDE-observability.md)
- [SBOM / Supply Chain Guide](./docs/guides/GUIDE-sbom-supplychain.md)
- [Advanced Security Guide](./docs/guides/GUIDE-security-advanced.md)
- [TypeScript Strictness Guide](./docs/guides/GUIDE-typescript-strictness.md)

## Tooling Notes

- [Bundle CI Tooling README](tools/ci/README.md)
- [Bundle Risk Tooling README](tools/risk/README.md)

## Active Repo Equivalents

- [Repo ARC Check](../../../tools/ci/arc-check.mjs)
- [Repo Doc Check](../../../tools/ci/doc-check.mjs)
- [Documentation Restructuring Roadmap](../../planning/proposals/documentation-restructuring-diagnostic-and-roadmap.md)

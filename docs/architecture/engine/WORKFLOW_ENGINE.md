# ⚠️ DEPRECATED: WORKFLOW_ENGINE.md (Legacy Redirect)

**Status**: DEPRECATED (Feb 11, 2026)  
**Reason**: Partitioned into modular, versioned contracts for maintainability  
**Deprecation Window**: 90 days (migrate references by May 11, 2026)  
**Replacement**: [Engine Architecture Index](./INDEX.md)

---

## Migration Guide

This monolithic 3,227-line document has been **partitioned into 9 focused documents** organized by stability and consumer.

### ��� Where to Find Each Section

| Original Section | Content | New Home | Status |
|------------------|---------|----------|--------|
| **Section 1** | Engine Boundary (MUST/MUST NOT) | [IWorkflowEngine.v1.md § 1](./contracts/engine/IWorkflowEngine.v1.md#1-engine-requirements-must-contracts) | ✅ Extracted |
| **Section 2** | IWorkflowEngine Interface | [IWorkflowEngine.v1.md § 2](./contracts/engine/IWorkflowEngine.v1.md#2-iworkflowengine-interface) | ✅ Extracted |
| **Section 3** | PlanRef Versioning | [TemporalAdapter.spec.md § 1](./adapters/temporal/TemporalAdapter.spec.md#1-plan-transport-planref-versioning) | ✅ Extracted |
| **Section 4** | Temporal Mapping (Interpreter, Namespace, Workers) | [TemporalAdapter.spec.md § 2-5](./adapters/temporal/TemporalAdapter.spec.md) | ✅ Extracted |
| **Section 4.6** | Capability Matrix (Temporal vs Conductor) | [contracts/capabilities/adapters.capabilities.json](./contracts/capabilities/adapters.capabilities.json) | ✅ Extracted (JSON) |
| **Section 5** | Conductor Mapping (Phase 2) | [ConductorAdapter.spec.md](./adapters/conductor/ConductorAdapter.spec.md) | ✅ Extracted (DRAFT) |
| **Section 6** | ExecutionSemantics (StateStore, Events, Snapshots) | [ExecutionSemantics.v1.md](./contracts/engine/ExecutionSemantics.v1.md) | ✅ Extracted |
| **Section 6.0.5** | Snapshot Projection Rules | [ExecutionSemantics.v1.md § 1.5](./contracts/engine/ExecutionSemantics.v1.md#15-snapshot-projector-contract) | ✅ Extracted |
| **Section 8** | Observability (Metrics, Traces, Logs, SLOs) | [ops/observability.md](./ops/observability.md) | ✅ Extracted |
| **Section 8.5** | Alerting & SLA Violations | [ops/observability.md § 4-5](./ops/observability.md#section-4) | ✅ Extracted |
| **Section 20** | Incident Response | [ops/runbooks/incident_response.md](./ops/runbooks/incident_response.md) | ✅ Extracted |
| **Section 21.3** | Determinism Tooling (Pre-commit, Replay Tests) | [dev/determinism-tooling.md](./dev/determinism-tooling.md) | ✅ Extracted |
| **Appendix H** | Roadmap (Phases 1-4) | [roadmap/engine-phases.md](./roadmap/engine-phases.md) | ✅ Extracted |

---

## Quick Links by Role

**What is my role?** Click below:

### ���‍��� SDK Implementer
1. [IWorkflowEngine.v1.md](./contracts/engine/IWorkflowEngine.v1.md) — Interface + signals
2. [ExecutionSemantics.v1.md](./contracts/engine/ExecutionSemantics.v1.md) — State model
3. [TemporalAdapter.spec.md](./adapters/temporal/TemporalAdapter.spec.md) — Temporal-specific details

### ��� Plan Author
1. [dev/determinism-tooling.md](./dev/determinism-tooling.md) — Writing deterministic plans
2. [contracts/capabilities/README.md](./contracts/capabilities/README.md) — Capability validation
3. [contracts/capabilities/adapters.capabilities.json](./contracts/capabilities/adapters.capabilities.json) — What your adapter supports

### ��� SRE / On-Call
1. [ops/observability.md](./ops/observability.md) — Metrics, dashboards, SLOs
2. [ops/runbooks/incident_response.md](./ops/runbooks/incident_response.md) — Incident playbooks
3. [roadmap/engine-phases.md](./roadmap/engine-phases.md) — Phase status for capacity planning

### ��� Executive / Product
1. [roadmap/engine-phases.md](./roadmap/engine-phases.md) — Phases, timeline, risks
2. [ops/observability.md § 7](./ops/observability.md#section-7-slos-service-level-objectives) — SLOs & success metrics

### ���️ Architecture Review
1. [INDEX.md](./INDEX.md) — Full architecture overview
2. Start with contracts (section "Normative Contracts")

---

## Appendix: Why This Partition?

### Problem with Monolithic Document
- ✗ 3,227 lines in single file → hard to review (PRs touch everything)
- ✗ Normative (MUST semantics) mixed with informative (how-tos, roadmap)
- ✗ Prose capabilities matrix → ambiguous, not executable
- ✗ Operator runbooks hidden in 3K lines → hard to find at 3am incident

### Solution: Modular Contracts
- ✅ Contracts <500 lines each → reviewable, versionable (v1.0, v1.1, v2.0)
- ✅ Separated: normative (MUST, immutable) vs informative (evolve rápido)
- ✅ Capabilities as executable JSON schemas → code-gen ready
- ✅ Operators can find playbooks in dedicated docs

### Timeline
- **Feb 11**: Partition complete (this deprecation notice)
- **Feb 18**: All internal links migrated to new docs
- **Mar 11**: WORKFLOW_ENGINE.md removed
- **May 11**: External references expected to migrate (deprecation window: 90 days)

---

## How to Use This Guide

### If you have an old link to WORKFLOW_ENGINE.md
1. Find your section in the **"Where to Find Each Section"** table above
2. Click the new link
3. Update your bookmark / internal links

### If you're starting fresh
1. Go to [INDEX.md](./INDEX.md) — central navigation hub
2. Choose your role (SDK dev, SRE, PM, etc.)
3. Follow the recommended path

### If you need the raw text
This file is kept for 90 days as a redirect. After May 11, 2026:
- Git history still contains full WORKFLOW_ENGINE.md (run `git log` to see it)
- Links to new documents are permanent

---

## References

- [Engine Architecture Index (PRIMARY)](./INDEX.md)
- [Normative Contracts](./contracts/engine/)
- [Adapter Specifications](./adapters/)
- [Operations & Runbooks](./ops/)
- [Developer Tooling](./dev/)
- [Roadmap](./roadmap/)

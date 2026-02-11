# Frontend Architecture Index

**Version**: 1.0  
**Date**: 2026-02-11  
**Status**: Living Document  
**Location**: docs/architecture/frontend/

---

## Executive Summary

DVT Frontend architecture documentation. The frontend is NOT just "a pretty UI" — it has its own **normative contracts**, **semantic rules**, **state model**, and **golden paths** to ensure:

- **Maintainability**: Clear separation of concerns (UI / state / server-state / adapters)
- **Testability**: Contract tests, integration tests, e2e golden paths
- **Parity with Engine**: View models aligned with engine semantics (ExecutionSemantics.v1.md)
- **Operability**: Error handling, monitoring, audit viewer UX
- **Accessibility**: Keyboard navigation, ARIA, screen reader support

**Tech Stack** (agreed):
- **React Flow**: Graph editor ([reactflow.dev](https://reactflow.dev))
- **Zustand**: Client state management ([zustand-demo.pmnd.rs](https://zustand-demo.pmnd.rs))
- **TanStack Query**: Server state / caching ([tanstack.com/query](https://tanstack.com/query/latest))
- **OpenTelemetry**: Frontend observability ([opentelemetry.io](https://opentelemetry.io))
- **C4 Model**: Architecture diagrams ([c4model.com](https://c4model.com))

---

## 📂 Documentation Structure

### 1. Contracts UI↔Backend (Normative)

| File | Purpose | Status |
|------|---------|--------|
| [UI_API_CONTRACT.v1.md](contracts/UI_API_CONTRACT.v1.md) | REST API endpoints, payloads, errors, paginación | Normative |
| [UI_EVENT_STREAM.v1.md](contracts/UI_EVENT_STREAM.v1.md) | Streaming/polling rules for run updates | Normative |
| [VIEW_MODELS.v1.md](contracts/VIEW_MODELS.v1.md) | UI-ready models (RunSummary, NodeStatus, CostSnapshot) | Normative |

**Why normative?** Backend and frontend teams must agree on contract; changes require versioning.

---

### 2. Semántica del Editor (React Flow) (Normative-lite)

| File | Purpose | Status |
|------|---------|--------|
| [GRAPH_EDITING_SEMANTICS.v1.md](semantics/GRAPH_EDITING_SEMANTICS.v1.md) | Add/remove nodes/edges, constraints, undo/redo, autosave | Testable |
| [LAYOUT_SEMANTICS.v1.md](semantics/LAYOUT_SEMANTICS.v1.md) | Layout rules (ELK/dagre), pinned nodes, grouping | Testable |

**Why testable?** Golden path tests verify "add edge" behavior matches semantics doc.

---

### 3. Estado y Arquitectura (Informative)

| File | Purpose | Status |
|------|---------|--------|
| [FRONT_ARCHITECTURE.md](architecture/FRONT_ARCHITECTURE.md) | C4 diagrams + layered architecture | Informative |
| [STATE_MODEL.v1.md](architecture/STATE_MODEL.v1.md) | Zustand stores: graphStore, selectionStore, uiShellStore | Informative |
| [ERROR_MODEL.v1.md](architecture/ERROR_MODEL.v1.md) | Error types, UX patterns, optimistic rollback | Informative |

---

### 4. Pantallas y Golden Paths (Testable)

| File | Purpose | Status |
|------|---------|--------|
| [UI_SCREENS_INDEX.md](screens/UI_SCREENS_INDEX.md) | Screen map + routes | Informative |
| [GOLDEN_PATHS_UI.v1.md](golden-paths/GOLDEN_PATHS_UI.v1.md) | End-to-end user flows with acceptance criteria | Testable |

**Golden paths** drive e2e tests (Playwright/Cypress).

---

### 5. Seguridad en UI (Normative)

| File | Purpose | Status |
|------|---------|--------|
| [RBAC_UI_RULES.v1.md](security/RBAC_UI_RULES.v1.md) | Hide vs disable vs show (don't trust client-side filtering) | Normative |
| [AUDIT_VIEWER_UX.v1.md](security/AUDIT_VIEWER_UX.v1.md) | Audit search/filters, PII redaction | Normative |

**Why normative?** Security must match backend RBAC; UI cannot override.

---

### 6. Calidad: Tests, A11y, Performance (Informative)

| File | Purpose | Status |
|------|---------|--------|
| [TEST_STRATEGY_FRONT.md](quality/TEST_STRATEGY_FRONT.md) | Unit, integration, e2e, contract tests | Informative |
| [PERF_BUDGET.md](quality/PERF_BUDGET.md) | Limits: nodes visible, polling budget, lazy panels | Informative |
| [A11Y_GUIDELINES.md](quality/A11Y_GUIDELINES.md) | Keyboard shortcuts, focus management, ARIA | Informative |

---

## Design Principles

### 1. **Contracts First, UI Second**

Frontend ≠ just components. Define **view models** and **API contracts** before building UI.

### 2. **Parity with Engine**

If engine has `ExecutionSemantics.v1.md`, frontend needs `GRAPH_EDITING_SEMANTICS.v1.md`.

### 3. **Testability = Golden Paths**

Every documented golden path → e2e test. No "works on my machine" UX.

### 4. **No God Store**

Zustand stores by **responsibility**: `graphStore` ≠ `runMonitorStore` ≠ `uiShellStore`.

### 5. **Security: Trust Backend, Show Intent**

- Backend owns RBAC (API returns 403)
- Frontend shows/hides UI based on backend RBAC response
- Never filter sensitive data client-side

---

## References

### Internal
- [Product Definition](../../DVT_Product_Definition_V0.md) - User personas, use cases
- [Engine Architecture](../engine/INDEX.v1.0.md) - Backend contracts
- [ExecutionSemantics.v1.md](../engine/contracts/engine/ExecutionSemantics.v1.md) - Engine semantics (align UI)

### External
- [React Flow Docs](https://reactflow.dev) - Graph editor library
- [Zustand Docs](https://zustand-demo.pmnd.rs) - State management
- [TanStack Query](https://tanstack.com/query/latest) - Server state
- [C4 Model](https://c4model.com) - Architecture diagrams
- [OpenTelemetry](https://opentelemetry.io) - Frontend RUM

---

_Last updated: 2026-02-11_  
_Version: 1.0_  
_Status: Living document - frontend architecture evolves with features_

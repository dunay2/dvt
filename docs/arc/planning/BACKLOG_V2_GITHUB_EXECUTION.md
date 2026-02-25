# Backlog V2 — Ejecución en GitHub (Milestones + Issues + Evidencia)

<!--
Status: derived
Last-updated: 2026-02-21
Owner: dunay2
Source-of-truth: docs/planning/BACKLOG_V2_EPICS_AND_STORIES.md
-->

Este documento baja el backlog funcional a un **plan ejecutable en GitHub** y deja el formato de **evidencia** para auditoría.

## 1) Milestones a crear (1 por épica)

| Milestone                           | Épica    | Estado       |
| ----------------------------------- | -------- | ------------ |
| EPICA-1 Foundation & Core Contracts | ÉPICA 1  | ⬜ Pendiente |
| EPICA-2 Execution Planning          | ÉPICA 2  | ⬜ Pendiente |
| EPICA-3 Runner & Execution          | ÉPICA 3  | ⬜ Pendiente |
| EPICA-4 Cost & Guardrails           | ÉPICA 4  | ⬜ Pendiente |
| EPICA-5 Observabilidad E2E          | ÉPICA 5  | ⬜ Pendiente |
| EPICA-6 Plugin Runtime              | ÉPICA 6  | ⬜ Pendiente |
| EPICA-7 UI Shell & Graph Workspace  | ÉPICA 7  | ⬜ Pendiente |
| EPICA-8 Seguridad & Multi-Tenant    | ÉPICA 8  | ⬜ Pendiente |
| EPICA-9 Roundtrip Controlado        | ÉPICA 9  | ⬜ Pendiente |
| EPICA-10 Testing & Quality Gates    | ÉPICA 10 | ⬜ Pendiente |

## 2) Issues por historia de usuario (26 total)

### ÉPICA 1 — Foundation & Core Contracts

- [ ] US-1.1 Definir contratos base de dominio
- [ ] US-1.2 Ingestión de artefactos dbt
- [ ] US-1.3 Snapshot del grafo (CQRS)

### ÉPICA 2 — Execution Planning

- [ ] US-2.1 ExecutionPlan V2 contract
- [ ] US-2.2 Selection Translator
- [ ] US-2.3 Policy Engine plugin-based

### ÉPICA 3 — Runner & Execution

- [ ] US-3.1 Runner dbt Core aislado
- [ ] US-3.2 QUERY_TAG + correlación Snowflake
- [ ] US-3.3 Integración dbt Cloud API v2

### ÉPICA 4 — Cost & Guardrails

- [ ] US-4.1 Cost Provider interface
- [ ] US-4.2 Cost Guardrails plugin

### ÉPICA 5 — Observabilidad E2E

- [ ] US-5.1 OpenTelemetry tracing
- [ ] US-5.2 Logs streaming + redaction

### ÉPICA 6 — Plugin Runtime

- [ ] US-6.1 Plugin manifest + apiVersion
- [ ] US-6.2 Backend plugin execution

### ÉPICA 7 — UI Shell & Graph Workspace

- [ ] US-7.1 Graph read-only workspace
- [ ] US-7.2 Execution Plan UI

### ÉPICA 8 — Seguridad & Multi-Tenant

- [ ] US-8.1 Tenant/org/project/env model
- [ ] US-8.2 RBAC con Casbin
- [ ] US-8.3 Secrets + audit inmutable

### ÉPICA 9 — Roundtrip Controlado

- [ ] US-9.1 Drafts + optimistic locking
- [ ] US-9.2 Managed assets (Nivel 1)
- [ ] US-9.3 Ownership explícito (Nivel 2)

### ÉPICA 10 — Testing & Quality Gates

- [ ] US-10.1 Golden tests dbt
- [ ] US-10.2 Roundtrip tests
- [ ] US-10.3 Performance tests (50k nodos)

## 3) Evidencia mínima requerida (para cerrar la petición)

Para cada Milestone/Issue creado, registrar:

- URL de Milestone o Issue
- Fecha/hora de creación (UTC)
- Responsable
- Relación `Milestone ← Issues`

### Registro de evidencia

| Tipo      | Identificador | URL GitHub  | Fecha UTC   | Responsable | Estado |
| --------- | ------------- | ----------- | ----------- | ----------- | ------ |
| Milestone | EPICA-1       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Milestone | EPICA-2       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Milestone | EPICA-3       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Milestone | EPICA-4       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Milestone | EPICA-5       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Milestone | EPICA-6       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Milestone | EPICA-7       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Milestone | EPICA-8       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Milestone | EPICA-9       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Milestone | EPICA-10      | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-1.1        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-1.2        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-1.3        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-2.1        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-2.2        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-2.3        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-3.1        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-3.2        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-3.3        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-4.1        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-4.2        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-5.1        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-5.2        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-6.1        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-6.2        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-7.1        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-7.2        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-8.1        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-8.2        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-8.3        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-9.1        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-9.2        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-9.3        | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-10.1       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-10.2       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |
| Issue     | US-10.3       | _pendiente_ | _pendiente_ | _pendiente_ | ⬜     |

## 4) Notas operativas

- La creación efectiva en GitHub requiere CLI/API autenticada (`gh` o token).
- Si no hay autenticación en el entorno local, este archivo funciona como evidencia base y checklist para ejecución inmediata por CI o por un operador autenticado.

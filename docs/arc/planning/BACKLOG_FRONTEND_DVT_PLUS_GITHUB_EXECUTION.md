# Backlog Frontend DVT+ — Ejecución en GitHub (Milestones + Issues + Evidencia)

<!--
Status: derived
Last-updated: 2026-02-21
Owner: dunay2
Source-of-truth: docs/planning/BACKLOG_FRONTEND_DVT_PLUS_EPICS_AND_STORIES.md
-->

Este documento convierte el backlog frontend en un **plan ejecutable en GitHub** con formato auditable de evidencia.

## 1) Milestones a crear (1 por épica frontend)

| Milestone                                  | Épica    | Estado    |
| ------------------------------------------ | -------- | --------- |
| EPICA-F1 UI Shell & Navigation Foundation  | ÉPICA F1 | ✅ Creado |
| EPICA-F2 Graph Workspace                   | ÉPICA F2 | ✅ Creado |
| EPICA-F3 Execution Plan UX                 | ÉPICA F3 | ✅ Creado |
| EPICA-F4 Run Monitoring                    | ÉPICA F4 | ✅ Creado |
| EPICA-F5 Diff & Lineage UX                 | ÉPICA F5 | ✅ Creado |
| EPICA-F6 Cost & Guardrails UX              | ÉPICA F6 | ✅ Creado |
| EPICA-F7 Plugins UI                        | ÉPICA F7 | ✅ Creado |
| EPICA-F8 Security & Admin UX               | ÉPICA F8 | ✅ Creado |
| EPICA-F9 Observability, A11y & Performance | ÉPICA F9 | ✅ Creado |

## 2) Issues por historia de usuario (20 total)

### ÉPICA F1 — UI Shell & Navigation Foundation

- [x] US-F1.1 Definir shell principal y navegación lateral
- [x] US-F1.2 Sistema de paneles y modales global

### ÉPICA F2 — Graph Workspace

- [x] US-F2.1 Render DAG con interacción base
- [x] US-F2.2 Auto-layout con ELK/dagre y nodos fijados
- [x] US-F2.3 Búsqueda y filtrado en grafo

### ÉPICA F3 — Execution Plan UX

- [x] US-F3.1 Plan Preview con acciones RUN/SKIP/PARTIAL
- [x] US-F3.2 Explainability por decisión de plan

### ÉPICA F4 — Run Monitoring

- [x] US-F4.1 Timeline de ejecución con estados de step
- [x] US-F4.2 Logs, progreso y reconexión resiliente

### ÉPICA F5 — Diff & Lineage UX

- [x] US-F5.1 Diff view de cambios relevantes
- [x] US-F5.2 Lineage upstream/downstream

### ÉPICA F6 — Cost & Guardrails UX

- [x] US-F6.1 Cost snapshot en frontend
- [x] US-F6.2 Señales de guardrails y recomendaciones

### ÉPICA F7 — Plugins UI

- [x] US-F7.1 Catálogo de plugins con estado/compatibilidad
- [x] US-F7.2 Manejo seguro de fallos de plugin en UI

### ÉPICA F8 — Security & Admin UX

- [x] US-F8.1 Reglas RBAC visuales (hide/disable/read-only)
- [x] US-F8.2 Superficie admin restringida y auditada

### ÉPICA F9 — Observability, A11y & Performance

- [x] US-F9.1 Telemetría frontend con eventos clave
- [x] US-F9.2 Accesibilidad operativa de vistas críticas
- [x] US-F9.3 Performance budget para grafos grandes

## 3) Evidencia mínima requerida

Para cada Milestone/Issue creado, registrar:

- URL de Milestone o Issue
- Fecha/hora de creación (UTC)
- Responsable
- Relación `Milestone ← Issues`

### Registro de evidencia

| Tipo      | Identificador | URL GitHub                                 | Fecha UTC            | Responsable | Estado |
| --------- | ------------- | ------------------------------------------ | -------------------- | ----------- | ------ |
| Milestone | EPICA-F1      | https://github.com/dunay2/dvt/milestone/14 | 2026-02-15T19:53:36Z | dunay2      | ✅     |
| Milestone | EPICA-F2      | https://github.com/dunay2/dvt/milestone/15 | 2026-02-15T19:53:37Z | dunay2      | ✅     |
| Milestone | EPICA-F3      | https://github.com/dunay2/dvt/milestone/16 | 2026-02-15T19:53:39Z | dunay2      | ✅     |
| Milestone | EPICA-F4      | https://github.com/dunay2/dvt/milestone/17 | 2026-02-15T19:53:40Z | dunay2      | ✅     |
| Milestone | EPICA-F5      | https://github.com/dunay2/dvt/milestone/18 | 2026-02-15T19:53:41Z | dunay2      | ✅     |
| Milestone | EPICA-F6      | https://github.com/dunay2/dvt/milestone/19 | 2026-02-15T19:53:42Z | dunay2      | ✅     |
| Milestone | EPICA-F7      | https://github.com/dunay2/dvt/milestone/20 | 2026-02-15T19:53:43Z | dunay2      | ✅     |
| Milestone | EPICA-F8      | https://github.com/dunay2/dvt/milestone/21 | 2026-02-15T19:53:44Z | dunay2      | ✅     |
| Milestone | EPICA-F9      | https://github.com/dunay2/dvt/milestone/22 | 2026-02-15T19:53:45Z | dunay2      | ✅     |
| Issue     | US-F1.1       | https://github.com/dunay2/dvt/issues/169   | 2026-02-15T19:54:09Z | dunay2      | ✅     |
| Issue     | US-F1.2       | https://github.com/dunay2/dvt/issues/170   | 2026-02-15T19:54:12Z | dunay2      | ✅     |
| Issue     | US-F2.1       | https://github.com/dunay2/dvt/issues/171   | 2026-02-15T19:54:14Z | dunay2      | ✅     |
| Issue     | US-F2.2       | https://github.com/dunay2/dvt/issues/172   | 2026-02-15T19:54:16Z | dunay2      | ✅     |
| Issue     | US-F2.3       | https://github.com/dunay2/dvt/issues/173   | 2026-02-15T19:54:19Z | dunay2      | ✅     |
| Issue     | US-F3.1       | https://github.com/dunay2/dvt/issues/174   | 2026-02-15T19:54:22Z | dunay2      | ✅     |
| Issue     | US-F3.2       | https://github.com/dunay2/dvt/issues/175   | 2026-02-15T19:54:25Z | dunay2      | ✅     |
| Issue     | US-F4.1       | https://github.com/dunay2/dvt/issues/176   | 2026-02-15T19:54:28Z | dunay2      | ✅     |
| Issue     | US-F4.2       | https://github.com/dunay2/dvt/issues/177   | 2026-02-15T19:54:31Z | dunay2      | ✅     |
| Issue     | US-F5.1       | https://github.com/dunay2/dvt/issues/178   | 2026-02-15T19:54:34Z | dunay2      | ✅     |
| Issue     | US-F5.2       | https://github.com/dunay2/dvt/issues/179   | 2026-02-15T19:54:36Z | dunay2      | ✅     |
| Issue     | US-F6.1       | https://github.com/dunay2/dvt/issues/180   | 2026-02-15T19:54:39Z | dunay2      | ✅     |
| Issue     | US-F6.2       | https://github.com/dunay2/dvt/issues/181   | 2026-02-15T19:54:42Z | dunay2      | ✅     |
| Issue     | US-F7.1       | https://github.com/dunay2/dvt/issues/182   | 2026-02-15T19:54:45Z | dunay2      | ✅     |
| Issue     | US-F7.2       | https://github.com/dunay2/dvt/issues/183   | 2026-02-15T19:54:48Z | dunay2      | ✅     |
| Issue     | US-F8.1       | https://github.com/dunay2/dvt/issues/184   | 2026-02-15T19:54:51Z | dunay2      | ✅     |
| Issue     | US-F8.2       | https://github.com/dunay2/dvt/issues/185   | 2026-02-15T19:54:53Z | dunay2      | ✅     |
| Issue     | US-F9.1       | https://github.com/dunay2/dvt/issues/186   | 2026-02-15T19:54:57Z | dunay2      | ✅     |
| Issue     | US-F9.2       | https://github.com/dunay2/dvt/issues/187   | 2026-02-15T19:54:59Z | dunay2      | ✅     |
| Issue     | US-F9.3       | https://github.com/dunay2/dvt/issues/188   | 2026-02-15T19:55:02Z | dunay2      | ✅     |

## 4) Notas operativas

- Requiere `gh` autenticado con permisos de repo.
- Convención de labels recomendada: `epic`, `story`, `frontend`, `ui`, `ux`, `security`, `observability`, `testing`.
- Idioma operativo recomendado en GitHub: inglés para títulos y cuerpo de issues.

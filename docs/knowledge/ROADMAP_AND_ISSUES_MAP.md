# Roadmap, Estado e Issues — Mapa de Conocimiento

## 1. Fuentes principales

- Roadmap global: [`ROADMAP.md`](../../ROADMAP.md)
- Índice docs: [`docs/INDEX.md`](../INDEX.md)
- Estado de implementación: [`docs/status/IMPLEMENTATION_SUMMARY.md`](../status/IMPLEMENTATION_SUMMARY.md)
- Backlog V2 funcional: [`docs/planning/BACKLOG_V2_EPICS_AND_STORIES.md`](../planning/BACKLOG_V2_EPICS_AND_STORIES.md)
- Backlog V2 ejecución GitHub: [`docs/planning/BACKLOG_V2_GITHUB_EXECUTION.md`](../planning/BACKLOG_V2_GITHUB_EXECUTION.md)
- Evidencia/refresh issues (local): [`.gh-comments`](../../.gh-comments)

---

## 2. Estado estratégico (síntesis)

Según [`ROADMAP.md`](../../ROADMAP.md):

- Fase 1 MVP: en progreso con varios hitos cerrados y bloqueos críticos aún abiertos.
- Fase 1.5 Hardening: planificada.
- Fase 2 Tooling: parcialmente planificada, con deuda en determinismo/adapters.
- Track Frontend DVT+: backlog y estructura GitHub creados.

### 2.1 Actualización de desbloqueo (2026-02-16)

Estado publicado tras completar ADR-0002 Fase 2 (automatización de Knowledge Graph):

- ✅ Generación dinámica de Cypher habilitada (`kg:generate`).
- ✅ Snapshot versionado y validado (`scripts/neo4j/generated-repo.cypher`).
- ✅ Gate de sincronía activo en CI (`kg-cypher-sync` ejecutando `kg:check`).
- ✅ Regeneración automática en pre-commit para cambios relevantes (ADRs/KG scripts).

Impacto de desbloqueo inmediato:

- Se elimina deriva silenciosa entre documentación local y grafo ejecutado.
- La PR falla temprano si el snapshot del grafo no está actualizado.
- Se reduce fricción para trazabilidad ADR→código en sesiones AI y revisiones técnicas.

Según [`docs/status/IMPLEMENTATION_SUMMARY.md`](../status/IMPLEMENTATION_SUMMARY.md):

- Base de contratos/golden-path funcional en CI.
- Engine core y hardening relevante ya mergeados.
- Paridad de adapters y cobertura determinista cross-adapter siguen como brecha.

---

## 3. Issues y dependencias clave (lectura operativa)

### 3.1 Cadena crítica histórica (MVP)

Documentada en [`ROADMAP.md`](../../ROADMAP.md): #8 → #9 → #2 → #14 → #15 → #5/#6 → #16 → #10 → #17.

### 3.2 Estado resumido por evidencia interna

- #14: mayormente implementado, con drift de checklist/nomenclatura (ver [`.gh-comments/issue-14-status-refresh-2026-02-15.md`](../../.gh-comments/issue-14-status-refresh-2026-02-15.md)).
- #68: adapter temporal activo casi cerrable (pendiente alineación final de tracking).
- #6: base Postgres MVP implementada; falta hardening full.
- #69/#71: expansión Conductor aún bloqueada/no iniciada.
- #72/#73: enforcement/version-binding y determinismo cross-adapter incompletos.

---

## 4. Backlog V2 (producto/plataforma)

### Estado de alineación funcional

Fuente: [`docs/planning/BACKLOG_V2_EPICS_AND_STORIES.md`](../planning/BACKLOG_V2_EPICS_AND_STORIES.md)

- Parcial/alta alineación: contratos base, parte de execution planning, seguridad base.
- Baja alineación: ingestión dbt, runner dbt aislado, workspace UI, roundtrip controlado, performance 50k.

### Estado de ejecución GitHub

Fuente: [`docs/planning/BACKLOG_V2_GITHUB_EXECUTION.md`](../planning/BACKLOG_V2_GITHUB_EXECUTION.md)

- Define 10 milestones + 26 historias como plan ejecutable.
- Tabla de evidencia aún marcada como pendiente.

---

## 5. Riesgos de gestión detectados

1. **Drift doc ↔ issue ↔ código**
   - Hay funcionalidades implementadas con issues todavía abiertos o desalineados en aceptación.

2. **Paridad adapters como cuello de botella**
   - Riesgo de bloquear validación e2e determinista real.

3. **Dualidad roadmap técnico vs backlog producto**
   - Necesita puente explícito de trazabilidad para priorización y reporting.

---

## 6. Recomendación operativa inmediata

1. Normalizar estados de issues críticos según evidencia actual.
2. Convertir backlog V2 en milestones/issues reales con evidencias UTC.
3. Mantener sincronía semanal entre:
   - [`ROADMAP.md`](../../ROADMAP.md)
   - [`docs/status/IMPLEMENTATION_SUMMARY.md`](../status/IMPLEMENTATION_SUMMARY.md)
   - [`docs/planning/BACKLOG_V2_GITHUB_EXECUTION.md`](../planning/BACKLOG_V2_GITHUB_EXECUTION.md)

# Backlog V2 — Épicas + Historias de Usuario

> Objetivo: convertir esta propuesta en base operativa para milestones/issues de GitHub y verificar alineación con el estado actual del repositorio.

## Convención recomendada para GitHub

- 1 milestone por épica (`EPICA-1 Foundation & Core Contracts`, etc.).
- 1 issue por historia de usuario (`US-1.1 ...`, `US-1.2 ...`).
- Etiquetas sugeridas: `epic`, `story`, `contracts`, `engine`, `runner`, `plugin`, `ui`, `security`, `testing`.

## Estado de alineación (resumen)

- Alta alineación parcial en contratos de engine, versionado y seguridad base.
- Alineación media en execution planning y plugin architecture.
- Alineación baja en ingestión dbt, runner dbt aislado, UI workspace y multi-tenant operativo.

## ÉPICA 1 — Foundation & Core Contracts

### US-1.1 — Definir contratos base de dominio

Como arquitecto, quiero contratos estables para el dominio para evitar churn.

**Entregables**

- JSON Schema: `LogicalGraph (GCM)`, `CanvasState`, `ProvenanceEvent`
- Paquete compartido Zod ↔ JSON Schema
- Versionado (`schemaVersion`)

**Alineación actual:** 🟡 Parcial

### US-1.2 — Ingestión de artefactos dbt

Como sistema, quiero convertir artefactos dbt en un grafo semántico estable.

**Incluye**

- Parser `manifest.json` → GCM
- Parser `catalog.json` → metadata
- Parser `run_results.json` → run node stats
- Golden tests con `jaffle_shop`

**Alineación actual:** 🔴 Baja

### US-1.3 — Snapshot del grafo (CQRS)

Como backend, quiero snapshots para lecturas rápidas.

**Incluye**

- Tabla `graph_snapshot`
- Tabla `node_index` (search)
- Tabla `impact_index`
- Rebuild incremental

**Alineación actual:** 🟡 Parcial

## ÉPICA 2 — Execution Planning (sin ejecución)

### US-2.1 — ExecutionPlan V2 contract

Como usuario, quiero ver exactamente qué se va a ejecutar y por qué.

**Incluye**

- JSON Schema `ExecutionPlan`
- Acciones `RUN` / `SKIP` / `PARTIAL`
- Explainability obligatoria

**Alineación actual:** 🟡 Parcial

### US-2.2 — Selection Translator

Como sistema, debo traducir el plan a dbt real.

**Incluye**

- `ExecutionPlan` → dbt selectors
- Soporte `state:modified`
- `--defer`, `--state` si aplica

**Alineación actual:** 🔴 Baja

### US-2.3 — Policy Engine plugin-based

Como plataforma, quiero políticas extensibles y deterministas.

**Incluye**

- Interface `Policy.evaluate(context)`
- Prioridades/pesos
- Resolución de conflictos
- Plugin registration

**Alineación actual:** 🟡 Parcial

## ÉPICA 3 — Runner & Execution

### US-3.1 — Runner dbt Core aislado

**Alineación actual:** 🔴 Baja

### US-3.2 — QUERY_TAG + correlación Snowflake

**Alineación actual:** 🔴 Baja

### US-3.3 — Integración dbt Cloud API v2

**Alineación actual:** 🔴 Baja

## ÉPICA 4 — Cost & Guardrails (plugin)

### US-4.1 — Cost Provider interface

**Alineación actual:** 🔴 Baja

### US-4.2 — Cost Guardrails plugin

**Alineación actual:** 🔴 Baja

## ÉPICA 5 — Observabilidad E2E

### US-5.1 — OpenTelemetry tracing

**Alineación actual:** 🟡 Parcial

### US-5.2 — Logs streaming + redaction

**Alineación actual:** 🟡 Parcial

## ÉPICA 6 — Plugin Runtime (crítica)

### US-6.1 — Plugin manifest + apiVersion

**Alineación actual:** 🟡 Parcial

### US-6.2 — Backend plugin execution

**Alineación actual:** 🟡 Parcial

## ÉPICA 7 — UI Shell & Graph Workspace

### US-7.1 — Graph read-only workspace

**Alineación actual:** 🔴 Baja

### US-7.2 — Execution Plan UI

**Alineación actual:** 🔴 Baja

## ÉPICA 8 — Seguridad & Multi-Tenant

### US-8.1 — Tenant/org/project/env model

**Alineación actual:** 🟡 Parcial

### US-8.2 — RBAC con Casbin

**Alineación actual:** 🟡 Parcial

### US-8.3 — Secrets + audit inmutable

**Alineación actual:** 🟡 Parcial

## ÉPICA 9 — Roundtrip Controlado

### US-9.1 — Drafts + optimistic locking

**Alineación actual:** 🔴 Baja

### US-9.2 — Managed assets (Nivel 1)

**Alineación actual:** 🔴 Baja

### US-9.3 — Ownership explícito (Nivel 2)

**Alineación actual:** 🔴 Baja

## ÉPICA 10 — Testing & Quality Gates

### US-10.1 — Golden tests dbt

**Alineación actual:** 🟡 Parcial

### US-10.2 — Roundtrip tests

**Alineación actual:** 🔴 Baja

### US-10.3 — Performance tests (50k nodos)

**Alineación actual:** 🔴 Baja

## Orden recomendado de implementación

1. Épica 1
2. Épica 2
3. Épicas 6 y 3 en paralelo controlado
4. Épicas 4, 5, 8
5. Épicas 7 y 9
6. Épica 10 como quality gate transversal

## DoR por historia

- Contrato/versionado identificado.
- Criterios de aceptación verificables.
- Riesgos de seguridad/tenancy declarados.
- Métricas mínimas de observabilidad definidas.

## DoD por historia

- Contrato y docs actualizados.
- Pruebas automatizadas asociadas.
- Evidencia de alineación arquitectura ↔ implementación.
- Issue vinculado a milestone/épica y estado actualizado.

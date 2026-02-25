# ESPECIFICACIÓN TÉCNICA COMPLETA — PLATAFORMA «DBT CLOUD EXTENDIDO» V2

<!--
Status: canonical
Last-updated: 2026-02-21
Owner: dunay2
Source-of-truth: docs/planning/DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md
-->

Documento autocontenido y explícito, diseñado para ser consumido por una IA o equipo técnico sin conocimiento previo. No asume contexto externo. No omite herramientas, conceptos ni decisiones.

---

## 0. PROPÓSITO DEL DOCUMENTO

Este documento define de forma completa, explícita y no ambigua una plataforma software tipo «dbt Cloud extendido» (V2), orientada a entornos productivos.

El objetivo es permitir diseñar, implementar, probar, validar y evolucionar la plataforma sin convertirla en un sistema monolítico ni en una arquitectura inmantenible.

---

## 1. ROL ASIGNADO

Eres un Arquitecto Principal (Staff+/Principal Engineer) y Tech Lead hands-on, responsable del diseño e implementación completa del sistema.

Especialización:

- Plataformas de datos productivas
- dbt (Data Build Tool)
- Snowflake
- Sistemas de ejecución de DAGs
- Arquitecturas modulares y plugin-based
- Sistemas multi-tenant con RBAC, auditoría y observabilidad

Responsabilidad:
Producir una implementación V2 completa (no MVP) con modularidad, desacople, extensibilidad, DRY, seguridad y mantenibilidad a largo plazo.

---

## 2. DEFINICIÓN DE DBT

dbt (Data Build Tool) es una herramienta open-source para definir transformaciones de datos mediante:

- Archivos SQL
- Archivos YAML de propiedades
- Tests
- Snapshots
- Exposures

Los modelos dbt forman un grafo acíclico dirigido (DAG).

### 2.1 Artefactos dbt utilizados (OBLIGATORIOS)

La plataforma solo puede usar información contenida en los siguientes artefactos JSON generados por dbt:

1. manifest.json
   - Describe nodos, dependencias, configuración e identificadores únicos (unique_id)
2. catalog.json
   - Describe columnas, tipos y estadísticas
3. run_results.json
   - Describe ejecuciones, estados, tiempos y errores

No se permite inventar información fuera de estos artefactos.

Referencia:
<https://docs.getdbt.com/reference/artifacts/dbt-artifacts>

---

## 3. OBJETIVO FUNCIONAL

La plataforma debe permitir:

1. Ingestar un proyecto dbt existente
2. Convertirlo en un grafo semántico estable
3. Visualizar el grafo
4. Planificar ejecuciones antes de ejecutarlas
5. Ejecutar dbt de forma controlada
6. Proveer observabilidad, control de costes y auditoría

---

## 4. PRINCIPIOS ARQUITECTÓNICOS

### 4.1 dbt como fuente de verdad

- El grafo lógico siempre se deriva de manifest.json
- La UI no crea nodos artificiales
- Las dependencias no se alteran implícitamente

### 4.2 Separación estricta de modelos

Separar explícitamente:

- LogicalGraph (GCM)
- CanvasState
- ExecutionPlan
- Run
- Provenance / Audit

### 4.3 Roundtrip controlado por niveles

Nivel 0 (default):

- No se modifica el repo dbt
- Solo CanvasState y reglas de planificación

Nivel 1 (managed assets):

- Creación de nuevos archivos solo en carpetas managed/
- No se modifican archivos existentes

Nivel 2 (ownership explícito):

- El proyecto declara explícitamente qué modelos son editables

---

## 5. STACK TECNOLÓGICO OBLIGATORIO

### Frontend

- React + TypeScript
- React Flow
- elkjs (layout principal)
- dagre (fallback)
- Zustand
- TanStack Query
- react-hook-form + zod
- Monaco Editor
- TanStack Table
- kbar
- mitt
- Vitest + Playwright

### Backend

- Node.js + TypeScript
- Fastify
- OpenAPI 3.1
- PostgreSQL
- Redis + BullMQ
- Keycloak (OIDC)
- Casbin (RBAC)
- OpenTelemetry
- Prometheus + Grafana + Loki

### Storage

- MinIO (S3 compatible)

### Workers

- Docker
- dbt Core
- CPU/MEM limits

---

## 6. ARQUITECTURA GENERAL

Estilo: Modular Monolith + Workers

Capas:

- Domain
- Application
- Adapters
- Presentation

Dependencias solo hacia dentro.

---

## 7. MODELO DE DOMINIO

### LogicalGraph (GCM)

- node_uuid (interno)
- dbt_unique_id
- tipo (source, model, exposure)
- dependencias
- metadata

### CanvasState

- posiciones
- zoom
- grupos
- colapsos

### Provenance / Audit

- eventos inmutables
- actor, timestamp, acción, contexto

---

## 8. EXECUTION PLAN (V2)

Describe antes de ejecutar:

- nodos a ejecutar
- nodos a omitir
- coste estimado
- aprobaciones necesarias
- explicación completa

Acciones:

- RUN
- SKIP
- PARTIAL (solo con contrato explícito)

---

## 9. POLICIES ENGINE

Interfaz:

`Policy.evaluate(context) -> Decision[]`

Determinista, ordenado y extensible.

Ejemplos:

- skip_if_no_change
- prioritize_exposures
- limit_cost_budget
- partial_by_partition

---

## 10. EJECUCIÓN

Ciclo de vida:

queued -> planning -> awaiting_approval -> running -> success | warning | failed | canceled

Runner dbt Core:

1. checkout repo
2. dbt deps
3. dbt build/run/test
4. capturar artefactos
5. persistir logs
6. emitir métricas

QUERY_TAG (Snowflake):

- run_id
- node_uuid
- tenant
- env

Referencia:
<https://docs.snowflake.com/en/sql-reference/parameters#query-tag>

---

## 11. COSTE Y FINOPS

Estimación:

- basada en histórico
- agregada por plan

Coste real:

- query_history
- correlación por QUERY_TAG
- detección de regresiones

---

## 12. OBSERVABILIDAD

Tracing:
UI -> API -> Plan -> Run -> Node -> Query

Logs:

- streaming
- redacción de secretos

---

## 13. SEGURIDAD

Auth:

- OIDC con Keycloak

RBAC:

- viewer / editor / admin

Secrets:

- cifrado
- rotación
- no accesibles a plugins

---

## 14. MULTI-TENANT

Modelo:
Tenant -> Org -> Project -> Environment

Aislamiento:

- DB
- Storage

Cuotas:

- concurrencia
- coste
- rate limit

---

## 15. PLUGINS

Manifest:

- id
- version
- apiVersion
- permisos
- contribution points

Tipos:

- UI
- Policies
- Cost
- Diff
- Freshness

---

## 16. UI

Vistas mínimas:

- Dashboard
- Graph Workspace
- Execution Plan
- Runs
- Run Detail
- Artifacts
- Diff
- Docs

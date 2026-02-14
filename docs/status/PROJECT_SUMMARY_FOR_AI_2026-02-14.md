# DVT — Resumen navegable para otras IAs (estado 2026-02-14)

## 1) Qué es este proyecto

DVT es un motor de orquestación de workflows multi-adapter con enfoque en:

- contratos versionados,
- determinismo de ejecución,
- estado derivado por eventos,
- separación estricta engine/adapters/state.

Entrada recomendada: [`README.md`](README.md), [`docs/INDEX.md`](docs/INDEX.md), [`ROADMAP.md`](ROADMAP.md).

## 2) Mapa rápido del monorepo

- [`packages/contracts`](packages/contracts): tipos/contratos compartidos.
- [`packages/engine`](packages/engine): core de orquestación + seguridad + outbox.
- [`packages/adapter-temporal`](packages/adapter-temporal): adapter Temporal (MVP funcional).
- [`packages/adapter-postgres`](packages/adapter-postgres): adapter de estado (aún parcial/pendiente de cierre funcional).
- [`packages/cli`](packages/cli): utilidades de validación/operación.

Documentación clave de arquitectura:

- [`docs/architecture/engine/INDEX.md`](docs/architecture/engine/INDEX.md)
- [`docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.1.md`](docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.1.md)
- [`docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md`](docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md)

## 3) Estado funcional actual (alto nivel)

### Implementado y usable

- Provider selection en engine: [`providerSelection.ts`](packages/engine/src/application/providerSelection.ts).
- Adapter Temporal MVP:
  - Cliente: [`TemporalClient.ts`](packages/adapter-temporal/src/TemporalClient.ts)
  - Adapter: [`TemporalAdapter.ts`](packages/adapter-temporal/src/TemporalAdapter.ts)
  - Workflow: [`RunPlanWorkflow.ts`](packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts)
  - Activities: [`stepActivities.ts`](packages/adapter-temporal/src/activities/stepActivities.ts)
  - Worker host: [`TemporalWorkerHost.ts`](packages/adapter-temporal/src/TemporalWorkerHost.ts)
- Integración Temporal en CI: [`test.yml`](.github/workflows/test.yml:37) ejecuta `test:integration` del paquete Temporal.

### Pendiente / en cierre

- Cierre operativo canónico de issue #68 (alineación tracker/documentación final).
- Paridad avanzada vs enunciados históricos (DAG paralelo, continue-as-new).
- Endurecimiento de idempotencia/attempts y semántica de cancelación.

## 4) Estado de issues (lectura operativa)

- #5: cerrado como superseded por #68 (scope legacy).
- #68: issue canónica Temporal (estado: en fase de cierre operativo, no en “no implementado”).
- #6 (Postgres): sigue siendo bloqueador importante para cierre E2E completo de adapters.

Contexto de tracking:

- [`docs/planning/ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md`](docs/planning/ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md)
- [`docs/status/IMPLEMENTATION_SUMMARY.md`](docs/status/IMPLEMENTATION_SUMMARY.md)

## 5) Calidad técnica: dónde mirar primero

Auditoría reciente de antipatrones:

- [`TEMPORAL_ANTIPATTERNS_AUDIT_2026-02-14.md`](docs/status/TEMPORAL_ANTIPATTERNS_AUDIT_2026-02-14.md)

Top prioridades técnicas:

1. attempts/idempotencia real en eventos,
2. ruta única de cancelación,
3. optimizar `getRunStatus` (evitar replay total por query),
4. endurecer tests de integración (asserts más deterministas).

## 6) Cómo navegar rápido para contribuir

### Si vas a tocar Temporal

1. Leer spec: [`TemporalAdapter.spec.md`](docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md)
2. Ver implementación pública: [`index.ts`](packages/adapter-temporal/src/index.ts)
3. Recorrer flujo runtime:
   - [`TemporalAdapter.startRun()`](packages/adapter-temporal/src/TemporalAdapter.ts:58)
   - [`runPlanWorkflow()`](packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts:90)
   - [`createActivities()`](packages/adapter-temporal/src/activities/stepActivities.ts:56)
4. Validar en tests:
   - [`integration.time-skipping.test.ts`](packages/adapter-temporal/test/integration.time-skipping.test.ts)

### Si vas a tocar engine/core

1. Contratos y tipos: [`packages/engine/src/contracts`](packages/engine/src/contracts)
2. Orquestación core: [`WorkflowEngine.ts`](packages/engine/src/core/WorkflowEngine.ts)
3. Selección de provider: [`providerSelection.ts`](packages/engine/src/application/providerSelection.ts)

## 7) Señales de salud del repo

- Monorepo `packages/*` ya consolidado para paths activos.
- CI de tests + integración Temporal presente.
- Persisten deudas puntuales de tipado en tests del engine (no bloquean comprensión de arquitectura, pero sí higiene de baseline).

## 8) Recomendación para futuras IAs

Usar este orden de contexto para minimizar errores de interpretación:

1. [`ROADMAP.md`](ROADMAP.md)
2. [`docs/status/IMPLEMENTATION_SUMMARY.md`](docs/status/IMPLEMENTATION_SUMMARY.md)
3. [`docs/status/TEMPORAL_ANTIPATTERNS_AUDIT_2026-02-14.md`](docs/status/TEMPORAL_ANTIPATTERNS_AUDIT_2026-02-14.md)
4. Código fuente en `packages/adapter-temporal/src/*` y `packages/engine/src/*`.

# DVT+ — Revisión Arquitectónica Técnica (AI) — 2026-02-26

**Autor:** AI Architect Review
**Fecha:** 2026-02-26
**Objetivo:** Evaluación crítica de riesgos, consistencia conceptual, separación de responsabilidades y mantenibilidad de largo plazo.

---

## Fuentes usadas (acordadas)

1. `dvt_workflow_engine_artifact` → `docs/architecture/engine/index.md`
2. `dvt_v2_architecture_explanation` → `docs/review/DVT+_Architectural_Review_20260225.md`
3. Principio de Product Definition validado por referencias normativas indirectas en:
   - `docs/architecture/engine/contracts/engine/RunEvents.v2.0.md`
   - `docs/architecture/engine/security/SECURITY_INVARIANTS.v1.md`

---

## 1) Conceptual Soundness

### Sólido

- El boundary del engine está bien planteado: ejecución por `PlanRef`, no por plan embebido.
- El modelo de eventos es correcto en sus invariantes base: `runSeq` como orden, `idempotencyKey` como dedupe, `persistedAt` como tiempo autoritativo de auditoría.
- La fórmula de idempotencia está estrictamente definida y testeable.
- El workflow temporal ya preserva `gatewayDecisions` en `continueAsNew`, cerrando un gap relevante.

### Frágil

- El principio “engine no decide” está erosionado: el runtime evalúa DSL de gateway en workflow.
- Existe drift contractual del State Store entre contrato normativo, contrato legacy y uso real en runtime.
- El planner está por debajo del nivel de especificación que exige el alcance (dbt DAG real, partial execution, ownership de políticas de retry).
- Hay desalineación documental entre referencias v1.x y v2.0 que añade ambigüedad de implementación.

### Falta

- Modelo de concurrencia distribuida de `startRun` formalizado end-to-end.
- Ownership inequívoco de retry/backoff y autoridad sobre `logicalAttemptId`.
- Estrategia operativa de compatibilidad/migración entre versiones de plan.

---

## 2) Architectural Risk Map

| Risk                                | Severity | Likelihood | Why                                                                           | Mitigation                                                       |
| ----------------------------------- | -------- | ---------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Split de contrato StateStore        | High     | High       | APIs incompatibles entre contrato y runtime                                   | Unificar contrato único canónico y borrar legacy                 |
| Explosión de estado/eventos         | Critical | High       | Event sourcing + outbox + snapshots sin política cerrada de crecimiento       | Particionado + retención por tiers + archivado automático        |
| Idempotencia rota en bordes         | High     | Medium     | Requisito de estabilidad de `eventId` depende de disciplina de implementación | Registry durable `(runId,idempotencyKey)` + tests de crash/retry |
| Creep planner/engine                | High     | High       | Engine evalúa políticas (gateway DSL), planner subespecificado                | Mover decisiones al planner y endurecer contrato                 |
| Seguridad de plugins                | Critical | Medium     | Sandbox está DRAFT, sin enforcement productivo validado                       | Bloquear marketplace hasta aislamiento fuerte y auditado         |
| Aislamiento multi-tenant incompleto | High     | Medium     | Invariante documentado, enforcement transversal no probado                    | Tenant scope obligatorio + test negativo en CI                   |
| Paridad Conductor sobreprometida    | High     | High       | Conductor declara gaps en replay/pause/cancel                                 | Redefinir objetivo como equivalencia de estado                   |
| Complejidad operativa               | High     | High       | Superficie contractual y operativa alta para madurez actual                   | Recortar alcance a P0 ejecutable y observable                    |

---

## 3) Engine Abstraction Critique

- `IWorkflowEngine` es pequeño y correcto en forma, pero aún incompleto en semántica operativa (concurrencia, degradación, ownership de retry).
- Temporal-first es la secuencia correcta.
- Conductor parity no es realista como equivalencia de ejecución; sí puede ser equivalencia de estado final.
- El event model es robusto en contrato, pero depende de enforcement real (especialmente `eventId` estable y Layer-3 projector).

---

## 4) Execution Planning Layer Analysis

- El planner contractual visible es insuficiente para el alcance prometido (dbt artifacts + DAG + selección + determinismo + versionado).
- Partial execution por capas funciona, pero la granularidad puede ser demasiado gruesa para DAGs grandes.
- Ownership de retry/backoff está difuso entre planner, engine y adapter.
- El versionado de plan está rígido (rechazo estricto de versiones no soportadas) y necesita estrategia de migración operativa.

**Diagnóstico:** underbuilt en planner y sobreprometido en multi-engine.

---

## 5) State & Metadata Layer Review

- PostgreSQL es válido en fase temprana, insuficiente a 3 años sin particionado/retención/archivo bien definidos.
- Snowflake es adecuado para analítica, no para control-plane interactivo.
- El enfoque append-only es correcto, pero exige disciplina fuerte en proyección, backfill y coste operativo.
- Inmutabilidad de artifacts va en dirección correcta con hash, pero depende de storage policies reales.

---

## 6) Plugin System Evaluation

- Política contractual de sandbox apunta en dirección correcta (prohibición de `vm2`/`node:vm` como frontera).
- Sigue siendo DRAFT: sin enforcement probado, no hay garantías reales.
- Riesgo crítico: cualquier hook plugin en contexto workflow compromete determinismo.

---

## 7) What Is Overbuilt?

1. Narrativa de reemplazo multi-engine antes de cerrar paridad mínima observable.
2. Ambición de capas de gobernanza documental por encima del nivel de hardening operativo real.
3. Alcance de cost attribution avanzado sin pipeline técnico plenamente definido.

---

## 8) What Is Underbuilt?

1. Planner (contrato + implementación + fixtures reales).
2. Tooling de migración/versionado de contratos y planes.
3. Rollback guarantees entre versiones de engine/plan.
4. Modelo de concurrencia distribuida de `startRun`.
5. Backpressure por tenant y límites de admisión.
6. Retención/archivo operativos con reglas de cumplimiento.
7. SLO/SLA ejecutables (no solo documentados).

---

## 9) Scalability Outlook (3-Year Horizon)

### Cuellos de botella esperables

- Append Authority / event log.
- Relay de outbox + projector en burst multi-tenant.
- Saturación de workers en capas altamente paralelas.
- Recomputación de planificación si no hay caché efectiva.

### Puntos únicos de fallo

- Store primario.
- Relay de entrega de outbox.
- Admission control sin cuotas por tenant.

### Presión de crecimiento de datos

- Eventos + snapshots crecerán más rápido que el tuning manual sostenible.

---

## 10) Architectural Scorecard

| Dimension                 | Score | Justification                                              |
| ------------------------- | ----: | ---------------------------------------------------------- |
| Conceptual clarity        |  7/10 | Principios claros, enforcement parcial                     |
| Separation of concerns    |  6/10 | Frontera engine-state razonable; planner-engine erosionado |
| Replaceability of engine  |  5/10 | Teórica; Conductor aún no iguala semántica operativa       |
| Determinism               |  7/10 | Fuerte en Temporal; frágil en extensiones/DSL              |
| Extensibility             |  6/10 | Contratos amplios, pero piezas clave sin cierre            |
| Operational realism       |  4/10 | Faltan garantías operativas críticas                       |
| Long-term maintainability |  5/10 | Drift contractual y complejidad > madurez actual           |

---

## 11) Strategic Recommendations

### 3 cambios estructurales

1. Unificar State Store en un único contrato canónico y retirar variantes legacy.
2. Tratar planner como P0 bloqueante con contrato/algoritmo/fixtures y gates de determinismo.
3. Redefinir formalmente la meta multi-engine a equivalencia de estado, no de ejecución.

### 3 aclaraciones necesarias

1. Autoridad de retries/backoff y `logicalAttemptId`.
2. Matriz de compatibilidad + migración/rollback entre schemaVersion de plan y engine.
3. Contrato operativo de backpressure/admisión por tenant.

### 3 cosas a congelar ya

1. Fórmula de idempotencia.
2. Split `emittedAt` vs `persistedAt`.
3. Regla de ejecución por `PlanRef` (no plan completo).

### 3 cosas a retrasar

1. Exposición pública de marketplace/plugin.
2. Claims de paridad Conductor sin validación de comportamiento real.
3. Cost attribution avanzado sin captura de coste fiable por step.

---

## Conclusión

DVT+ tiene base contractual sólida en semántica de eventos, pero su durabilidad a escala depende de cerrar tres huecos estructurales: planner subespecificado, drift contractual de state-store y sobrepromesa multi-engine.

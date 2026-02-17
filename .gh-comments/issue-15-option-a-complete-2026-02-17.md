## Issue #15 — Option A completada (Slices 4 + 6)

Se completó la ejecución de la **Opción A** aprobada: **Slice 4 (Retry/Error)** + **Slice 6 (E2E)**, manteniendo observability/linting como deuda explícita.

### 1) Slice 4 — Retry/Error handling

- Actualizada la política de reintento en workflow para actividades con:
  - `maximumInterval: '60s'`
  - `maximumAttempts: 3`
  - `nonRetryableErrorTypes: ['PermanentStepError']`
- Se añadió mapeo explícito de fallo de actividad a terminal de workflow (`StepFailed` + `RunFailed`) con ruta determinista.
- Se incorporó simulación controlada de error de step en actividades (`simulateError: 'transient' | 'permanent'`) para validar comportamiento de retry/error-path.

Archivos principales:

- [`runPlanWorkflow()`](../packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts:103)
- [`executeStep()`](../packages/adapter-temporal/src/activities/stepActivities.ts:85)
- [`validateStepShape()`](../packages/adapter-temporal/src/activities/stepActivities.ts:200)

### 2) Slice 6 — E2E golden-path lineal (3 pasos)

- Añadida prueba E2E de plan lineal de 3 pasos con verificación de:
  - secuencia determinista de eventos (`RunStarted -> StepStarted/Completed x3 -> RunCompleted`)
  - continuidad de `runSeq`.
- Añadida prueba E2E de fallo permanente verificando terminal determinista:
  - `RunStarted -> StepStarted -> StepFailed -> RunFailed`.

Archivo principal:

- [`integration.time-skipping.test.ts`](../packages/adapter-temporal/test/integration.time-skipping.test.ts:405)

### 3) Validación ejecutada (sin bypass)

- `pnpm --filter @dvt/adapter-temporal test -- --run test/integration.time-skipping.test.ts` ✅
- `pnpm --filter @dvt/adapter-temporal test` ✅
- Resultado final: **6 test files passed, 43 tests passed**.

### 4) Documentación y deuda técnica

- Actualizado resumen de implementación con Slice 4+6 y evidencia de validación.
  - [`IMPLEMENTATION_SUMMARY.md`](../docs/status/IMPLEMENTATION_SUMMARY.md)
- Registrado cierre iterativo sin deuda nueva (observability/linting siguen en backlog explícito ya existente).
  - [`TECHNICAL_DEBT_REGISTER.md`](../docs/guides/TECHNICAL_DEBT_REGISTER.md)

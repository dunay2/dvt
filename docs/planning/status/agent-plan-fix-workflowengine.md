---
title: Plan: Corregir advertencias y reducir complejidad en `WorkflowEngine.ts`
status: Draft
owner: docs
last_reviewed: 2026-03-22
planning_type: status
---

ME ESTOY GUIANDO POR EL AGENT.
Governing sources: docs/planning/status/governance-document-rule-inventory.md, AGENTS.md

# Plan: Corregir advertencias y reducir complejidad en `WorkflowEngine.ts`

**Objetivo**

- Reducir la complejidad ciclomática y las advertencias de CodeScene/Sonar en `packages/@dvt/engine/src/core/WorkflowEngine.ts`.
- Mantener comportamiento sin cambios funcionales y pasar lint/tests locales.

**Alcance**

- Código: `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- Tests de soporte: `packages/@dvt/engine/test/core/WorkflowEngine.test.ts`
- Contratos: validar `packages/@dvt/contracts/src/schemas.ts` (nota SONAR ya aplicada)

**Pasos (secuencia)**

1. Analizar hotspots (condicionales/métodos grandes) en `WorkflowEngine.ts`. — Estado: in-progress
2. Refactorizar `describeUnknownValue` para reducir condicionales y tamaño del método. — Estado: not-started
3. Extraer ramas largas de `_startRunCore` a helpers privados (ya se hicieron algunas extracciones). — Estado: partial (ya aplicadas parcialmente)
4. Centralizar reporte de fallo de `markResolved` en helper (`reportMarkResolvedFailureForIntent`) — Estado: completed
5. Ejecutar `pnpm eslint --fix` sobre archivos modificados y solucionar restantes avisos. — Estado: completed (pasada rápida)
6. Ejecutar pruebas unitarias del paquete `@dvt/engine`. — Estado: not-started
7. Revisar y ajustar `WorkflowEngine.test.ts` si pruebas fallan por cambios de API/fixture. — Estado: not-started
8. Commit local de cambios con mensaje acorde a commitlint y preparar evidencia (comandos ejecutados). — Estado: not-started
9. (Opcional) Ejecutar `pnpm verify:prepush` si tests y lint pasan. — Estado: not-started
   **Pasos (secuencia)**
10. Analizar hotspots (condicionales/métodos grandes) en `WorkflowEngine.ts`. — Estado: in-progress

11. Refactorizar `describeUnknownValue` (concrete plan):
    - Objetivo: reducir cc (complexity) y número de condicionales detectadas por Sonar/CodeScene.
    - Estrategia:
      - Extraer tres helpers puros y pequeños:
        - `isPrimitive(value: unknown): boolean` — detecta string/number/boolean/bigint/symbol/null/undefined.
        - `tryJsonStringify(value: unknown): string | null` — intenta `JSON.stringify` y devuelve `null` ante fallo.
        - `objectTag(value: unknown): string` — devuelve `Object.prototype.toString.call(value)`.
      - Reescribir `describeUnknownValue` con guard clauses y delegación a los helpers.
      - Añadir tests unitarios específicos para `describeUnknownValue` en `WorkflowEngine.test.ts` (casos: Error, string, number, null, object circular, custom object).
    - Resultado esperado: cc reducido por debajo del umbral y condicionales simplificadas.

12. Reducir tamaño y argumentos de métodos grandes (concrete plan):
    - `_startRunCore` ya empezó a fragmentarse; acciones restantes:
      - Asegurar que cada rama larga recibe un único objeto de parámetros (`{ validatedPlanRef, validatedContext, adapter, intentId, traceContext }`) (ya aplicado en helpers recientes).
      - Extraer validaciones de precondiciones y métricas en helpers: `validateAndBuildIntent(...)` y `recordStartMetrics(...)` si procede.
      - Verificar que helpers privados tengan 3 argumentos o menos (preferible 1 config object).
    - Beneficio: reduce warnings "Excess Number of Function Arguments" y mejora legibilidad.

13. Manejo de condicionales complejas en `handleStartRunError` y similares (concrete plan):
    - Ya extraje `maybeEmitRunFailedAfterStartError`. Revisión adicional:
      - Extraer predicados: `intentIsPending(intent?)` y `shouldEmitRunFailed(failMeta, intent)`.
      - Reemplazar condicionales largos por llamadas a estos predicados y retornos tempranos.

14. Tests y fixtures (concrete plan):
    - Añadir tests unitarios para nuevos helpers y casos límite.
    - Mantener compatibilidad con fixtures existentes; si se rompe, actualizar `makeCustomObservability` y `runMarkResolvedFailCase` para usar los nuevos helpers.

15. Lint, tests y evidencia (concrete plan):
    - Ejecutar localmente:
      ```bash
      pnpm eslint --fix packages/@dvt/engine/src/core/WorkflowEngine.ts packages/@dvt/engine/test/core/WorkflowEngine.test.ts packages/@dvt/contracts/src/schemas.ts
      pnpm -w test --filter @dvt/engine
      ```
    - Si tests fallan, revertir la última refactorización parcial a una rama de trabajo (`git switch -c wip/fix-workflowengine-refactor`) y documentar fallos para una PR de revisión.

16. Commit y evidencia:
    - Commit local con mensaje conforme a `commitlint`:
      - `fix(engine): reduce complexity in WorkflowEngine helpers and describeUnknownValue`
    - Registrar salidas: `eslint` result, `vitest` output, list of modified files.

17. Verificación prepush (opcional):
    - Si tests pasan y estás de acuerdo, ejecutar `pnpm verify:prepush` y preparar el reporte.

18. Riesgos y mitigaciones:
    - Riesgo: refactorizaciones que cambian comportamiento observable. Mitigación: añadir tests específicos y conservar API interna (input/output) invariantes; si falla, revertir y abrir PR para revisión humana.

19. Revisión humana requerida:
    - Antes de `git push` pedir tu OK para revisar diffs y evidencia.

**Comandos previstos**

- Lint fix (ya ejecutado sobre archivos cambiados):

```bash
pnpm eslint --fix packages/@dvt/engine/src/core/WorkflowEngine.ts packages/@dvt/contracts/src/schemas.ts
```

- Ejecutar tests del paquete `@dvt/engine`:

```bash
pnpm -w test --filter @dvt/engine
```

- Ejecutar verificación completa prepush (solo si todo pasa):

```bash
pnpm verify:prepush
```

**Evidencia requerida para cierre**

- Salida de `pnpm -w test --filter @dvt/engine` (pasadas o fallos documentados).
- Resultado de `pnpm eslint --fix` y listado de advertencias residuales.
- Lista de archivos modificados y diffs (para revisión en PR).

**Reglas operativas**

- No haré `git push` sin tu aprobación explícita.
- Seguiré las reglas de gobernanza leídas (AGENTS.md y el inventario) — todo cambio irá acompañado de evidencia de lint/tests para su validación.

**Notas**

- Ya apliqué cambios para reducir anidamiento (helpers extraídos) y centralicé reporte de markResolved; quedan por refactorizar condicionales en `describeUnknownValue` y completar la ejecución de pruebas.

---

Archivo generado automáticamente por el agente; revísalo y responde "OK" para que ejecute las pruebas, o responde con cambios que quieras en el plan.

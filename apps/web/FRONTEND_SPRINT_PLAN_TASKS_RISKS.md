# DVT+ Frontend — Plan de Ejecución por Sprint

> v2 — actualizado 2026-03-27

---

## 1. Objetivo

Entregar una interfaz DVT+ operacional, conectada al backend real, manteniendo
la arquitectura Planner/Engine/State/UI y el enfoque state-driven.

---

## 2. Estado de Sprint 1 (parcialmente completado antes del plan formal)

Estos ítems ya están implementados y se pueden dar por cerrados:

| Tarea                                      | Archivo                               | Estado  |
| ------------------------------------------ | ------------------------------------- | ------- |
| Platform client (health/readyz/version/db) | `services/platform/platformClient.ts` | ✅ Done |
| TanStack Query con polling 15s             | `queries/usePlatformHealthQuery.ts`   | ✅ Done |
| Banner global ok/degraded/offline          | `components/GlobalStatusBanner.tsx`   | ✅ Done |
| Indicador de conexión en TopBar            | `components/TopAppBar.tsx`            | ✅ Done |

**Pendiente de Sprint 1 (completar antes de avanzar):**

| #   | Tarea                               | Criterio de aceptación                                                                                                         |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1.1 | Definir tipos alineados con backend | `PlanRef`, `RunContext`, `RunStatus`, `RunStatusSnapshot`, `RunEvent` en `types/engine.ts`. Sin duplicar con `@dvt/contracts`. |
| 1.2 | `createApiClient` con sesión        | Headers `X-Tenant-Id` / `X-Project-Id` inyectados desde `sessionStore`. Manejo de `401/403/5xx` con `ApiError` tipado.         |
| 1.3 | Separación `mock \| api`            | `VITE_DATA_SOURCE=mock\|api`. Service layer base en `services/runs/`, `services/plans/`. Vistas no importan mock directo.      |
| 1.4 | Visual cleanup shell                | Remover headers redundantes en sidebars. Controles secundarios del TopBar a menú contextual.                                   |
| 1.5 | Documentar modo operación           | README actualizado con instrucciones para correr en modo mock vs api real.                                                     |

**Riesgos Sprint 1:**

- Acoplamiento de tipos frontend a endpoint shape actual puede requerir rework → mitigar con interfaz de adapter entre service y view-model.
- Ambigüedad de estados intermedios offline/degraded/reconnecting → definir matrix de estados antes de implementar visual cleanup.

---

## 3. Sprint 2 — "Flujo Core Real (v1)"

**Objetivo:** Mover el flujo principal de interacción visual a operación con backend
(o contrato transitional estable).

**Prerrequisito:** Sprint 1 completo (especialmente 1.1 y 1.2).

| #   | Tarea                                       | Criterio de aceptación                                                                                                                               |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | Mutation `POST /plans/preview`              | Estados: idle/loading/success/error. Retry automático en 5xx. Plan Preview modal renderiza con datos reales o mock adapter según `VITE_DATA_SOURCE`. |
| 2.2 | Propagación de `RunContext`                 | `sessionStore` provee tenantId/projectId/environmentId. Todas las mutations incluyen `context: RunContext` en body.                                  |
| 2.3 | Mutation `POST /runs` desde plan confirmado | Start run → 202 → navegación a `/runs/:runId`. Persiste `EngineRunRef` en `runStore`.                                                                |
| 2.4 | Manejo de errores plan/run                  | 401 → Permission Denied modal (ya existe). 409 → Re-Plan Required modal (ya existe). 5xx → toast con retry.                                          |
| 2.5 | `runStore` con estado de ejecución activa   | `currentPlan`, `currentRun`, `engineRunRef`. No en `appStore` global.                                                                                |
| 2.6 | Telemetría mínima de flujo core             | Eventos: `plan_opened`, `plan_confirmed`, `run_started`, `run_failed_ui`. Console log en mock; hook de analytics en api.                             |

**Riesgos:**

- Backend no tiene `POST /runs` aún → usar mock adapter (`createRunsService('mock', ...)`) con respuesta fija.
- `RunContext.targetAdapter` debe coincidir con lo que el backend espera → definir enum en 1.1.

**Oportunidades:**

- Primera acción con valor de negocio real desde UI.
- Reduce el gap entre demo visual y operación real.

---

## 4. Sprint 3 — "Monitor, Consola y Resiliencia"

**Objetivo:** Hacer el tracking de ejecuciones operable con degradación controlada.

**Prerrequisito:** Sprint 2 completo (especialmente 2.3 y 2.5).

| #   | Tarea                                              | Criterio de aceptación                                                                                                                                          |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | `useRunStatus(runId, { enriched })`                | Polling con comparación de `hash` para evitar re-renders innecesarios. `enriched=true` solo en vista de run activo (ADR-0015). Parar cuando status es terminal. |
| 3.2 | `useRunEvents(runId)` — SSE + fallback             | `EventSource` con `onerror` → polling `GET /runs/:runId/events?after={seq}` cada 3s. Stop automático en estado terminal + drain final.                          |
| 3.3 | Timeline de eventos ordenada                       | Orden por `seq`. Deduplicación por `seq`. Scroll to bottom automático cuando está al fondo. Scroll freeze cuando el usuario sube.                               |
| 3.4 | Console unificada (Events/Logs/Metrics)            | Tabs separados. Filtros: step, severidad, timestamp. Preferencia de tab persistida en `shellStore`.                                                             |
| 3.5 | Overlays Runtime y Cost sin contaminar Design Mode | Runtime Mode: estado + duración por nodo. Cost Mode: heatmap. Design Mode: limpio (sin métricas persistentes). Solo un modo intensivo a la vez.                 |
| 3.6 | Error states hardening                             | Errores recuperables: toast + retry. Errores irrecuperables: panel bloqueante con diagnóstico. No usar alertas nativas del browser.                             |

**Riesgos:**

- Alta frecuencia de eventos puede degradar render → virtualizar timeline si >500 eventos.
- Inconsistencias temporales entre snapshot y event stream → documentar y mostrar "estado puede estar retrasado" si lag > 5s.

**Oportunidades:**

- Diferenciación fuerte de producto en operación diaria.
- Mejor trazabilidad para soporte y debugging funcional.

---

## 5. Sprint 4 — "Escalabilidad + Vistas Avanzadas Controladas"

**Objetivo:** Legibilidad y performance en grafos grandes. Activación controlada de
capacidades avanzadas.

**Prerrequisito:** Modos base (Design/Runtime/Cost) definidos en Sprint 3.

| #   | Tarea                                | Criterio de aceptación                                                                                                                                                |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Layer system completo                | Toggles: Core/Validation/Exposure/Runtime/Cost/Impact. Regla: solo un intensivo activo. Cambio de capa no modifica layout base.                                       |
| 4.2 | Tests como badges agregados          | Badge `tests: N pass / M fail` por nodo. Rojo solo si hay fallo. Detalle completo en inspector. Test nodes visibles solo en Validation Layer ON + zoom alto.          |
| 4.3 | Exposures como capa secundaria       | Default: ocultas. Cuando activas: borde punteado, baja saturación, aristas semi-transparentes. Nunca compiten en tamaño/color con nodos core.                         |
| 4.4 | Progressive reveal por zoom          | Bajo zoom: solo forma + label crítico. Zoom medio: nombre + estado resumido. Zoom alto: metadata adicional on demand.                                                 |
| 4.5 | Grouping/clustering                  | Auto-agrupación por domain/tag/capa de transformación. Clusters colapsables con counters (nodos, fallos, costo agregado).                                             |
| 4.6 | Migración a ELK layered              | Eje principal izquierda→derecha por dependencias. Swimlanes opcionales por tipo. Fallback dagre si ELK no disponible. Inserción incremental sin reorganización total. |
| 4.7 | Activación gradual de vistas Nivel C | `VITE_SHOW_ADVANCED_VIEWS=true` o rol `admin`/`power_user`. Lineage, Cost, Plugins, Admin ocultos por defecto.                                                        |
| 4.8 | Plugin registry por `schemaVersion`  | `NodeTypeRegistry` selecciona renderer por `plan.schemaVersion` o `plan.domain`. dbt plan → dbt renderer. Espejo del modelo de adapter del backend.                   |
| 4.9 | Auth bridge (preparación OIDC)       | `X-Api-Key` header como bridge en entornos staging. Documentar ruta hacia Authorization Code + PKCE.                                                                  |

**Riesgos:**

- Complejidad UX si se exponen demasiados toggles sin guía → aplicar progressive disclosure estricta.
- Costo técnico de migrar layout mientras se mantiene experiencia actual → feature flag para ELK, dagre como fallback.

**Oportunidades:**

- Escalabilidad real para casos enterprise (>300 nodos).
- Base robusta para roadmap de observabilidad avanzada.
- El plugin registry abre el producto a dominios no-dbt.

---

## 6. Dependencias entre Sprints

```
Sprint 1 (tipos + API client + mock|api layer)
    │
    └─► Sprint 2 (mutations plan/run + RunContext propagation)
            │
            └─► Sprint 3 (useRunStatus + useRunEvents + timeline)
                    │
                    └─► Sprint 4 (canvas layers + grouping + ELK + plugin registry)
```

Ningún sprint puede iniciar sin que el anterior esté completo en sus
tareas prerrequisito.

---

## 7. Riesgos Cross-cutting

| Riesgo                              | Impacto                           | Mitigación                                                       |
| ----------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| Divergencia tipos frontend/backend  | Alto — bloquea integración        | Definir y alinear en Sprint 1.1 antes de cualquier mutation      |
| Contratos plan/run no estables      | Medio — puede retrasar Sprint 2   | Mock adapters; contratos transitionals versionados               |
| Lag del proyector visible en listas | Bajo — UX confusa                 | Indicador "actualizado hace X"; `?enriched` solo donde necesario |
| SSE no disponible en backend        | Bajo — Sprint 3 funcional igual   | `useRunEvents` diseñado con polling desde el inicio              |
| Regression visual al limpiar shell  | Medio — UX regresión              | Tests visuales de referencia antes de cleanup                    |
| Performance en grafos grandes       | Alto — bloqueante para enterprise | Virtualization + progressive reveal desde Sprint 4               |

---

## 8. Métricas de Éxito Sugeridas

- **TTFA** (Time to First Useful Action en Canvas): objetivo < 10s desde carga.
- **% sesiones completando Plan → Run sin error UX bloqueante**: objetivo > 95%.
- **Tasa de errores recuperados via retry exitoso**: objetivo > 80%.
- **FPS en gráfico de 300 nodos** (interacción y layout): objetivo ≥ 30fps.
- **% reducción en queries con `?enriched=true`** vs total run queries: objetivo < 20% (solo vistas activas).
- **Dwell time por modo** (Design/Runtime/Cost/Impact): indicador de adopción por feature.

---

## 9. Cierre

Este plan divide la evolución en entregas concretas y acumulativas. La
secuencia garantiza que cada sprint construye sobre contratos estables del
anterior, evitando retrabajos y manteniendo la coherencia entre frontend y
backend a medida que los endpoints del engine se hacen disponibles.

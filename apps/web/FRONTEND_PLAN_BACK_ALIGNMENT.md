# DVT+ Frontend — Plan de Alineación con Backend

> **Estado del documento:** v2 — actualizado 2026-03-27
> Sustituye la versión inicial de 2026-02-19.
> Se mantiene la propuesta de producto pero se incorpora estado actual real,
> contratos del engine, estrategia SSE y path de autenticación.

---

## 1. Objetivo

Evolucionar `apps/web` de prototipo con mock data a interfaz operacional real,
alineada con los contratos del `@dvt/engine` y su capa HTTP (`apps/api`).

Principio rector: **"UI con muchas vistas" → "UI operacional ejecutada contra
backend real"**

---

## 2. Diagnóstico Actualizado

### 2.1 Lo que ya está construido (Sprint 1 — parcialmente completado)

| Componente                                    | Estado             | Archivo                               |
| --------------------------------------------- | ------------------ | ------------------------------------- |
| `platformClient` — health/readyz/version/db   | ✅ Implementado    | `services/platform/platformClient.ts` |
| `usePlatformHealthQuery` — polling 15s        | ✅ Implementado    | `queries/usePlatformHealthQuery.ts`   |
| `GlobalStatusBanner` — ok/degraded/offline    | ✅ Implementado    | `components/GlobalStatusBanner.tsx`   |
| `TopAppBar` — indicador de conexión real      | ✅ Implementado    | `components/TopAppBar.tsx`            |
| Separación `mock \| api` (`VITE_DATA_SOURCE`) | ❌ No implementado | pendiente                             |
| Visual cleanup de navegación y headers        | ❌ No implementado | pendiente                             |

### 2.2 Backend disponible hoy

```
GET  /healthz          → { ok, status, components }  — siempre 200
GET  /readyz           → { ok, status, reasonCode }  — 503 si no listo
GET  /version          → { version, commit }
GET  /db/ready         → { ok }
```

**No existen aún:** `/plans/preview`, `/runs`, `/runs/:id`, `/runs/:id/events`,
`/artifacts/*`

### 2.3 Estado de alineación de tipos

`types/engine.ts` ya **re-exporta directamente de `@dvt/contracts`**:
`PlanRef`, `RunContext`, `RunStatus`, `RunStatusSnapshot`, `RunEvent`, `EngineRunRef`
están alineados con el engine. Los tipos de input (`StartRunInput`, `PlanPreviewInput`)
usan estos contratos correctamente.

**Gap restante — tipos de respuesta (DTO mismatch latente):**

| Servicio                     | Respuesta actual                    | Debería ser                                 |
| ---------------------------- | ----------------------------------- | ------------------------------------------- |
| `runsService.listRuns()`     | `Run[]` (tipo dbt frontend)         | `RunStatusSnapshot[]` + mapper a view-model |
| `plansService.previewPlan()` | `ExecutionPlan` (tipo dbt frontend) | Tipo de respuesta del engine + mapper       |
| `runsService.getRun()`       | `Run \| null` (tipo dbt)            | `RunStatusSnapshot` + mapper                |

Estos tipos son compatibles en `mock` mode porque los mocks están construidos con los tipos
dbt. Cuando el backend real responda, la shape será diferente y no habrá error de compilación
(los mocks enmascaran el problema). **Se requiere una capa de mapeo DTO** antes de integrar
los endpoints reales.

---

## 3. Contratos de API que el frontend debe preparar

### 3.1 Endpoints prioritarios (orden de implementación backend)

#### P1 — Iniciar una ejecución

```
POST /runs
Content-Type: application/json
X-Tenant-Id: {tenantId}

{
  "planRef": {
    "uri": "string",
    "sha256": "string",
    "schemaVersion": "string",
    "planId": "string",
    "planVersion": "string"
  },
  "context": {
    "tenantId": "string",
    "projectId": "string",
    "environmentId": "string",
    "runId": "string",         // generado por cliente o por servidor
    "targetAdapter": "temporal" | "conductor"
  }
}

→ 202 { runId, workflowId, provider }    // EngineRunRef
→ 409 { error: "PLAN_CONFLICT", ... }    // re-plan required
→ 403 { error: "FORBIDDEN" }
```

#### P2 — Estado de una ejecución

```
GET /runs/:runId
GET /runs/:runId?enriched=true           // ADR-0015: path enriquecido (llama al adapter)

→ 200 {
    runId, status, substatus,
    startedAt, completedAt,
    hash                                 // para detectar cambios en polling
  }
```

> **ADR-0015**: `GET /runs/:runId` sin parámetro lee del snapshot local (rápido,
> sin llamar al adapter). El path `?enriched=true` llama al adapter para
> sub-estado en tiempo real. El frontend debe usar `?enriched=true` solo en
> la vista de run activo; para listas usar el path por defecto.

#### P3 — Eventos de una ejecución (streaming)

```
GET /runs/:runId/events                  // SSE: text/event-stream
GET /runs/:runId/events?after=42         // polling paginado: afterSeq

→ stream de RunEvent  { seq, type, runId, occurredAt, payload }
```

Ver §5 para la estrategia SSE → polling fallback.

#### P4 — Lista de ejecuciones

```
GET /runs?tenantId=X&projectId=Y&status=running&limit=50
→ 200 { items: RunStatusSnapshot[], nextCursor }
```

#### P5 — Plan preview (servidor o planner externo)

```
POST /plans/preview
{ selection: string[], context: RunContext }
→ 200 { planRef, steps, estimatedCost, estimatedDuration }
→ 422 { error: "INVALID_SELECTION" }
```

### 3.2 Tipos TypeScript que el frontend debe definir (alineados con backend)

```typescript
// Reemplazar ExecutionPlan y DbtRun en types/dbt.ts por:

export interface PlanRef {
  uri: string;
  sha256: string;
  schemaVersion: string;
  planId: string;
  planVersion: string;
  requiresCapabilities?: string[];
}

export interface RunContext {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  targetAdapter: 'temporal' | 'conductor';
}

export type RunStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';

export interface RunStatusSnapshot {
  runId: string;
  status: RunStatus;
  substatus?: string;
  startedAt: string; // ISO UTC
  completedAt?: string;
  hash: string; // para polling optimista
}

export interface RunEvent {
  seq: number;
  type: string; // 'RunStarted' | 'StepStarted' | 'RunCompleted' | ...
  runId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}
```

---

## 4. Propagación de Contexto Multi-Tenant

Cada llamada al backend debe incluir el contexto de sesión. El `TopAppBar`
ya gestiona `tenantId`, `projectId`, `environmentId` en el store. Falta
propagarlos a las llamadas HTTP.

**Estrategia:**

1. `sessionStore` (o `appStore.selectedTenant/Project/Env`) provee el contexto.
2. El API client base incluye `X-Tenant-Id` y `X-Project-Id` como headers por
   defecto (inyectados desde el store en tiempo de llamada, no en construcción
   del cliente).
3. Todas las mutations (POST /runs, POST /plans/preview) incluyen el contexto
   explícitamente en el body (`context: RunContext`).

```typescript
// services/apiClient.ts (nuevo)
export function createApiClient(getSession: () => SessionContext) {
  const baseUrl = resolveApiBaseUrl();
  return {
    async post<T>(path: string, body: unknown): Promise<T> {
      const { tenantId, projectId } = getSession();
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
          'X-Project-Id': projectId,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new ApiError(res.status, await res.json());
      return res.json();
    },
  };
}
```

---

## 5. Estrategia SSE → Polling (Run Monitor)

El backend eventualmente expone `GET /runs/:runId/events` como SSE. El frontend
debe soportar ambos modos con fallback automático.

```
┌─────────────────────────────────────────────┐
│  useRunEvents(runId)                         │
│                                              │
│  1. Intentar SSE (EventSource)               │
│     ├── onmessage → dispatch event           │
│     └── onerror   → degradar a polling       │
│                                              │
│  2. Polling fallback                         │
│     GET /runs/:runId/events?after={lastSeq}  │
│     cada 3s mientras status = running        │
│     cada 15s cuando status terminal         │
│                                              │
│  3. Stop                                     │
│     status ∈ {success, failed, cancelled}   │
│     + drain final poll para cerrar gaps      │
└─────────────────────────────────────────────┘
```

**Implementación:**

```typescript
// queries/useRunEvents.ts
export function useRunEvents(runId: string, options?: { enriched?: boolean }) {
  const [events, dispatch] = useReducer(eventReducer, []);
  const lastSeq = useRef(0);

  useEffect(() => {
    if (!runId) return;
    const es = new EventSource(`/runs/${runId}/events`);
    es.onmessage = (e) => {
      const event: RunEvent = JSON.parse(e.data);
      lastSeq.current = event.seq;
      dispatch({ type: 'APPEND', event });
    };
    es.onerror = () => {
      es.close();
      startPolling(); // fallback
    };
    return () => es.close();
  }, [runId]);

  return events;
}
```

---

## 6. Estrategia de Autenticación (Placeholder → OIDC)

La arquitectura del sistema define OIDC para operaciones de escritura. El
frontend necesita preparar el camino aunque la autenticación no esté activa.

**Fases:**

| Fase       | Estrategia                                   |
| ---------- | -------------------------------------------- |
| Sprint 1–2 | Sin auth (desarrollo local, CORS permisivo)  |
| Sprint 3   | API key por header (`X-Api-Key`) como bridge |
| Sprint 4+  | OIDC completo (Authorization Code + PKCE)    |

**Lo que NO debe hacerse:**

- No hardcodear tokens en el código.
- No asumir que todos los endpoints son públicos; diseñar con `401/403` en mind.
- Los modals de "Permission Denied" ya existen — conectarlos a las responses reales.

---

## 7. Separación Mock | API (`VITE_DATA_SOURCE`)

### 7.1 Implementación

Cada service que hoy usa mock data directamente debe pasar por una capa de
abstracción:

```typescript
// services/runs/runsService.ts
import { mockRuns } from '@/data/mockData';

export function createRunsService(mode: 'mock' | 'api', apiClient: ApiClient) {
  if (mode === 'mock') {
    return {
      listRuns: async () => mockRuns,
      getRun: async (id: string) => mockRuns.find((r) => r.runId === id),
    };
  }
  return {
    listRuns: async () => apiClient.get('/runs'),
    getRun: async (id: string) => apiClient.get(`/runs/${id}`),
  };
}
```

### 7.2 Configuración

```bash
# .env.development (mock — por defecto)
VITE_DATA_SOURCE=mock

# .env.local (contra API real)
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://localhost:3000
```

### 7.3 Regla

Los componentes de vista (`views/`) nunca importan `mockData` directamente.
Solo usan hooks (`useRuns`, `useRunStatus`) que internamente delegan al service
configurado.

---

## 8. Arquitectura de Stores Objetivo

Refactor gradual del store global hacia responsabilidades separadas:

```typescript
shellStore; // layout, panels, focus, navigation
sessionStore; // tenantId, projectId, environmentId, gitBranch, gitSha
graphStore; // nodes, edges, selection, overlays
runStore; // currentPlan, currentRun, runEvents, timeline
statusStore; // platform health snapshot, connectionStatus
```

**Criterio de migración:** no big-bang. Mover estado a su store natural cuando
se toca ese dominio por primera vez en cada sprint.

---

## 9. Topología de Lectura del Backend (referencia para polling)

El frontend necesita entender de dónde vienen los datos para saber cuándo
son frescos:

```
Temporal Worker
    │ escribe run_events → PostgreSQL
    │
projector-worker
    │ lee run_events → escribe run_snapshots
    │
GET /runs/:runId           ← lee run_snapshots (snapshot stale posible)
GET /runs/:runId?enriched  ← snapshot + adapter.getRunStatus() (real-time)
GET /runs/:runId/events    ← lee run_events directamente (sin lag de proyector)
```

**Implicación para UI:**

- El estado en `RunsView` lista (sin enriched) puede tener lag de proyector.
- El run activo en detalle debe usar `?enriched=true` para sub-estado en tiempo
  real.
- `useRunEvents` proporciona el timeline granular event-by-event.

---

## 10. Jerarquía de Vistas y Progresión

### Nivel A — Core (siempre visible)

- `/canvas` — DAG + Plan + Run
- `/runs` — Monitor de ejecuciones

### Nivel B — Operacional (accesible por defecto)

- `/artifacts` — manifest/run_results/catalog
- `/diff` — comparación git/run

### Nivel C — Avanzado (feature flag o rol)

- `/lineage`, `/cost`, `/plugins`, `/admin`

Los items de Nivel C aparecen en la navegación solo cuando:

- `VITE_SHOW_ADVANCED_VIEWS=true`, o
- El usuario tiene rol `admin` o `power_user` (futuro RBAC)

---

## 11. Roadmap de Sprints (actualizado)

### Sprint 1 — "Base Limpia y Conectada" (parcialmente completado)

**Completado:**

- ✅ Platform client (health/readyz/version/db)
- ✅ Polling en `usePlatformHealthQuery`
- ✅ `GlobalStatusBanner` con estado real

**Pendiente:**

- [ ] Separación `VITE_DATA_SOURCE=mock|api` + service layer base
- [ ] Visual cleanup: remover headers redundantes en sidebars
- [ ] Consolidar controles secundarios del TopBar en menú contextual
- [x] Tipos alineados con backend — `types/engine.ts` re-exporta de `@dvt/contracts` directamente.
- [ ] Capa de mapeo DTO: `RunStatusSnapshot → Run` (view-model) y respuesta plan → `ExecutionPlan`.
- [ ] `createApiClient` con inyección de contexto de sesión
- [ ] Documentar modo operación (mock vs api)

### Sprint 2 — "Flujo Core Real (v1)"

- [ ] `POST /plans/preview` — mutation con estados idle/loading/success/error
- [ ] Plan Preview modal consumiendo respuesta real (con adapter mock si backend no listo)
- [ ] `POST /runs` — start run mutation
- [ ] Navegación contextual a Runs tras iniciar ejecución
- [ ] Manejo de 401/403/409/5xx en flujo plan/run
- [ ] Propagación de `RunContext` desde sessionStore a llamadas API

### Sprint 3 — "Monitor y Trazabilidad"

- [ ] `useRunStatus(runId, { enriched: true })` — polling con hash comparison
- [ ] `useRunEvents(runId)` — SSE con fallback a polling (ver §5)
- [ ] Timeline de eventos ordenada y consistente
- [ ] Console unificada: events/logs/metrics con filtros por step/severity
- [ ] Fallback visual SSE → polling con indicador en UI
- [ ] Runtime Mode y Cost Mode como overlays en canvas (sin contaminar Design Mode)

### Sprint 4 — "Escalabilidad + Vistas Avanzadas"

- [ ] Canvas layering completo (Core/Validation/Exposure/Runtime/Cost/Impact)
- [ ] Grouping/clustering + progressive reveal para 300+ nodos
- [ ] Migración layout engine a ELK layered (con fallback dagre)
- [ ] Activación gradual de vistas Nivel C por feature flag
- [ ] Auth bridge (API key → OIDC preparación)
- [ ] Plugin registry dinámico (NodeTypeRegistry por schemaVersion del plan)

---

## 12. Criterios de Éxito

1. Un usuario puede completar Plan → Run → Monitor sin mock data.
2. La UI refleja siempre el estado real del backend.
3. El polling usa `hash` para evitar re-renders innecesarios.
4. `?enriched=true` solo se llama desde la vista de run activo (no en listas).
5. El switch `mock|api` no requiere cambios en componentes de vista.
6. Los tipos del frontend son isomorfos a los contratos del engine.
7. Un graph de 50 nodos es legible "first glance" en Design Mode.

---

## 13. Riesgos y Mitigaciones

| Riesgo                                            | Mitigación                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Contratos plan/run no estables en backend         | Transitional adapters + mock mode hasta que estén listos                                     |
| Lag del proyector visible en listas de runs       | Documentar; usar `?enriched` solo donde sea necesario; añadir indicador "actualizado hace X" |
| SSE no disponible inicialmente en backend         | Diseñar `useRunEvents` con polling desde el inicio; SSE como mejora                          |
| Divergencia tipos frontend/backend en integración | Definir y alinear tipos en Sprint 1 antes de cualquier mutation                              |
| Autenticación bloquea desarrollo cruzado          | Entornos de desarrollo con CORS permisivo + env flag para bypass auth en local               |

---

_Documento vivo. Actualizar al inicio de cada sprint con estado real de completado._

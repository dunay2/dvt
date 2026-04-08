# DVT+ Frontend — Arquitectura de Plugin System

> **Estado:** Propuesta de diseño v7 — 2026-03-28
> **Decisión:** v1 híbrido. El modelo funcional del producto es estático, pero el scaffolding interno ya implementado en la shell se conserva.
> Este documento PRECEDE a las tareas F-12 a F-16.

---

## 0. Decisión de Alcance — v1 híbrido

### Resumen ejecutivo

El error de la versión anterior era mezclar dos sistemas distintos:

1. un **modelo de autoría v1** para plugins internos en el mismo bundle
2. un **modelo de runtime v2** pensado para plugins externos con lifecycle y registro dinámico

Esa mezcla deja el documento sin valor normativo. A partir de esta versión, la decisión es explícita:

- **v1 authoring model:** plugins definidos como contribuciones estáticas (`PluginContributions`)
- **v1 shell scaffolding:** la implementación ya existente (`PluginManifest`, `PluginRegistry`, `PluginRegistryContext`, `PluginContext`, `PluginEventBus`) se conserva como infraestructura interna del host
- **v2:** lifecycle completo, registro dinámico, degradación, `PluginStatus`, `PluginGuard`, `unregister()`, y carga externa

La consecuencia importante es esta:

> En v1, el contrato público para quien define un plugin es `PluginContributions`.
> El resto del scaffolding existente no se tira, pero tampoco define el contrato funcional público de v1.

### Dos capas explícitas

| Capa                   | Rol                                | Qué sí define                                                                          | Qué no define                                                 |
| ---------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `v1 authoring model`   | Contrato funcional del producto    | contribuciones estáticas, slots del shell, overlays, rutas, badges, reglas de conexión | lifecycle, registro dinámico, estados operativos del registry |
| `v1 shell scaffolding` | Infraestructura interna preservada | bootstrap, adaptación, testing interno, compatibilidad con evolución futura            | contrato mínimo que un autor de plugin deba implementar       |

### Qué se preserva del trabajo ya hecho

No se hace rollback conceptual del trabajo ya implementado. Se preservan como infraestructura interna del shell:

- `src/app/plugins/contracts/PluginManifest.ts`
- `src/app/plugins/PluginRegistry.ts`
- `src/app/plugins/PluginRegistryContext.tsx`
- `src/app/plugins/contracts/PluginContext.ts`
- `src/app/plugins/PluginEventBus.ts`
- `src/app/plugins/contracts/PluginServices.ts`

Esto se conserva por tres razones:

1. ya existe código real consumiendo esas piezas
2. simplifica la migración futura a v2
3. evita re-trabajo artificial para volver a helpers planos solo por pureza de documento

### Qué NO es normativa v1

Las piezas siguientes dejan de ser comportamiento normativo de v1:

- `onMount` / `onUnmount` como obligación del autor de plugin
- `onError`, degradación y `degradedCapabilities`
- `register()` / `registerAll()` / `unregister()` como mecanismo público del producto
- `PluginGuard` como contrato funcional de rutas
- topological sort de dependencias
- toggles runtime de plugins desde la UI
- `PluginStatus` como estado operativo expuesto al usuario final

Si el código interno del shell mantiene parte de esas capacidades por compatibilidad o transición, eso no convierte esas capacidades en contrato público de v1.

### Ruta a v2

Cuando se necesite carga externa real de plugins:

1. `PluginContributions` seguirá describiendo slots y capacidades
2. `PluginManifest` pasará a ser contrato público, no solo scaffolding interno
3. el runtime dinámico (`register`, `unregister`, lifecycle, `PluginStatus`) dejará de ser detalle interno

El cambio principal entre v1 y v2 no será el shape de las contribuciones, sino el mecanismo de activación y gobierno del runtime.

---

## 1. Visión y Modelo Mental

El frontend de DVT es un **host multipropósito**. No es una aplicación dbt con pantallas adicionales.

```text
DVT Shell (host)
    ├── dbt plugin          → DAG, import/export, previews, artifacts
    ├── monitoring plugin   → runs, timeline, overlays de ejecución
    ├── cost plugin         → heatmaps y análisis de costo
    └── etl-designer plugin → diseño ETL y bridge cross-plugin
```

La shell define contenedores estables. Los plugins aportan contenido, reglas y visualización.

### Garantías del host

| Contenedor      | Garantía del shell                                      |
| --------------- | ------------------------------------------------------- |
| Canvas          | scroll, zoom, minimap, drag-drop, invariantes del grafo |
| Inspector Panel | panel lateral y composición de tabs                     |
| Console Drawer  | drawer inferior, tabs, resize                           |
| Left Nav        | navegación por views registradas                        |
| TopAppBar       | slots de contexto y acciones                            |
| Modal Host      | punto único de montaje para modales y drawers           |

La shell conoce contenedores e invariantes. Los plugins conocen dominio.

---

## 2. Contrato Público v1 — `PluginContributions`

En v1, un plugin se define como un objeto estático. Se carga en bootstrap y el orden de composición es explícito en código.

```typescript
export type PluginContributions = {
  id: string;
  displayName: LocalizableString;
  version: string;

  views?: ViewContribution[];
  overlays?: CanvasOverlayContribution[];
  inspectorPanels?: InspectorPanelContribution[];
  nodeBadges?: NodeBadgeContribution[];
  nodeRenderers?: Map<PluginNodeKind, NodeRendererRegistration>;
  nodeKinds?: NodeKindRegistration[];
  connectionRules?: PluginConnectionRule[];
  produces?: PluginDataPort[];
  consumes?: PluginDataPort[];
};
```

`nodeKinds[]` puede declarar `previewStepKind` cuando un kind necesita una
proyección planner-facing específica durante el preview genérico. Si no se
declara, la shell usa el mapping base por `role`.

```typescript
export const PLUGIN_REGISTRY: PluginContributions[] = [
  dbtContributions,
  monitoringContributions,
  // costContributions y etlContributions cuando estén habilitados
];
```

### Reglas del modelo v1

1. El plugin exporta datos, no lifecycle.
2. El orden de composición es explícito en `PLUGIN_REGISTRY`.
3. La shell resuelve conflictos de prioridad en renderers, overlays y badges.
4. Las dependencias duras entre plugins en v1 se resuelven en bootstrap y por composición explícita, no por topological sort normativo.

### `LocalizableString`

```typescript
export type LocalizableString = string | { key: string; fallback: string };
```

En v1 la shell usa `fallback`. La forma con `key` se mantiene para no bloquear i18n en v2.

---

## 3. Scaffolding Interno Preservado En v1

El hecho de que v1 use `PluginContributions` como contrato público no obliga a eliminar las piezas internas ya construidas.

### Infraestructura que se conserva

| Pieza                   | Estado en v1                                       |
| ----------------------- | -------------------------------------------------- |
| `PluginManifest`        | infraestructura interna preservada                 |
| `PluginRegistry`        | infraestructura interna preservada                 |
| `PluginRegistryContext` | infraestructura interna preservada                 |
| `PluginContext`         | contrato interno útil para componentes y servicios |
| `PluginEventBus`        | infraestructura interna activa                     |

### Mapeo de implementación actual

La transición correcta no es “borrar lo que existe y volver a helpers planos”, sino fijar qué parte del sistema es pública y qué parte sigue siendo interna.

| Necesidad v1                                | Superficie pública                               | Implementación interna que puede seguir existiendo                       |
| ------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| definir slots, renderers, overlays y reglas | `PluginContributions`                            | `PluginManifest` o adaptadores internos equivalentes                     |
| componer plugins en bootstrap               | `PLUGIN_REGISTRY` como modelo conceptual         | `PluginRegistry` / `PluginRegistryContext` mientras el shell lo necesite |
| pub/sub namespaced entre plugins            | topics `shell:*` y `<pluginId>:*`                | `PluginEventBus` actual                                                  |
| snapshot y contexto reactivo para UI        | `usePluginContext()` y contratos de contribución | `PluginContext` interno del shell                                        |
| servicios auxiliares por capacidad          | shape de contribución y slots                    | `PluginServices` como bag interna del shell                              |

Regla de transición:

> Mientras el contrato visible hacia los plugins siga siendo `PluginContributions`, el shell puede seguir adaptando internamente esas contribuciones a `PluginManifest`, `PluginServices` o cualquier estructura equivalente.

Eso evita dos errores:

1. exigir un rollback innecesario del código ya escrito
2. filtrar capacidades de v2 como si fueran obligación pública de v1

### Regla de interpretación

En v1:

- el **autor** de plugin piensa en `PluginContributions`
- el **shell** puede adaptar internamente esas contribuciones a estructuras más ricas

Eso permite mantener el trabajo existente sin obligar al documento a fingir que v1 ya es un sistema dinámico completo.

### `PluginContext`

`PluginContext` se conserva porque sigue siendo útil para componentes y servicios internos del shell. La distinción importante es:

| Superficie           | Uso en v1                                              |
| -------------------- | ------------------------------------------------------ |
| `PluginContext`      | snapshot de estado para callbacks o servicios internos |
| `usePluginContext()` | hook reactivo para componentes React                   |

La aclaración crítica es esta:

> En v1, la existencia de `PluginContext` no implica que el contrato público del plugin dependa de `onMount` o `onUnmount`.

### `PluginEventBus`

El event bus se mantiene como namespaced pub/sub.

```typescript
export interface PluginEventBus {
  publish<T>(topic: `${string}:${string}`, payload: T): void;
  subscribe<T>(topic: `${string}:${string}`, handler: (payload: T) => void): () => void;
}
```

La convención es:

- `shell:*` para eventos del host
- `<pluginId>:*` para eventos propios de cada plugin

El tipado en v1 es **convencional y local**, no una garantía global de topic map centralizado. Un plugin puede declarar sus payloads esperados en tipos locales o documentación, pero el sistema no promete todavía una relación fuerte `topic -> payload` a nivel de todo el runtime.

---

## 4. Rendering — Renderer Base, Badges y Compatibilidad

### Separación conceptual

La shell distingue dos conceptos:

1. **renderer base**: un único componente que dibuja el nodo
2. **badges**: decoradores superpuestos que no sustituyen el renderer base

```typescript
export interface NodeRendererRegistration {
  kind: PluginNodeKind;
  priority: number;
  component: React.ComponentType<NodeRendererProps>;
}

export interface NodeBadgeContribution {
  id: string;
  pluginId: string;
  forKinds: PluginNodeKind[] | 'all';
  priority: number;
  getBadge: (node: CanonicalNode, ctx: BadgeContext) => NodeBadge | null;
}
```

### Responsabilidad del shell

El objetivo de diseño sigue siendo que el shell envuelva cualquier renderer con `PluginNodeWrapper` para pintar badges fuera del renderer base.

```tsx
function PluginNodeWrapper({ node, ...rendererProps }) {
  const Renderer = registry.getNodeRenderer(node.kind);
  const badges = registry.getNodeBadges(node, badgeCtx);

  return (
    <div className="relative">
      <Renderer node={node} {...rendererProps} />
      {badges.map((badge) => (
        <NodeBadgeOverlay key={badge.id} badge={badge} />
      ))}
    </div>
  );
}
```

### Regla de compatibilidad

No se exige eliminar de inmediato campos de compatibilidad ya presentes en los contratos internos si eso implica tirar trabajo ya integrado. La separación conceptual renderer/badge es normativa. La limpieza de compatibilidad queda como refactor posterior.

Esto aplica en particular a cualquier campo heredado de `NodeRendererProps` que siga existiendo solo para transición.

---

## 5. Overlays — La Shell Fusiona, El Plugin Decora

La regla se mantiene:

- el plugin retorna decoraciones puras y síncronas
- la shell calcula el `OverlayContext`
- la shell aplica `mergeDecorations()`

```typescript
export type NodeDecoration = {
  borderColor?: string;
  backgroundColor?: string;
  dimmed?: boolean;
};

export interface CanvasOverlayContribution {
  id: string;
  label: LocalizableString;
  icon: LucideIcon;
  mode: 'exclusive' | 'additive';
  priority: number;
  nodeDecorator: (node: CanonicalNode, ctx: OverlayContext) => NodeDecoration | null;
}
```

`nodeDecorator()` no hace fetch, no toca stores y no introduce side effects.

---

## 6. Reglas de Conexión — Bridge por `portType + role`

### Invariantes globales del shell

Estas reglas aplican siempre, sin override:

- `SHELL-001`: no ciclos
- `SHELL-002`: no auto-conexión
- `SHELL-003`: no aristas duplicadas

### Roles estándar

```typescript
export type StandardNodeRole = 'input' | 'transform' | 'check' | 'output' | 'control';

export type CustomNodeRole = `${string}:${string}`;
export type NodeRole = StandardNodeRole | CustomNodeRole;
```

### `PluginDataPort`

```typescript
export interface PluginDataPort {
  portType: 'data.tabular' | 'data.events' | 'data.artifacts' | 'data.custom';
  forRoles: NodeRole[];
  dataFormat?: string[];
}
```

### Regla v1 del bridge cross-plugin

En v1, la compatibilidad cross-plugin se decide por:

1. `portType`
2. `role`

`dataFormat` queda **reservado para v2**. Puede declararse en tipo, pero no se documenta como validación runtime exigible de v1.

### Corrección semántica para dbt

La categoría `output` no significa automáticamente “dataset tabular intercambiable”.

En v1:

- `dbt:model` y `dbt:snapshot` participan en el bridge `data.tabular` como productores desde `role='transform'`
- `dbt:source` y `dbt:seed` participan como entradas `role='input'`
- `dbt:exposure` y `dbt:metric` **no** declaran `data.tabular` cross-plugin por defecto

La razón es simple: `exposure` y `metric` son salidas de semántica o presentación, no datasets tabulares genéricos equivalentes a un modelo materializado.

Si más adelante hiciera falta interconectarlas, se haría con:

- `CustomNodeRole`, o
- un `portType` específico de dominio

No por sobrecargar `output`.

### Regla práctica

```text
same plugin     -> reglas del propio plugin
different plugin -> bridge por portType + role + invariantes globales
```

---

## 7. Rutas, Bootstrap y Descubrimiento de Plugins

### Rutas fijas del shell

```text
/          -> redirect a la primera view core
/settings  -> configuración de plataforma
/admin     -> administración del shell
/plugins   -> estado informativo de plugins
```

### Bootstrap en v1

El bootstrap sigue siendo estático desde la perspectiva del producto:

1. la shell compone un conjunto conocido de plugins internos
2. los plugins opcionales pueden habilitarse en bootstrap por `feature flag`
3. el backend puede confirmar disponibilidad vía `/api/capabilities`

Eso **no** convierte a v1 en un sistema de registro dinámico runtime. Es solo gating de bootstrap.

### `/plugins` en v1

La vista `/plugins` es **read-only** e informativa. Debe mostrar, como mínimo:

| Campo                  | Significado                                  |
| ---------------------- | -------------------------------------------- |
| `kind`                 | `core` u `optional`                          |
| `version`              | versión declarada del plugin                 |
| `env flag`             | habilitado o no por configuración            |
| `backend availability` | disponible o no según `/api/capabilities`    |
| `reason`               | motivo informativo cuando no está disponible |

No forma parte de v1:

- activar o desactivar plugins desde la UI
- `unregister()` desde runtime
- toggles admin
- degradación dinámica expuesta como contrato de producto

### `/api/capabilities`

La decisión de mantener `/api/capabilities` se conserva porque resuelve un problema real de desincronización entre frontend y backend para plugins opcionales.

Su función en v1 es:

- decidir qué plugins opcionales se activan en bootstrap
- informar `/plugins`

No su función en v1:

- gobernar lifecycle runtime de plugins
- habilitar toggles dinámicos desde la UI

---

## 8. Plugins Definidos En v1

### 8.1 `dbt`

```text
capabilities: canvas.render, canvas.edit, plan.import, plan.export, plan.preview, artifact.read
produces: [{ portType: 'data.tabular', forRoles: ['transform'] }]
consumes: [{ portType: 'data.tabular', forRoles: ['input'] }]
```

**Nodos**

- `dbt:source(input)`
- `dbt:seed(input)`
- `dbt:model(transform)`
- `dbt:snapshot(transform)`
- `dbt:test(check)`
- `dbt:exposure(output)`
- `dbt:metric(output)`
- `dbt:macro(control)`

**Aclaración**

`dbt:exposure` y `dbt:metric` no participan en el bridge `data.tabular` de v1.

### 8.2 `monitoring`

```text
capabilities: run.start, run.observe, run.cancel, canvas.overlay
```

**Aporta**

- views: `/runs`, `/runs/:runId`
- overlays: `runtime`, `impact`
- badges: estado de run
- inspector panels: estado y detalle de step
- eventos publicados: `monitoring:run.started`, `monitoring:run.completed`, `monitoring:run.failed`

En v1, esto se describe como contribuciones estáticas y comportamiento del shell. No se documenta como plugin con `onMount()` obligatorio.

### 8.3 `cost`

```text
capabilities: cost.analyze, canvas.overlay
```

**Aporta**

- view: `/cost`
- overlay: `cost`
- paneles de detalle de costo
- consumo de eventos de `monitoring`

La dependencia funcional de `monitoring` existe, pero en v1 se resuelve por composición explícita y event bus, no por topological sort normativo.

### 8.4 `etl-designer`

```text
capabilities: canvas.render, canvas.edit, plan.preview, run.start
produces: [{ portType: 'data.tabular', forRoles: ['output'] }]
consumes: [{ portType: 'data.tabular', forRoles: ['input'] }]
```

**Nodos**

- `etl:source-db(input)`
- `etl:source-file(input)`
- `etl:source-api(input)`
- `etl:transform-filter(transform)`
- `etl:transform-join(transform)`
- `etl:transform-aggregate(transform)`
- `etl:transform-map(transform)`
- `etl:sink-db(output)`
- `etl:sink-file(output)`

Este plugin sí participa en el bridge cross-plugin del canvas.

### 8.5 `dagster`

Se mantiene fuera de v1. Sin `canvas.render` útil, el resultado sería un fallback renderer de bajo valor.

---

## 9. Contratos Complementarios

### Import / Export de plan

El shell sigue ofreciendo contratos para importación y exportación de planes:

```typescript
export interface PluginPlanHandlers {
  import?: {
    label: LocalizableString;
    sources: PlanImportSource[];
  };
  export?: {
    label: LocalizableString;
    formats: PlanExportFormat[];
  };
}
```

Esto sigue siendo válido en v1 porque expresa capacidad funcional, no lifecycle.

### Testing

El testing mínimo de contribuciones en v1 debe poder ejercitar:

- `nodeDecorator()` como función pura
- reglas de conexión
- `shouldShow()` de inspector panels
- selección de renderer o badge por kind

No hace falta obligar al autor del plugin v1 a depender de `register()` o `buildMockPluginContext()` para testear el contrato mínimo.

---

## 10. Lo Que Hay Que Construir — Orden

### Fase 0 — Normalización documental

1. fijar `PluginContributions` como contrato público v1
2. mover codegen/dialect a un boundary separado
3. dejar explícito qué scaffolding interno se preserva
4. permitir que la implementación actual siga usando adaptadores internos sin reabrir el diseño base

### Fase 1 — dbt + monitoring

1. materializar contribuciones estáticas reales
2. conectar `RunsView` como view contribution de `monitoring`
3. consolidar `PluginNodeWrapper` cuando toque el slice de rendering

### Fase 2 — cost

1. activar plugin opcional por flag + backend capability
2. componer overlay y paneles
3. consumir eventos de `monitoring`

### Fase 3 — etl-designer

1. activar bridge `dbt <-> etl`
2. formalizar roles y puertos custom si hacen falta

### Fase 4 — v2

1. lifecycle público
2. `PluginManifest` como contrato externo real
3. `PluginRegistry` dinámico
4. carga externa

---

## 11. Lo Que NO Hace Este Sistema En v1

| Limitación                                                  | Decisión                                          |
| ----------------------------------------------------------- | ------------------------------------------------- |
| No lifecycle público de plugins                             | v1 usa contribuciones estáticas                   |
| No `register()` / `unregister()` como contrato del producto | el runtime dinámico queda para v2                 |
| No `PluginStatus` como UX operacional completa              | `/plugins` es informativo, no un panel de control |
| No toggles admin de plugins                                 | fuera de alcance v1                               |
| No degradación dinámica como contrato público               | fuera de alcance v1                               |
| No topological sort normativo                               | el orden es explícito en bootstrap                |
| No validación runtime obligatoria de `dataFormat`           | reservado para v2                                 |
| No dagster en v1                                            | scope insuficiente sin render propio              |

Esta tabla es normativa. Cualquier sección anterior o posterior debe ser compatible con ella.

---

## 12. Quick Start — Plugin mínimo v1

El ejemplo mínimo correcto en v1 usa `PluginContributions`, no `register()`.

```typescript
import type { PluginContributions } from './registry';

export const impactContributions: PluginContributions = {
  id: 'impact',
  displayName: 'Impact Highlight',
  version: '1.0.0',
  overlays: [
    {
      id: 'impact',
      label: 'Impact',
      icon: GitMerge,
      mode: 'additive',
      priority: 10,
      nodeDecorator: (node, ctx) => {
        const isAffected =
          ctx.selectedNodeIds.has(node.id) ||
          ctx.upstreamOfSelected.has(node.id) ||
          ctx.downstreamOfSelected.has(node.id);

        return isAffected ? null : { dimmed: true };
      },
    },
  ],
};
```

Registro en bootstrap:

```typescript
export const PLUGIN_REGISTRY: PluginContributions[] = [
  dbtContributions,
  monitoringContributions,
  impactContributions,
];
```

Test mínimo:

```typescript
const overlay = impactContributions.overlays![0];

expect(
  overlay.nodeDecorator(mockNode, {
    selectedNodeIds: new Set(['other-node']),
    upstreamOfSelected: new Set(),
    downstreamOfSelected: new Set(),
    activeRun: null,
    runStatusByNodeId: new Map(),
    costByNodeId: new Map(),
  })
).toEqual({ dimmed: true });
```

### Nota de compatibilidad

El hecho de que el shell mantenga internamente `PluginManifest`, `PluginRegistryContext` o helpers de testing no obliga al plugin mínimo v1 a depender de ellos para definir sus contribuciones.

---

## 13. Boundary Con Codegen / Dialect Adapters

La arquitectura de plugins frontend no absorbe la arquitectura de codegen ni de adapters dialect-specific.

El boundary queda documentado en:

- [DVT_FRONTEND_DIALECT_CODEGEN_BOUNDARY.md](c:/dvt/apps/web/DVT_FRONTEND_DIALECT_CODEGEN_BOUNDARY.md)

Regla de frontera:

- el frontend puede iniciar runs, visualizar estado y leer artifacts
- la transpilación dialect-specific, git ops y deploy pertenecen a engine/adapters

---

## 14. Dudas Abiertas Que Se Mantienen Visibles

Estas dudas no bloquean v1, pero deben seguir explícitas:

1. `NodeRendererProps.badges`
   Debe decidirse si ese campo sigue existiendo como compatibilidad transicional hasta cerrar `PluginNodeWrapper`, o si se elimina en la primera iteración posterior de rendering.

2. ubicación documental
   Estos documentos viven hoy en `apps/web/`. Debe decidirse más adelante si se quedan ahí temporalmente o si migran a la estructura canónica bajo `docs/` cuando el tema deje de ser diseño local del workspace.

---

## 15. Criterio De Aceptación De Este Documento

Esta especificación se considera consistente si se cumplen todas estas condiciones:

1. ninguna sección de v1 exige a la vez contribuciones estáticas y registro dinámico con lifecycle
2. `monitoring` y `cost` no dependen en la narrativa v1 de `onMount()` / `onUnmount()`
3. `/plugins` es informativo y read-only
4. `dbt:exposure` y `dbt:metric` no se venden como `data.tabular` cross-plugin
5. el trabajo ya hecho en `PluginManifest`, `PluginRegistry`, `PluginContext` y `PluginEventBus` queda preservado y nombrado explícitamente

---

_Documento de diseño v7 — 2026-03-28. Revisar con backend y shell antes de promover capacidades de v2 a contrato público._

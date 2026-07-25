---
title: DVT+ Process Factory Interaction Manual
status: Proposed
owner: Product / Frontend / Architecture / Planner / Runtime
last_reviewed: 2026-07-25
planning_type: mandatory-proposal
lane: E
scope: Product interaction model, Canvas, node cards, contextual surfaces, planning, run control
---

# DVT+ — Manual de interacción para una factoría programable de procesos

## 0. Propósito y alcance

Este documento consolida la especificación de producto y UX acordada para DVT+ y la convierte en una ruta de implementación verificable.

La propuesta se apoya en el estado real del repositorio, pero describe una **dirección objetivo**. Las capacidades que todavía no existen se identifican expresamente como gaps; no deben simularse en UI ni presentarse como comportamiento actual.

La formulación de producto adoptada es:

> **DVT+ es el entorno de ingeniería y la sala de control de una factoría programable de procesos.**

La metáfora de factoría y juego de gestión es un modelo mental de interacción, no una temática visual. El producto debe mantener vocabulario profesional: componentes, grafos, contratos, Run Draft, planes, tareas, intentos, ejecuciones y evidencias.

Este documento es una propuesta de dirección objetivo. Cuando contradiga documentos anteriores que conservan tabs globales del workbench, inspector fijo o una semántica dbt-first, no debe producirse una implementación silenciosa: la aceptación de esta propuesta exige actualizar, retirar o marcar como superseded las fuentes antiguas afectadas. Hasta ese cierre, el código y los contratos actuales siguen siendo la verdad de implementación.

## 0.1 Fuentes de gobierno y lectura

Antes de implementar cualquier fase deben revisarse, como mínimo:

- `AGENTS.md`;
- `docs/guides/ai-work-protocol.md`;
- `docs/planning/status/governance-document-rule-inventory.md`;
- `docs/architecture/command-query-rail-governance.md`;
- `docs/architecture/fowler-opportunity-planning-governance.md`;
- `docs/architecture/components/web/graph/graph-frontend-architecture.md`;
- `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md`;
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`;
- `docs/planning/status/planner-current-state-assessment.md`.

Este documento cubre:

- modelo de producto y vocabulario;
- límites entre authoring, planning, execution y evidence;
- espacios primarios y secundarios de la interfaz;
- anatomía y estados de las tarjetas de nodo;
- lentes del mapa y overlays opcionales;
- resolución de acciones contextuales;
- ventanas o pantallas de componente;
- conexión por contratos tipados;
- Run Draft y revisión del plan;
- Run Control;
- determinismo y reproducibilidad del Planner;
- escalabilidad, accesibilidad y plugin boundaries;
- vertical inicial y pasos de implementación.

## 1. Decisiones no negociables

### 1.1 DVT+ no es un producto dbt

DVT+ compone componentes heterogéneos en grafos. Un componente puede representar, entre otros:

- una petición REST;
- lectura, escritura o descubrimiento de ficheros;
- una transformación SQL;
- un recurso dbt;
- un comando o contenedor;
- una validación;
- mensajería o eventos;
- almacenamiento;
- un sink;
- una capacidad futura aportada por un plugin.

dbt es una familia de plugins entre muchas. No debe definir la tarjeta universal, la navegación, el modelo de grafo ni el lenguaje visual del producto.

### 1.2 Recurso, componente, nodo y tarea son conceptos diferentes

```text
ComponentType       = capacidad registrada por core o plugin
ProjectResource     = recurso preparado y disponible en el proyecto
ComponentInstance   = configuración concreta de un ComponentType
GraphNode           = instancia espacial de un componente dentro de un grafo
RunDraft             = intención operacional pendiente de planificación
ExecutionPlan        = plan canónico generado por el Planner
Task                 = unidad ejecutable del plan
TaskAttempt          = intento concreto de una Task
Evidence             = realidad persistida: estado, artifact, log, métrica o receipt
```

Relaciones importantes:

```text
ProjectResource 1 ---- 0..N GraphNode
ComponentInstance 1 -- 1 GraphNode dentro de un graph snapshot
GraphNode 1 ---------- 0..N Task en el modelo objetivo
Task 1 --------------- 1..N TaskAttempt
Run 1 ---------------- 1..N Evidence
```

Nunca debe asumirse visual ni técnicamente que `GraphNode = Task`.

### 1.3 El Planner conserva su nombre y debe ser determinista

No se renombra `Planner` ni `IExecutionPlanner`.

La planificación puede incorporar hechos, reglas, estimadores, restricciones y alternativas sin introducir aleatoriedad. La condición de reproducibilidad es:

```text
same graph snapshot
+ same selection and requested operation
+ same policies
+ same planning facts snapshot
+ same environment snapshot
+ same Planner version
+ same component-expansion registry and versions
= same canonical ExecutionPlan and plan fingerprint
```

La obtención de hechos puede ocurrir antes de planificar. El snapshot entregado al Planner debe ser inmutable. El Planner no debe consultar estado mutable durante la decisión canónica.

Un LLM no forma parte de la ruta canónica del plan. Una ayuda generativa futura podría proponer políticas o cambios, pero cualquier propuesta debe materializarse como entrada explícita y pasar por el Planner determinista.

### 1.4 La UI no ejecuta ni inventa realidad

Se mantiene la regla estructural:

```text
The UI does not execute.
The engine does not decide.
The Planner does not persist runtime truth.
The state/evidence stores persist reality.
The UI projects persisted or explicitly drafted state.
```

La tarjeta no determina si un retry es seguro, si un puerto es compatible o si una tarea se reutiliza. Renderiza decisiones y evidencias resueltas por contratos gobernados.

### 1.5 No sidebar global ni inspector fijo como centro del workbench

El entorno principal no debe reintroducir:

- una barra lateral global permanente que compita con el mapa;
- un inspector derecho fijo para cualquier selección;
- tabs globales `Graph / Code / Log` como secciones equivalentes;
- un dashboard convencional como página principal.

El detalle se abre desde el contexto del objeto y conserva visible el espacio principal.

## 2. Coherencia con el repositorio actual

### 2.1 Fundamentos ya compatibles

El repositorio ya contiene bases útiles:

- `CanonicalNode.kind` es extensible como `${plugin}:${kind}` y sus roles son genéricos.
- Los plugins registran node kinds, renderers, reglas de conexión y estrategias de tarjeta.
- `GraphNodeCardView` recibe un read model ya proyectado y no es autoridad de negocio.
- Existen estrategias de tarjeta separadas para dbt, DVT y fallback genérico.
- Los puertos ya exponen estados de compatibilidad `available`, `blocked` y `unavailable`.
- Canvas posee authoring truth, no runtime truth.
- El Planner admite un `GenericGraphSourceV1` independiente de dbt.
- Run state, eventos y artifacts ya tienen superficies y contratos separados.

Anchors actuales:

- [Graph frontend architecture](../../../../architecture/components/web/graph/graph-frontend-architecture.md)
- [Canonical graph primitives](../../../../../apps/web/src/app/types/canonical.ts)
- [Graph node card view](../../../../../apps/web/src/app/plugins/graph/GraphNodeCardView.tsx)
- [Graph node card strategies](../../../../../apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts)
- [Node context surfaces](../../../../../apps/web/src/app/views/canvas/canvasNodeContextSurfaceModel.ts)
- [Node context-menu model](../../../../../apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts)
- [Node port handle](../../../../../apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx)
- [Planner current-state assessment](../../../status/planner-current-state-assessment.md)
- [Planner input and ExecutionPlan contract](../../../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts)
- [Planner domain service](../../../../../packages/@dvt/planner/src/domain/Planner.ts)

### 2.2 Gaps que no deben ocultarse

El estado actual no implementa todavía la visión completa:

1. El Planner actual compila un grafo ya expresado en nodos con `stepKind`; no recibe todavía un grafo de componentes rico.
2. La factoría por defecto proyecta esencialmente un nodo a un `ExecutionStep`, no `Component -> 0..N Task`.
3. No existe un `RunDraft` de producto como agregado explícito.
4. No existe un `Run Control` task-centric como segundo espacio primario consolidado.
5. Las superficies de nodo actuales son principalmente `toolbar` y `health`; no existe todavía una pantalla de componente gobernada por scope.
6. Las tarjetas no tienen una política de zoom semántico ni un único dato dependiente de lente.
7. No existe un modelo completo de acciones contextuales derivado de capabilities, evidence, permissions y active gesture.
8. No existe un plan receipt que incluya snapshot de hechos y versiones de expansión de componentes.

La UI objetivo debe permanecer capability-gated. No puede mostrar `cost`, `capacity`, `safe retry`, `reused`, `skipped` o `0..N tasks` sin contrato y evidencia reales.

## 3. Modelo mental: factoría de procesos

La analogía correcta es funcional:

| Factoría de gestión | DVT+ |
| --- | --- |
| Catálogo de maquinaria | Component types y plugins |
| Máquina configurada | Component instance |
| Línea de producción | Graph |
| Material o suministro | Dataset, file, artifact, message |
| Contrato de acoplamiento | Typed port contract |
| Orden de producción | Run Draft |
| Programa de producción | ExecutionPlan |
| Operación | Task |
| Ejecución de la operación | TaskAttempt |
| Capacidad | Warehouse, slots, quotas, connections |
| Parte de producción | Evidence y receipts |
| Sala de control | Run Control |

La analogía no debe contaminar el copy con vocabulario lúdico o industrial cuando no ayude. En la interfaz se usan términos de producto profesionales.

## 4. Ciclo operacional del producto

```text
Graph authoring
    -> operational selection
    -> Run Draft
    -> deterministic plan review
    -> run creation
    -> execution and attempts
    -> evidence
    -> diagnosis or next authoring decision
```

Las etapas se expresan así:

### 4.1 Graph

Snapshot persistido o draft gobernado de:

- component instances;
- configuración;
- ports y contracts;
- edges;
- layout;
- plugin and component versions;
- environment references, nunca secretos inline.

### 4.2 Run Draft

Intención operacional explícita anterior al plan. Ejemplos:

- ejecutar una selección;
- rebuild de un componente y downstream;
- revalidar un contrato;
- reintentar una tarea fallida con el scope permitido;
- publicar un resultado;
- invalidar una reutilización cuando la política lo permita.

No todas las acciones forman parte del Run Draft. Abrir información, cambiar lente, editar el grafo o cancelar un run tienen boundaries diferentes.

### 4.3 ExecutionPlan

Resultado canónico del Planner. Debe incluir tasks, dependencias, policies materializadas, requerimientos de capacidades y fingerprint verificable.

### 4.4 Run

Ejecución del plan por un engine adapter. El engine ejecuta; no replanifica.

### 4.5 Evidence

Estado y conocimiento persistido:

- run and task states;
- attempts;
- timestamps;
- errors;
- logs y pointers;
- artifacts;
- telemetry;
- provenance;
- receipts;
- coste o calidad solo cuando exista evidencia.

## 5. Arquitectura de espacios

La interfaz se organiza en dos espacios primarios y superficies secundarias.

## 5.1 Espacio primario A — Process Map

Es el mapa de ingeniería y situación.

Responsabilidades:

- comprender topología y dependencias;
- crear y configurar componentes;
- conectar ports y contracts;
- seleccionar scopes;
- detectar excepciones;
- abrir pantallas contextuales;
- crear un Run Draft;
- observar de forma resumida el estado persistido.

No debe usarse para:

- mostrar cientos de tasks;
- analizar attempts extensos;
- leer logs largos;
- comparar timelines complejos;
- gestionar simultáneamente muchos runs.

Regla:

```text
Process Map = orientation, authoring and operational intent
```

## 5.2 Espacio primario B — Run Control

Es la sala de control de una ejecución concreta.

Responsabilidades:

- plan y task dependency view;
- task queue;
- estados, attempts y retries;
- critical path;
- waiting and blocked reasons;
- resource allocations cuando exista capability;
- events, errors y logs;
- run cancellation y otras operaciones autorizadas;
- acceso al receipt y artifacts.

Regla:

```text
Run Control = execution truth and operational analysis
```

`Process Map` y `Run Control` comparten el mismo `WorkspaceContext` y conservan selección y `runId` cuando corresponda. No son dos productos desconectados.

## 5.3 Superficie secundaria — Component Screen

Pantalla contextual de un componente. No es un inspector global.

Scopes válidos:

```text
COMPONENT
```

Screens iniciales:

- `Configure`
- `Contract`
- `Plan`
- `Run`
- `Diagnose`
- `History`

Una intención abre directamente la screen correspondiente. No es obligatorio mostrar una fila permanente de tabs.

MVP:

- una sola pantalla efímera abierta;
- anclada visualmente al componente;
- movible dentro del viewport;
- redimensionable con límites;
- cerrable y accesible por teclado;
- el cambio de selección la actualiza o cierra según la acción;
- no hay múltiples ventanas fijadas en la primera vertical.

El pinning múltiple queda fuera del MVP y solo se considerará tras validar uso real.

## 5.4 Superficie secundaria — Plan Review

No pertenece necesariamente a un componente. Debe declarar siempre su scope:

```text
PLAN · COMPONENT
PLAN · SELECTION
PLAN · FULL GRAPH
```

Contenido mínimo:

- scope y operación solicitada;
- componentes afectados;
- tasks generadas;
- dependencias y blockers;
- reuse/skip solo con evidencia;
- policies y constraints materializadas;
- estimates solo con provenance;
- reproducibility fingerprint;
- acción para crear el run.

No mezclar en una ventana titulada con un componente cifras agregadas del subgrafo sin declarar `PLAN · SELECTION`.

## 5.5 Superficie secundaria — Connection / Contract Surface

Aparece durante hover o conexión de ports.

Responsabilidades:

- contrato producido o consumido;
- compatibility state;
- razón de bloqueo;
- targets compatibles;
- creación de un componente compatible al soltar en espacio vacío.

## 5.6 Superficie secundaria — Console

Banda inferior colapsable:

```text
Console | Events | Problems | Alerts
```

Permanece discreta y se expande para evidencia técnica. No sustituye a Run Control.

## 5.7 Superficies terciarias

- tooltips;
- popovers de evidencia;
- confirmations;
- toasts;
- disabled reasons;
- provenance badges.

No deben convertirse en una segunda capa de navegación.

## 6. Shell del workbench

Cabecera mínima:

- DVT+;
- tenant/project/environment;
- graph revision y git revision cuando apliquen;
- command/search entry;
- selector de lente;
- Run Draft o plan status;
- user/help/notifications.

El selector de lentes debe parecer un modo del mapa, no tabs de navegación. Forma recomendada:

```text
Lens: Structure v
```

No se recomienda una fila visualmente equivalente a rutas.

## 7. Tarjeta universal de componente

### 7.1 Responsabilidad

La tarjeta es una **ficha de situación compacta**, no un dashboard ni un mini inspector.

Anatomía estable:

```text
+--------------------------------+
| icon  component identity   alert|
| plugin · component type         |
| one lens-dependent fact         |
ports                          ports
+--------------------------------+
```

Dimensión objetivo inicial:

- ancho: aproximadamente 220–260 px;
- alto: aproximadamente 80–110 px;
- el tamaño puede adaptarse por zoom semántico, no por acumular información.

### 7.2 Contenido permanente

La tarjeta puede mostrar:

1. identidad legible;
2. icono de rol;
3. plugin y component type;
4. un estado excepcional o runtime state relevante;
5. una línea dependiente de la lente;
6. ports visibles y discretos;
7. una alerta excepcional como máximo.

### 7.3 Contenido prohibido simultáneo

No mostrar a la vez:

- cost;
- freshness;
- rows;
- duration;
- tags;
- task projection;
- schema;
- tests;
- throughput;
- owner;
- path;
- configuration;
- run history.

Esos datos viven en una lente o una pantalla contextual.

### 7.4 Línea dependiente de lente

| Lente | Ejemplo |
| --- | --- |
| Structure | `2 tabular inputs -> 1 output` |
| Plan | `4 tasks · 1 reused · 1 blocked` |
| Runtime | `Failed · execute_sql · attempt 2/3` |
| Optional Cost overlay | `Estimated EUR 1.42 · measured 18m ago` |
| Optional Quality overlay | `2 warnings · freshness late` |

No mostrar datos sin capability y evidence.

### 7.5 Selección y estado no usan el mismo canal visual

- icon/geometry = role;
- accent strip or plugin glyph = plugin family;
- outer halo = user selection;
- compact state glyph/chip = runtime state;
- corner marker = exceptional alert;
- port shape = contract family;
- overlay tint = active lens or optional overlay.

No pintar toda la tarjeta de rojo por un fallo ni usar el borde de plugin también como selección.

### 7.6 Éxito silencioso

El estado normal no debe competir visualmente. En `Structure`, un componente correcto puede no mostrar un gran check verde. Los estados activos, desconocidos, degradados, bloqueados o fallidos tienen prioridad.

### 7.7 Selected node

La tarjeta seleccionada mantiene prácticamente el mismo tamaño. Añade:

- halo;
- direct upstream/downstream emphasis;
- command cluster contextual;
- una única línea de estado si es necesaria.

No se expande en un inspector embebido.

## 8. Zoom semántico y escala

Un grafo empresarial no puede depender de tarjetas completas a cualquier escala.

Niveles:

### 8.1 Overview

- subgraphs o modules;
- aggregated status;
- exceptional alerts;
- sin detalle de ports.

### 8.2 Component map

- tarjetas compactas;
- ports y relaciones;
- una línea dependiente de lente.

### 8.3 Focus

- selección;
- command cluster;
- contract labels on demand.

### 8.4 Deep focus

- Component Screen o Plan Review.

Además se requieren:

- search and jump;
- command palette;
- collapse/expand groups;
- saved views;
- minimap;
- filtros;
- list/table alternative para accesibilidad y operaciones masivas.

Task y Attempt no deben forzarse dentro del Process Map. Se analizan en Run Control.

## 9. Lentes del mapa

Las lentes son proyecciones del mismo espacio, no rutas.

## 9.1 Core lens — Structure

Siempre disponible.

Muestra:

- component type;
- plugin family;
- typed ports;
- graph edges;
- contracts;
- structural blockers.

Acción dominante: conectar o inspeccionar estructura.

## 9.2 Core lens — Plan

Disponible con selección, Run Draft o ExecutionPlan.

Muestra:

- scope afectado;
- component-to-task projection real;
- planned, reused, skipped y blocked;
- task dependencies;
- critical path si está calculado;
- constraints.

Acción dominante: review plan o create run.

## 9.3 Core lens — Runtime

Disponible con run activo o snapshot histórico.

Muestra:

- pending;
- running;
- waiting;
- blocked;
- success;
- failed;
- cancelled;
- downstream impact.

Acción dominante: view run o diagnose.

## 9.4 Overlays opcionales

No son universales y solo aparecen si una capability registrada aporta evidencia suficiente:

- Cost;
- Quality;
- Capacity;
- Freshness;
- Security;
- Data classification.

Cada overlay debe declarar:

```text
capability id
source/provenance
observedAt or snapshotId
knowledge state
```

## 10. Estado de conocimiento

DVT+ no debe reducir toda la realidad a verde, amarillo y rojo.

Knowledge states:

```text
measured
estimated
inferred
stale
unknown
```

Ejemplo:

```text
Estimated duration: 4m 18s
Basis: last 12 comparable runs
Evidence age: 22 minutes
Confidence: medium
```

`unknown` no se representa como éxito silencioso cuando el usuario espera evidencia.

## 11. Acciones y menús contextuales

### 11.1 Principio

Las acciones visibles se resuelven a partir de:

```text
target
+ active lens
+ component capabilities
+ configuration state
+ authoring permissions
+ runtime state
+ planning state
+ active gesture
+ available evidence
```

La UI renderiza un `ContextualCommandModel`; no declara acciones ad hoc en cada renderer.

### 11.2 Gramática estable

Los grupos de overflow deben ser previsibles:

```text
Open
Author
Stage
Operate
Diagnose
Lifecycle
```

La prioridad puede variar, no la gramática completa.

### 11.3 Command cluster

Junto al nodo se muestran:

- una primary action;
- como máximo dos secondary actions;
- overflow por clic derecho, `...` o command palette.

No usar ocho botones del mismo peso.

### 11.4 Ejemplos

REST sin credenciales:

```text
Primary: Configure credentials
Secondary: Inspect contract
```

REST listo:

```text
Primary: Test endpoint
Secondary: Open component
```

SQL fallido:

```text
Primary: Diagnose failure
Secondary: Open code
Conditional: Review retry plan
```

Componente ejecutándose:

```text
Primary: View live run
Secondary: Cancel
```

Puerto activo:

```text
Primary: Connect compatible component
Secondary: Inspect contract
```

### 11.5 Retry

No etiquetar una acción como `Retry safely` sin evidencia materializada.

Presentación correcta:

```text
Review retry plan
Retry eligibility: available
Idempotency: guaranteed
Evidence: adapter capability <id>@<version>
```

La creación del retry plan pasa por el Planner.

## 12. Modelo de interacción del Canvas

Separar el primary mode de las superficies transitorias.

Modelo objetivo conceptual:

```ts
type CanvasPrimaryMode =
  | { kind: 'idle' }
  | { kind: 'node-focused'; nodeId: string }
  | { kind: 'connecting'; sourceNodeId: string; sourcePortId: string }
  | { kind: 'selection-planning'; selectionId: string }
  | { kind: 'run-focused'; runId: string };

type CanvasTransientSurface =
  | { kind: 'none' }
  | { kind: 'command-cluster'; nodeId: string }
  | { kind: 'component-screen'; nodeId: string; screen: ComponentScreen }
  | { kind: 'port-contract'; nodeId: string; portId: string }
  | { kind: 'confirmation'; commandId: string };
```

El detalle exacto debe adaptarse a los contracts existentes. La regla es evitar un único reducer que mezcle selección, health popover, ventanas persistentes y run state.

MVP: una superficie contextual efímera; no pinned window registry.

## 13. Connection mode y typed ports

### 13.1 Port categories

Semántica visual recomendada:

| Forma | Contract family |
| --- | --- |
| Circle | tabular data |
| Diamond | control signal |
| Rounded square | file or artifact |
| Hexagon | event or message |

La forma es una ayuda; la verdad está en el contract id y schema/version.

### 13.2 Inicio de conexión

Al arrastrar desde un port:

1. una sola ghost edge sigue al cursor;
2. compatible targets reciben emphasis;
3. incompatible nodes se atenúan;
4. blocked ports siguen visibles;
5. hover sobre un port bloqueado muestra razón precisa;
6. soltar en espacio vacío abre creación compatible en el punto de drop.

No dibujar varias ghost edges como si se fueran a crear múltiples conexiones.

### 13.3 Contract popover

Ejemplo:

```text
Produces
data.tabular/orders.v1
Schema: orders-contract@1
```

Blocked reason:

```text
Blocked
Expected: control.signal
Received: data.tabular/orders.v1
Rule: command.quality-gate.input@1
```

### 13.4 Create compatible component

El catálogo se filtra por:

- active canvas kind;
- enabled plugins;
- port compatibility;
- permissions;
- environment capability.

Aparece en el punto de drop, no como panel fijo.

### 13.5 Edge semantics

Distinguir relaciones, no solo tipos de nodos:

| Relation | Default rendering |
| --- | --- |
| Data flow | solid directional line |
| Control dependency | dashed line |
| Validation dependency | dotted line |
| Artifact relation | line plus artifact glyph |
| Event/message | event glyph; animation only during active runtime |

## 14. Run Draft

### 14.1 Propósito

`RunDraft` sustituye a una cola genérica de intenciones. Solo contiene operaciones con efecto de ejecución.

No incluye:

- abrir una screen;
- cambiar lente;
- mover un nodo;
- editar layout;
- navegar;
- cancelar un run activo.

### 14.2 Contenido mínimo

```ts
type RunDraft = {
  runDraftId: string;
  graphSnapshotRef: string;
  scope: ComponentScope | SelectionScope | FullGraphScope;
  requestedOperations: readonly RequestedOperation[];
  policyRef: string;
  environmentSnapshotRef: string;
  planningFactsSnapshotRef?: string;
  requestedBy: string;
  createdAt: string;
};
```

El contrato final debe seguir la gobernanza del repo y no duplicar ownership existente.

### 14.3 Acciones

- add/remove requested operation;
- change allowed scope;
- inspect consequences;
- request plan preview;
- discard draft;
- create run after valid plan review.

### 14.4 No ejecución implícita

Una acción como `Review retry plan` crea o actualiza un Run Draft. No inicia el engine.

## 15. Planner, component expansion y reproducibilidad

### 15.1 Planner único

Existe un único Planner. Su evolución interna puede incluir colaboradores, pero no una segunda autoridad denominada `IntelligentPlanner`.

### 15.2 Component -> 0..N Task

Modelo objetivo:

```text
ComponentInstance
    -> deterministic component expander
    -> TaskGraphFragment
    -> global dependency reconciliation
    -> canonical ExecutionPlan
```

Contrato conceptual:

```ts
interface IComponentTaskExpander {
  readonly id: string;
  readonly version: string;
  supports(component: ComponentInstanceSnapshot): boolean;
  expand(input: {
    component: ComponentInstanceSnapshot;
    graph: ComponentGraphSnapshot;
    context: PlanningContextSnapshot;
    operation: RequestedOperation;
  }): TaskGraphFragment;
}
```

Requisitos:

- pure and deterministic;
- no IO;
- stable ordering and tie-breaks;
- explicit capabilities;
- no secrets inline;
- version recorded in the plan receipt;
- task ids derived deterministically;
- explicit 0-task result with reason when skipped/reused/declarative.

### 15.3 Gap contractual actual

`GenericGraphSourceV1` está actualmente expresado con `stepKind`, por lo que su forma está cerca de un task graph ya adaptado. Antes de implementar `Component -> 0..N Task` debe tomarse una decisión explícita:

1. hard-cut a un component graph ingress; o
2. introducir un nuevo component graph source y retirar después el step-shaped ingress.

DVT+ está en pre-producto; no debe inventarse una obligación de compatibilidad de producto inexistente. La decisión debe respetar los guards y contracts internos vigentes, pero optimizar claridad del modelo objetivo.

### 15.4 Planning facts snapshot

Puede contener, cuando existan:

- artifact fingerprints;
- prior execution metrics;
- adapter capabilities;
- resource limits;
- rate limits;
- cost model version;
- estimator version;
- evidence timestamps;
- idempotency evidence.

El snapshot es input canónico o referencia a contenido inmutable. El Planner no consulta fuentes mutables durante `buildPlan`.

### 15.5 Plan receipt

Contenido objetivo:

```text
Graph snapshot
Selection and requested operation
Policies
Environment snapshot
Planning facts snapshot
Planner version
Component expander registry version
Expander ids and versions used
ExecutionPlan fingerprint
Reasons and constraints
Knowledge state of estimates
```

Ejemplo:

```text
Reused Payments artifact
Reason: fingerprint unchanged
Evidence: artifact:pay-447@sha256:...

Limited warehouse concurrency to 4
Reason: environment policy production-default@7
```

No usar explicación generativa como autoridad.

## 16. Plan Review

Orden de información:

1. resultado resumido;
2. blockers;
3. task projection;
4. constraints;
5. estimates con provenance;
6. reasons;
7. reproducibility details bajo demanda.

Ejemplo de composición:

```text
PLAN · SELECTION
4 components · 9 tasks · 1 blocker
Critical path 4m 18s · Estimated EUR 1.42

Task projection
resolve_connection -> validate_sql -> execute_sql -> capture_metrics

Blocker
execute_sql requires connectionRef in Production

Why this plan >
Reproducibility >

[Create run] [Discard]
```

No mostrar `Stage plan` si el plan ya es el resultado de un Run Draft sin definir qué significa stage. Usar verbos de dominio concretos.

## 17. Run Control

### 17.1 Scope

Siempre declara:

```text
RUN · <runId>
PLAN · <planId>
GRAPH SNAPSHOT · <ref>
```

### 17.2 Estructura inicial

- task list or queue;
- dependency/timeline view;
- attempts and retry state;
- blockers and waiting reasons;
- evidence/details panel contextual;
- bottom or integrated event/log console;
- receipt and artifacts access.

### 17.3 Primary operations

- cancel run cuando esté permitido;
- inspect task;
- inspect attempt;
- open related component;
- review retry plan after failure;
- navigate to evidence.

El Run Control no replanifica de forma implícita. Cualquier retry que requiera un nuevo plan vuelve a Run Draft + Planner.

### 17.4 Process Map synchronization

El Process Map refleja snapshots persistidos del run y permite saltar al Run Control. No debe inspeccionar memoria interna del engine como fuente primaria.

## 18. Plugin boundaries

### 18.1 Plugins pueden aportar

- component types;
- authoring schema;
- typed ports and contracts;
- renderer/card projection strategy;
- contextual command contributions declarativas;
- Component Screen contributions;
- component task expander;
- runtime adapter capability requirements;
- evidence projections;
- optional overlays.

### 18.2 Plugins no pueden

- ejecutar directamente desde la UI;
- saltarse authorization;
- crear acciones no gobernadas;
- decidir global ordering fuera del Planner;
- convertirse en source of truth de run state;
- renderizar un shell paralelo incompatible;
- inventar evidence o safe-retry claims.

### 18.3 Shell ownership

El shell posee:

- selección;
- active lens;
- spatial context;
- command resolution composition;
- window/surface lifecycle;
- accessibility;
- permissions projection;
- consistent card and port grammar.

El plugin aporta contenido y capabilities, no un producto visual independiente.

## 19. Accesibilidad y productividad

Requisitos mínimos:

- keyboard navigation between nodes and ports;
- visible focus distinct from selection and runtime state;
- command palette with contextual commands;
- accessible names for cards, ports, statuses and disabled reasons;
- no information encoded only by color;
- reduced-motion support;
- list/table alternative for graph information;
- screen-reader summary for selected component and active run;
- escape closes transient surface predictably;
- focus returns to trigger after close;
- zoom does not make essential controls unreachable;
- touch targets and pointer hit areas larger than visual port glyphs.

## 20. Rendimiento y límites operativos de UI

- Card projection must remain pure and cheap.
- Overlay contexts are precomputed once per render cycle.
- No per-card fetch.
- Virtualize or aggregate large graphs.
- Do not render task micro-DAGs on every card.
- Component Screen loads detail on demand through governed queries.
- Run Control paginates events, attempts and logs.
- Live updates use bounded subscriptions and coalescing.
- Preserve deterministic ordering in lists and task projections.

## 21. Anti-patterns prohibidos

- dbt-first information architecture;
- node card as dashboard;
- selected card growing into inspector;
- eight equal action buttons;
- global permanent left rail;
- permanent right inspector;
- random KPI dashboard;
- multiple floating windows in MVP;
- lenses styled as global routes;
- retry claim without evidence;
- UI-created task graph;
- plugin-specific action bars outside the governed model;
- several ghost edges during one connection gesture;
- fake cost, capacity, reuse or quality data;
- AI assistant shown as Planner authority;
- literal game aesthetics, neon HUD, military/fantasy language.

## 22. Vertical inicial obligatoria

Implementar y validar primero un flujo completo, no piezas visuales aisladas:

```text
1. Process Map in Runtime lens
2. SQL component displays failed state
3. User focuses the component
4. Primary action is Diagnose
5. COMPONENT · DIAGNOSE opens
6. Failed task, attempt and persisted evidence are shown
7. User chooses Review retry plan
8. Run Draft is created for an explicit scope
9. Planner builds a deterministic plan
10. PLAN · SELECTION shows tasks, constraints and receipt
11. User creates the run
12. Run Control opens
13. Tasks and attempts update from persisted run state
14. Completion evidence is available
15. Process Map reflects the final persisted state
```

Este vertical demuestra la arquitectura completa y evita construir un diseño de tarjetas sin producto operacional detrás.

## 23. Plan de implementación por fases

Cada fase debe seguir el protocolo DB-first, ownership, C&Q rails, architecture tests, presentation tests y browser proof vigente en el repositorio.

### Fase 0 — Baseline y decisiones de contrato

- [ ] Registrar esta propuesta como governing target, sin declararla implementación terminada.
- [ ] Crear una matriz `current / target / gap / owner` para Canvas, Planner, Run State y plugins.
- [ ] Decidir el boundary de component graph ingress para `Component -> 0..N Task`.
- [ ] Decidir hard cut o transición interna; no asumir compatibilidad externa pre-producto.
- [ ] Catalogar los command/query rails reutilizables antes de crear nuevos.
- [ ] Registrar los nuevos component boundaries y planned rails en Planning DB.
- [ ] Definir feature flags solo si son necesarias para una integración incremental; no mantener dos productos paralelos indefinidamente.

**Salida:** ADR o decision record y Planning DB baseline.

### Fase 1 — Universal Node Card V3

- [ ] Evolucionar el read model actual sin crear una segunda tarjeta paralela.
- [ ] Separar identity, plugin/type, status, lens fact y exceptional alert.
- [ ] Eliminar copy o métricas permanentes no justificadas.
- [ ] Mantener selección y runtime state en canales visuales distintos.
- [ ] Añadir presentation tests para Structure, Plan y Runtime projections.
- [ ] Añadir architecture guard que impida fetch o store access desde la card view.
- [ ] Probar dbt, DVT y fallback/plugin node con la misma gramática.

**Expected reuse:**

- `GraphNodeCardView.tsx`
- `graphNodeCardStrategyContracts.ts`
- `graphNodeCardReadModel.ts`
- `graphVisualTokens.ts`
- plugin card strategies

**DoD:** tarjeta compacta, sin expansión al seleccionar y sin dashboard embebido.

### Fase 2 — Lens model y semantic zoom

- [ ] Crear un lens read model explícito con `structure`, `plan`, `runtime`.
- [ ] Resolver disponibilidad de lens por context y capability.
- [ ] Tratar Cost/Quality/Capacity como optional overlays.
- [ ] Implementar una sola línea lens-dependent por card.
- [ ] Implementar semantic zoom o, inicialmente, thresholded presentation levels.
- [ ] Añadir list/table equivalent para la selección actual.
- [ ] Probar que cambiar lens no cambia de route ni pierde selección.

**DoD:** el mismo grafo conserva layout e identidad; solo cambia su proyección.

### Fase 3 — Governed contextual command resolver

- [ ] Extender el modelo existente; no permitir botones arbitrarios por renderer.
- [ ] Definir grupos estables `Open/Author/Stage/Operate/Diagnose/Lifecycle`.
- [ ] Resolver primary action y máximo dos secondary actions.
- [ ] Incorporar permissions, capabilities, state, lens, active gesture y evidence.
- [ ] Proporcionar disabled reasons reales.
- [ ] Mantener context menu y command palette como overflow consistente.
- [ ] Añadir unit matrix por estado de REST, SQL, file, dbt, command y sink.

**Expected reuse:**

- `canvasNodeContextMenuModel.ts`
- `canvasNodeFloatingToolbarModel.ts`
- existing route-owned command callbacks

**DoD:** para cada contexto probado existe una acción primaria inequívoca y no aparecen acciones ficticias.

### Fase 4 — Component Screen shell

- [ ] Crear un shell contextual único con scope `COMPONENT`.
- [ ] Soportar screens `Configure`, `Contract`, `Run`, `Diagnose` primero.
- [ ] Mantener una única surface efímera.
- [ ] Implementar anchoring, close, focus return y bounded resize.
- [ ] Consumir plugin screen contributions declarativas.
- [ ] No implementar pinning múltiple.
- [ ] Integrar con el lifecycle de pane click, node drag, context menu y route changes.

**DoD:** abrir `Diagnose` no crea un route global ni un inspector permanente.

### Fase 5 — Diagnostic vertical sobre evidencia real

- [ ] Mapear selected component a run/task/attempt evidence persistida.
- [ ] Mostrar failure, attempt, timestamps, error and evidence pointers.
- [ ] Mostrar downstream impact derivado, no inventado.
- [ ] Resolver retry eligibility desde capability/evidence.
- [ ] Implementar `Review retry plan`, nunca direct run start desde la screen.
- [ ] Añadir browser proof con un fallo real o fixture contract-realista en el boundary aprobado.

**DoD:** el usuario puede pasar de componente fallido a un Run Draft sin que la UI fabrique tareas.

### Fase 6 — Connection mode V2

- [ ] Formalizar port contract ids y families.
- [ ] Mantener una ghost edge por gesture.
- [ ] Highlight de compatible targets y dim de incompatibles.
- [ ] Mostrar blocked reason on hover/focus.
- [ ] Crear catálogo compatible en drop point.
- [ ] Distinguir edge relation semantics.
- [ ] Probar teclado y screen reader para conexión.

**Expected reuse:**

- `CanvasNodePortHandle.tsx`
- plugin connection rules
- Canvas edge admission rails
- active canvas node-kind catalog

**DoD:** ningún target aparece compatible sin una regla registrada.

### Fase 7 — Run Draft aggregate y API boundary

- [ ] Diseñar el contrato mínimo de Run Draft sin duplicar graph draft ni start-run command.
- [ ] Persistencia o session scope según decisión de producto, siempre con ownership.
- [ ] Añadir requested operations y explicit scope.
- [ ] Crear preview command que invoca Planner con snapshots explícitos.
- [ ] Separar `discard draft`, `preview plan` y `create run`.
- [ ] Añadir authorization y audit events.

**DoD:** ninguna operación staged inicia ejecución antes de plan review y confirmación.

### Fase 8 — Component expansion en Planner

- [ ] Introducir component graph snapshot o hard-cut equivalente.
- [ ] Crear registry de deterministic component expanders.
- [ ] Implementar `TaskGraphFragment` y reconciliation global.
- [ ] Garantizar stable ids, ordering and tie-breaks.
- [ ] Materializar 0-task result con reason/evidence.
- [ ] Registrar expander ids/versions en fingerprint o receipt.
- [ ] Implementar al menos tres familias para probar heterogeneidad:
  - REST o File;
  - SQL;
  - dbt.
- [ ] Eliminar la asunción productiva de un step por node.
- [ ] Mantener `Planner` e `IExecutionPlanner` como nombres canónicos.

**DoD:** una prueba demuestra que dos componentes distintos proyectan diferentes task graphs y que la misma entrada produce el mismo plan.

### Fase 9 — Plan Review y receipt

- [ ] Implementar scopes `COMPONENT`, `SELECTION`, `FULL GRAPH`.
- [ ] Mostrar tasks y blockers reales.
- [ ] Mostrar reuse/skip solo si el plan los materializa.
- [ ] Añadir knowledge state y provenance a estimates.
- [ ] Generar reproducibility fingerprint y details.
- [ ] Mostrar reasons/constraints deterministas.
- [ ] Crear run usando planRef validado.

**DoD:** no hay mismatch entre el plan mostrado y el plan ejecutado.

### Fase 10 — Run Control

- [ ] Crear space task-centric para un run.
- [ ] Integrar task list, dependencies, attempts and evidence.
- [ ] Añadir bounded live updates desde state store/events.
- [ ] Integrar console and logs por pointers/pagination.
- [ ] Implementar cancel y open-related-component.
- [ ] Implementar review retry plan after failure.
- [ ] Sincronizar navegación con Process Map.

**DoD:** un run completo puede entenderse y diagnosticarse sin forzar todas las tasks dentro del Canvas.

### Fase 11 — Optional evidence overlays

Implementar individualmente y solo cuando exista provider real:

- [ ] Cost;
- [ ] Quality;
- [ ] Capacity;
- [ ] Freshness;
- [ ] Security/classification.

Cada overlay exige contract, provenance, knowledge state, tests y empty/unavailable posture.

### Fase 12 — Capacidades posteriores, no MVP

- [ ] historical replay;
- [ ] scenario comparison;
- [ ] multiple pinned component screens;
- [ ] future capacity simulation;
- [ ] alternative plan comparison;
- [ ] generative assistance outside canonical planning.

## 24. Matriz de validación

### 24.1 Unit

- card projection per lens;
- contextual action resolution;
- port compatibility;
- Component Screen model;
- Run Draft transitions;
- deterministic component expansion;
- stable plan fingerprint;
- knowledge-state projection.

### 24.2 Presentation

- compact card dimensions and content budget;
- selected node does not expand;
- focus differs from selection and status;
- one primary plus at most two secondary actions;
- lens selector is not route navigation;
- blocked reason and provenance are legible;
- Component Screen focus lifecycle.

### 24.3 Architecture

- no fetch/store access in leaf views;
- plugins cannot bypass command resolver;
- UI cannot start engine directly;
- Run Control reads persisted state boundary;
- component expanders are pure and versioned;
- no plugin-specific shell duplication;
- no permanent global rail reintroduced.

### 24.4 Integration

- failed component -> diagnose -> Run Draft;
- Run Draft -> planRef -> create run;
- plan shown equals plan executed;
- run state updates -> Run Control and Process Map;
- connection drop -> compatible component admission;
- authorization blocks unavailable commands.

### 24.5 Browser/E2E

El browser proof inicial debe ejecutar la vertical del apartado 22 con selectors semánticos, no copy frágil.

## 25. Métricas de éxito de producto

No medir solo click count. Medir:

- tiempo para identificar el componente causante de un fallo;
- tiempo para comprender downstream impact;
- tasa de acciones contextuales correctas al primer intento;
- diferencia entre plan preview y run real;
- número de surfaces simultáneas abiertas;
- tasa de comandos bloqueados con razón entendida;
- tiempo para conectar un component compatible;
- porcentaje de planes con receipt completo;
- precisión/provenance de estimates;
- rendimiento del Canvas en graphs grandes;
- accesibilidad de navegación sin ratón.

## 26. Riesgos y mitigaciones

### Riesgo: metáfora de juego domina el producto

Mitigación: usarla solo para mapa, recursos, órdenes contextuales, escala y control; mantener copy profesional y visual sobrio.

### Riesgo: demasiadas superficies flotantes

Mitigación: una Component Screen efímera en MVP; Run Control separado para complejidad task-centric.

### Riesgo: acciones demasiado cambiantes

Mitigación: grupos estables, primary contextual, máximo dos secondary y command palette consistente.

### Riesgo: tarjetas vuelven a crecer

Mitigación: content budget contractual y presentation tests por lens.

### Riesgo: UI promete capacidades futuras

Mitigación: capability gating, evidence provenance y explicit unavailable state.

### Riesgo: Planner pierde determinismo

Mitigación: immutable snapshots, pure expanders, stable ordering, versioned registry and plan receipt.

### Riesgo: component graph y step graph se mezclan

Mitigación: decision record de ingress antes de implementar expansión 0..N.

### Riesgo: Run Control duplica Canvas

Mitigación: Canvas es component-centric; Run Control es task/attempt-centric.

## 27. Definition of Done global

La dirección se considera implementada cuando:

- DVT+ representa de forma igualitaria varias familias de componentes;
- la tarjeta universal permanece compacta en selección y runtime;
- el Process Map soporta Structure, Plan y Runtime como lenses reales;
- las acciones contextuales son gobernadas, predecibles y capability-aware;
- existe una Component Screen contextual sin inspector fijo;
- el connection mode explica compatibilidad por contracts;
- existe un Run Draft explícito;
- el Planner proyecta componentes a `0..N` tasks de forma determinista;
- Plan Review muestra el mismo plan que se ejecuta;
- Run Control permite analizar tasks, attempts y evidence;
- la UI no inventa cost, quality, capacity, retry safety o reuse;
- existe browser proof de la vertical completa;
- Planning DB, docs, tests y implementation surfaces están reconciliados.

## 28. Decisión final

DVT+ no debe diseñarse como un dashboard, un editor dbt ni un simple workflow builder.

Debe construirse como:

```text
Process engineering environment
+ deterministic planning workbench
+ execution control room
+ auditable evidence system
```

La analogía de una factoría programable de procesos aporta una estructura útil y diferenciadora para SaaS complejos: mapa estable, recursos, componentes, órdenes contextuales, planificación explícita, tareas, ejecución y evidencia. Su valor está en la arquitectura de interacción, no en parecer visualmente un videojuego.

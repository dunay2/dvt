# ADR-0019 — Dungeon Master: Lord of Orchestration

Status: Proposed  
Date: 2026-02-25

## Context — The Campaign Problem

En DVT queremos una campaña limpia: arquitectura hexagonal, CQRS, y motor agnóstico.  
Eso significa que los aventureros (adapters) **no** pueden escribir el grimorio de estado por su cuenta.

[`ADR-0017`](./ADR-0017-state-write-boundary-for-engine-adapters.md) ya fijó que los adapters deben lanzar comandos canónicos a través de puertos de dominio.  
[`ADR-0018`](./ADR-0018-divination-layer-dd-naming-and-contract.md) confirmó que el lenguaje D&D es oficial siempre que exista contrato técnico fuerte.

Para evitar caos entre mesas (Temporal, Conductor, Divination y futuras), introducimos una figura central de gobierno de partida: **Dungeon Master**.

## Decision — Ruling of the Dungeon Master

1. DVT adopta **Dungeon Master** como coordinador canónico del ciclo de vida de runs.
2. Dungeon Master es un **orquestador de capa aplicación/servicio**; no es planner ni adaptador de persistencia.
3. Dungeon Master gobierna:
   - recibe intenciones de run y transiciones reportadas por adapters,
   - aplica orden y guardrails de la aventura (secuenciación y reglas de control),
   - despacha comandos validados al borde write-side por puertos de dominio,
   - activa hooks de auditoría y proyección.
4. Reglas inviolables del DM:
   - **MUST NOT** escribir SQL/tablas/ORM directo,
   - **MUST NOT** decidir semántica de planner más allá de orquestación,
   - **MUST NOT** saltarse validación/idempotencia del write boundary.
5. Los adapters (Temporal, Conductor, Divination y futuros) se integran con Dungeon Master por contratos estables; nunca por escritura directa de estado.

## Ports and Responsibilities — Sheet de personaje del DM

### Puertos de entrada (Incoming)

- `RunIntentPort` (entra el intento: start/cancel/signal)
- `AdapterTransitionIngressPort` (entran transiciones canónicas desde adapters)

### Puertos de salida (Outgoing)

- `RunStateCommandPort` (frontera autoritativa write-side)
- `AuditEventPort` (emisión de eventos de dominio/auditoría)
- `ProjectionTriggerPort` (disparo de actualización read-model)

### Fuera de alcance (No-spells)

- construcción DAG del planner y generación de plan,
- persistencia DB directa,
- modelado de queries de proyección para UI,
- detalles runtime específicos de proveedor.

## Consequences — Loot & Costes

### Positive (Loot)

- Un solo dueño claro del flujo de orquestación.
- Intercambiabilidad real de adapters sobre un núcleo estable.
- Mejor cumplimiento de límites hexagonales y CQRS.
- Menor riesgo de recaer en acoplamiento de persistencia.

### Trade-offs (Coste de campaña)

- Un componente adicional que operar y testear.
- Más contratos explícitos que mantener.
- Posible hop extra de latencia en control de ejecución.

## Impact — Efectos en el mundo

- Los adapters existentes deben enrutar transiciones por el ingress del Dungeon Master.
- La estrategia de pruebas de orquestación pasa a ser de primer nivel:
  - contract tests adapter → Dungeon Master,
  - contract tests Dungeon Master → `RunStateCommandPort`,
  - tests de secuenciación e idempotencia.
- Diagramas y documentación deben mostrar Dungeon Master como orquestador del control plane.

## Acceptance Criteria — Quest Completion

1. El contrato formal de puertos ingress/egress de Dungeon Master está documentado y versionado.
2. Al menos un flujo adapter (Temporal) enruta transiciones vía Dungeon Master sin regresión.
3. Ningún runtime path de adapter escribe estado de infraestructura directo.
4. Dungeon Master no bypass-ea validación/idempotencia de `RunStateCommandPort`.
5. Se añaden tests de conformidad de orquestación a CI.

## Traceability — Canon del Reino

- Baseline:
  - [`ADR-0014`](./ADR-0014-run-driven-adapter-model.md)
  - [`ADR-0017`](./ADR-0017-state-write-boundary-for-engine-adapters.md)
  - [`ADR-0018`](./ADR-0018-divination-layer-dd-naming-and-contract.md)
- Decision: introducir Dungeon Master como componente de orquestación del control plane con límites estrictos.
- Implements:
  - puertos/contratos de orquestación,
  - refactor de ingress desde adapters,
  - tests de conformidad de orquestación.

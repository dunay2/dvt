# Operational Design Authority Proposal

Estado: propuesta
Fecha: 2026-06-05
Rama: `codex/operational-events-proposals-20260605`
Alcance: DVT / DB-first architecture / business-object-first design

## 1. Resumen ejecutivo

DVT tiene una oportunidad real para cubrir un hueco que las herramientas de datos, lineage, catálogo, BPM y DWH automation suelen dejar separado: el diseño conjunto del modelo operacional y del flujo de información.

La propuesta no es convertir DVT en otro orquestador visual ni en otro dbt visual. La propuesta es evolucionar DVT hacia una capa DB-first donde el objeto operacional sea la unidad primaria de diseño y desde ahí se deriven tablas, estados, comandos, eventos, contratos, flows, planes, ejecución, evidencia, lineage y documentación.

Principio rector:

```text
business object first, pipeline second
```

La arquitectura actual ya tiene bases útiles en `architecture.*`, `graphSource`, planner, PlanRef, state store, evidence y lineage. Lo que falta es una capa semántica explícita para negocio operacional.

## 2. Problema que resuelve

En sistemas reales el diseño suele quedar partido:

```text
modelo de datos por un lado
procesos por otro
pipelines por otro
lineage inferido después
reglas escondidas en SQL/código
```

En una base de datos operacional una cosa define a la otra:

```text
entidad -> estado -> comando -> evento -> almacenamiento -> flujo downstream
```

Sin una autoridad unificada, DVT corre el riesgo de quedarse en:

```text
source -> transform -> sink
```

Ese vertical es útil como scaffold técnico, pero no es suficiente como producto diferencial.

## 3. Objetivo

Crear una nueva capability:

```text
Operational Design Authority
```

Responsabilidad:

```text
definir y gobernar objetos operacionales, estados, comandos, eventos, reglas, contratos, storage mappings, flows derivados, tests y evidencia
```

La capa no sustituye `architecture.*`. La complementa.

## 4. Frontera propuesta

```text
operational_design = autoridad semántica de negocio
architecture        = autoridad de arquitectura técnica
planner/runtime     = autoridad de plan, admisión y ejecución
docs               = proyección humana generada/revisada
```

Regla dura:

```text
ningún flow operacional debería nacer solo como grafo técnico si representa un objeto de negocio con ciclo de vida
```

## 5. Modelo mínimo propuesto

Nuevo schema:

```sql
create schema if not exists operational_design;
```

Tablas iniciales:

```text
operational_design.business_object
operational_design.business_attribute
operational_design.business_entity
operational_design.business_state
operational_design.business_transition
operational_design.business_command
operational_design.business_query
operational_design.business_event
operational_design.business_policy
operational_design.business_storage_mapping
operational_design.business_flow
operational_design.business_flow_step
operational_design.business_contract_link
operational_design.business_lineage_policy
operational_design.business_test
operational_design.business_evidence
```

## 6. Relación con `architecture.*`

No debe existir un segundo grafo técnico paralelo. La capa operacional se proyecta hacia la arquitectura existente.

Mapping conceptual:

```text
business_object          -> architecture.component
business_command         -> architecture.component_port(port_kind = command)
business_query           -> architecture.component_port(port_kind = query)
business_event           -> architecture.component_event_io
business_storage_mapping -> architecture.component_storage_io
business_flow            -> architecture.component_flow
business_flow_step       -> architecture.component_flow_step
business_contract_link   -> architecture.contract
business_test            -> architecture.component_test
business_evidence        -> architecture.evidence
```

## 7. Ejemplo de objeto operacional

```text
Shipment
  states:
    CREATED
    PLANNED
    LOADED
    IN_TRANSIT
    DELIVERED
    FAILED
    RETURNED
    CANCELLED

  commands:
    CreateShipment
    AssignRoute
    MarkLoaded
    RegisterDeliveryAttempt
    ConfirmDelivery
    RegisterFailure

  events:
    ShipmentCreated
    RouteAssigned
    ShipmentLoaded
    DeliveryAttempted
    DeliverySucceeded
    DeliveryFailed

  storage:
    shipment
    shipment_event_log
    shipment_current_status
    shipment_exception_queue

  flows:
    shipment_ingestion_flow
    shipment_state_projection_flow
    shipment_exception_detection_flow
    shipment_data_product_flow
```

## 8. Cómo se compila

Flujo objetivo:

```text
BusinessObjectDesign
  -> validation
  -> architecture projection
  -> selected business flow
  -> canonical graphSource
  -> planner
  -> persisted PlanRef
  -> runtime admission
  -> engine/adapter execution
  -> evidence + lineage
```

El planner no debe aprender semántica operacional. La adaptación debe ocurrir antes:

```text
operational design adapter -> canonical graphSource
```

## 9. Por qué hacerlo

### Valor técnico

- Reduce drift entre diseño, código, SQL, tests y documentación.
- Hace visible el ciclo de vida del dato, no solo su transformación.
- Permite impact analysis antes de ejecutar.
- Convierte contratos, comandos, eventos y storage en entidades consultables.
- Aprovecha el trabajo DB-first ya realizado.

### Valor de producto

- Diferencia DVT de dbt visual, catálogos y orquestadores.
- Permite explicar sistemas de información, no solo pipelines.
- Hace viable una UI object-first.
- Da una historia fuerte para distribución, logística, stock, billing y operaciones.

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Convertir DVT en BPM genérico | Alto | Mantener foco en data/system design, no workflow humano genérico |
| Duplicar `architecture.*` | Alto | Proyección unidireccional y reglas anti split-brain |
| Sobremodelar antes de ejecutar | Medio | Primer vertical pequeño con un objeto y un flow |
| Meter runtime live prematuro | Alto | Empezar con fuentes capturadas y planes batch/replayables |
| UI demasiado pronto | Medio | Contratos + DB + proyección antes de Canvas |

## 11. Plan de implementación

### OD-01 — ADR y frontera

Crear ADR:

```text
ADR Operational Design Authority
```

Debe fijar:

```text
DVT diseña sistemas de información, no sustituye sistemas operacionales externos
operational_design es semántica de negocio
architecture sigue siendo autoridad técnica
planner no contiene semántica de negocio
```

DoD:

```text
ADR aceptado
glosario actualizado
lane OD creada
```

### OD-02 — Schema `operational_design`

Crear migración mínima.

DoD:

```text
schema aplicable
tablas base
enums/check constraints
fixtures mínimas
```

### OD-03 — Contratos TypeScript

Crear contratos v1:

```text
BusinessObjectDesign.v1.ts
BusinessStateMachine.v1.ts
BusinessCommand.v1.ts
BusinessEvent.v1.ts
BusinessStorageMapping.v1.ts
BusinessFlow.v1.ts
OperationalDesignValidation.v1.ts
```

DoD:

```text
sin any
zod schemas
tests positivos y negativos
pnpm validate:contracts
```

### OD-04 — Command/query rails

Crear rails:

```text
CreateBusinessObjectDesign
ApproveBusinessObjectDesign
ListBusinessObjects
GetBusinessObjectDesign
ValidateBusinessObjectDesign
```

DoD:

```text
commands idempotentes
queries DB-first
evidencia de validación
```

### OD-05 — Proyección hacia `architecture.*`

Crear projector:

```text
OperationalDesignArchitectureProjector
```

DoD:

```text
business_object -> component
commands/queries/events -> ports/event_io
flows -> component_flow/component_flow_step
storage -> component_storage_io
contracts -> architecture.contract
```

### OD-06 — Compiler `operational-flow-v1`

Nuevo source family:

```text
sourceFamily: operational-design-flow
sourceVersion: operational-flow-v1
```

DoD:

```text
BusinessObjectDesign + selected flow -> graphSource
planner buildPlan OK
PlanRef persistido
runtime admission separada
```

### OD-07 — UI object-first

Primera UI no debe ser canvas libre. Debe ser inspector de objeto:

```text
BusinessObjectCard
  Overview
  States
  Commands
  Events
  Storage
  Flows
  Tests
  Evidence
```

DoD:

```text
crear/ver objeto
ver estados/eventos/storage/flows
preview de selected flow
```

## 12. Primera vertical recomendada

No empezar por `Order` genérico si el objetivo actual es distribución. Mejor:

```text
Shipment
```

Motivo:

```text
incluye eventos externos, estados observados, excepciones, read models, KPIs y lineage
```

Primer resultado vendible:

```text
ShipmentObservedState + ShipmentEventTimeline + ShipmentExceptionQueue
```

## 13. Conclusión

Sí merece la pena. Pero el paso correcto no es ampliar nodos visuales sin semántica. El paso correcto es crear una autoridad operacional DB-first que proyecte hacia la arquitectura existente y compile flows gobernados.

La tesis de producto queda:

```text
DVT convierte modelos operacionales en sistemas de información gobernados, ejecutables, trazables y explicables.
```

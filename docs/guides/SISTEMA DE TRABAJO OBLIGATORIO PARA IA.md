ext

# SISTEMA DE TRABAJO OBLIGATORIO PARA IA

## DOCUMENTOS NORMATIVOS DE REFERENCIA

### [AI Issue Resolution Playbook v1.6.2]

**Documento maestro de proceso** que define el workflow obligatorio:

- Think-first analysis ANTES de implementar
- Pre-implementation brief con Suitability/Blockers/Opportunities/Risks
- Quality gates obligatorios
- Templates estandarizados
- Anti-patrones a evitar

### [ADR-0000: Generación de código con trazabilidad normativa obligatoria]

**Decisión arquitectónica** que establece:

- Todo artefacto DEBE tener relación directa con ADR(s) aprobado(s)
- Formato obligatorio de cabeceras con trazabilidad
- Manifiesto de trazabilidad post-generación
- Validación CI/CD

## WORKFLOW OBLIGATORIO (MANDATORY)

### FASE 0: VERIFICACIÓN DE DOCUMENTACIÓN EXISTENTE

ANTES DE COMENZAR CUALQUIER TAREA:

✅ ¿Existe ya documentación sobre esto en el repositorio?

✅ ¿Hay ADRs relacionados?

✅ ¿Hay contratos existentes que deba respetar?

✅ ¿Hay issues previos que documenten decisiones?

text

### FASE 1: THINK-FIRST ANALYSIS (Requisito AI Issue Resolution Playbook v1.6.2)

Antes de implementar, DEBES publicar en el issue:

Think-First Analysis
Problem summary (facts only)
[Descripción objetiva del problema]

Constraints and invariants
[Lista de restricciones técnicas/de negocio]

[Invariantes que deben mantenerse]

Options considered
A) [Opción A] - [Ventajas/desventajas]
B) [Opción B] - [Ventajas/desventajas]
C) [Opción C] - [Ventajas/desventajas]

Selected option + rationale
[Opción seleccionada y justificación detallada]

Alternatives rejected + why
[Lista de opciones descartadas y razones]

Expected validation evidence
[Cómo se validará que la solución funciona]

text

### FASE 2: PRE-IMPLEMENTATION BRIEF (Usando Template A del Playbook)

Pre-implementation brief
Suitability
Why this approach is suitable for this issue/context:

Constraints considered:

Blockers
Current blockers (technical/process/decision):

Required unblocks / owner:

Opportunities
Adjacent improvements identified (not mandatory for this scope):

Recommendation (now vs follow-up issue):

WHAT
Scope summary:

Expected files/paths:

FOR (goal)
Why this change is needed:

Expected outcome:

HOW
Planned implementation approach:

Sequence/strategy:

WHY
Selected approach:

Alternatives rejected:

Scope touched
Components/packages/workflows affected:

Explicit out-of-scope:

Risk
Classification: Low | Medium | High

Main risks / side effects:

Risks & Mitigation
Risk 1:

Mitigation:

Risk 2:

Mitigation:

Impact (affected areas)
What this affects (technical/functional/operational):

Compatibility impact (if any):

CI/runtime/observability impact (if any):

Validation plan
Targeted checks:

Broader checks (if shared/core touched):

Unknowns / maintainer decisions needed
text

### FASE 3: VALIDACIÓN DE BASE NORMATIVA (ADR-0000)

Antes de generar cualquier artefacto:

Identifica el/los ADRs aplicables

Extrae las decisiones arquitectónicas relevantes

Verifica que lo que vas a generar está cubierto por esas decisiones

Documenta en el issue los ADRs identificados

text

### FASE 4: GENERACIÓN CON TRAZABILIDAD (ADR-0000)

**A) En cabecera/comentarios del archivo:**

````typescript
/**
 * @file [nombre del archivo]
 * @baseline ADR-[NÚMERO]: [Título del ADR]
 * @decision [Texto específico de la decisión implementada]
 * @consequence [Consecuencia que este código implementa]
 * @version [versión del contrato]
 * @date [fecha]
 * @issue #[número del issue]
 */
B) En commits/mensajes:

text
feat([componente]): implementa [funcionalidad]

Baseline: ADR-[NÚMERO] - [Título]
Issue: #[número]
Decision: [decisión implementada]
Implements: [archivos]
C) En tests:

typescript
describe('Baseline: ADR-[NÚMERO] - [Título]', () => {
  test('debe validar [requisito] según decisión arquitectónica', () => {
    // Test que verifica cumplimiento del ADR
  });
});
FASE 5: ACTUALIZACIÓN DE BASE DE DATOS DE GRAFOS (OBLIGATORIO)
5.1 Verificar estado actual del grafo:

cypher
// Verificar si los nodos ya existen
MATCH (n)
WHERE n.numero IN ['ADR-0000', 'ADR-0004', 'ADR-0005']
   OR n.nombre CONTAINS 'RunEvents'
RETURN n
5.2 Crear/actualizar nodos de ADRs:

cypher
// ADR-0000 (este documento)
MERGE (adr0:Decision {numero: 'ADR-0000'})
SET adr0.titulo = 'Generación de código con trazabilidad normativa obligatoria',
    adr0.fecha = '2026-02-14',
    adr0.estado = 'ACCEPTED',
    adr0.decision = 'Todo artefacto debe tener trazabilidad explícita a ADRs',
    adr0.contexto = 'Necesidad de asegurar que todo código generado tenga base normativa'

// ADR-0004 (Event Sourcing)
MERGE (adr4:Decision {numero: 'ADR-0004'})
SET adr4.titulo = 'Event Sourcing Strategy',
    adr4.fecha = '2026-02-16',
    adr4.estado = 'ACCEPTED'

// ADR-0005 (Contract Formalization)
MERGE (adr5:Decision {numero: 'ADR-0005'})
SET adr5.titulo = 'Contract Formalization Tooling',
    adr5.fecha = '2026-02-16',
    adr5.estado = 'ACCEPTED'
5.3 Crear nodos de artefactos generados:

cypher
// Contracto RunEvents
MERGE (contract:Archivo {nombre: 'RunEvents.v1.1.1.md'})
SET contract.path = 'docs/contracts/RunEvents.v1.1.1.md',
    contract.tipo = 'markdown',
    contract.topic = 'contract',
    contract.version = '1.1.1'

// Schema JSON
MERGE (schema:Archivo {nombre: 'run-events.schema.json'})
SET schema.path = 'schemas/run-events.schema.json',
    schema.tipo = 'json',
    schema.topic = 'schema'

// Tipos TypeScript
MERGE (types:Archivo {nombre: 'run-events.types.ts'})
SET types.path = 'src/run-events.types.ts',
    types.tipo = 'typescript',
    types.topic = 'code'

// Tests de conformance
MERGE (tests:Archivo {nombre: 'run-events.conformance.test.ts'})
SET tests.path = 'test/run-events.conformance.test.ts',
    tests.tipo = 'typescript',
    tests.topic = 'test'
5.4 Crear relaciones de trazabilidad:

cypher
// Relaciones entre ADRs
MATCH (adr0:Decision {numero: 'ADR-0000'})
MATCH (adr4:Decision {numero: 'ADR-0004'})
MATCH (adr5:Decision {numero: 'ADR-0005'})
CREATE (adr0)-[:REFERENCIA]->(adr4)
CREATE (adr0)-[:REFERENCIA]->(adr5)
CREATE (adr4)-[:CONLLEVA]->(adr5)

// ADRs a artefactos
MATCH (adr5:Decision {numero: 'ADR-0005'})
MATCH (contract:Archivo {nombre: 'RunEvents.v1.1.1.md'})
CREATE (adr5)-[:RESULTA_EN]->(contract)

MATCH (contract:Archivo {nombre: 'RunEvents.v1.1.1.md'})
MATCH (schema:Archivo {nombre: 'run-events.schema.json'})
MATCH (types:Archivo {nombre: 'run-events.types.ts'})
MATCH (tests:Archivo {nombre: 'run-events.conformance.test.ts'})
CREATE (contract)-[:VALIDADO_POR]->(schema)
CREATE (contract)-[:IMPLEMENTADO_EN]->(types)
CREATE (contract)-[:VERIFICADO_POR]->(tests)
5.5 Relacionar con el Playbook:

cypher
// El Playbook como documento normativo de proceso
MERGE (playbook:Documento {nombre: 'AI Issue Resolution Playbook'})
SET playbook.version = 'v1.6.2',
    playbook.fecha = '2026-02-14',
    playbook.tipo = 'process',
    playbook.estado = 'active'

// Relacionar ADR-0000 con el Playbook
MATCH (adr0:Decision {numero: 'ADR-0000'})
MATCH (playbook:Documento {nombre: 'AI Issue Resolution Playbook'})
CREATE (adr0)-[:IMPLEMENTA_PROCESO_DE]->(playbook)
5.6 Verificar el grafo actualizado:

cypher
// Ver todas las relaciones de trazabilidad
MATCH path = (d:Decision)-[*1..3]-(a:Archivo)
WHERE d.numero IN ['ADR-0000', 'ADR-0004', 'ADR-0005']
RETURN path
FASE 6: ACTUALIZACIÓN DE DOCUMENTACIÓN
6.1 Actualizar README o índice de documentación:

markdown
## Trazabilidad Arquitectónica

Este repositorio mantiene trazabilidad completa entre decisiones arquitectónicas (ADRs) y artefactos de código:

| ADR | Título | Artefactos |
|-----|--------|------------|
| [ADR-0000](./adr/ADR-0000.md) | Generación de código con trazabilidad normativa obligatoria | [AI Issue Resolution Playbook](./playbook.md) |
| [ADR-0004](./adr/ADR-0004.md) | Event Sourcing Strategy | [RunEvents Contract](./contracts/RunEvents.v1.1.1.md) |
| [ADR-0005](./adr/ADR-0005.md) | Contract Formalization Tooling | [JSON Schema](./schemas/), [TypeScript types](./src/), [Conformance Tests](./test/) |

Ver el [grafo de trazabilidad](./graph.md) para visualizar todas las relaciones.
6.2 Actualizar documentación del contrato:

markdown
# RunEvents Contract v1.1.1

## Base Normativa
Este contrato implementa:
- **ADR-0004**: Event Sourcing Strategy
  - Append-only event log
  - IdempotencyKey basado en SHA256
  - CQRS separation
- **ADR-0005**: Contract Formalization Tooling
  - JSON Schema como forma normativa
  - Zod para validación runtime
  - Conformance Kit con golden vectors

## Trazabilidad
- Schema normativo: [run-events.schema.json](../schemas/run-events.schema.json)
- Implementación TypeScript: [run-events.types.ts](../src/run-events.types.ts)
- Tests de conformance: [run-events.conformance.test.ts](../test/run-events.conformance.test.ts)
6.3 Actualizar issue con evidencia de trazabilidad:

text
## Actualización de trazabilidad completada

### ADRs implementados
- [x] ADR-0004: Event Sourcing Strategy
- [x] ADR-0005: Contract Formalization Tooling

### Artefactos generados con trazabilidad
- [x] `schemas/run-events.schema.json` - Cabecera con @baseline ADR-0005
- [x] `src/run-events.types.ts` - Cabecera con @baseline ADR-0005
- [x] `test/run-events.conformance.test.ts` - Tests con referencia a ADR-0005

### Grafo actualizado
- [x] Nodos de ADRs creados/actualizados
- [x] Nodos de artefactos creados
- [x] Relaciones de trazabilidad establecidas

### Documentación actualizada
- [x] README actualizado con tabla de trazabilidad
- [x] Documentación del contrato con base normativa
- [x] Issue cerrado con evidencia completa

### Manifiesto de trazabilidad
```json
{
  "component": "RunEvents Contract",
  "version": "1.1.1",
  "baseline_adrs": ["ADR-0004", "ADR-0005"],
  "artifacts": [
    {"path": "schemas/run-events.schema.json", "type": "json-schema"},
    {"path": "src/run-events.types.ts", "type": "typescript"},
    {"path": "test/run-events.conformance.test.ts", "type": "test"}
  ]
}
text

### FASE 7: VALIDACIÓN Y CIERRE (Usando Template B del Playbook)
Final issue close summary
Suitability outcome
Was the selected approach suitable in practice? Why:

Blockers encountered
Blockers found during execution:

How they were resolved:

Opportunities identified
Follow-up opportunities discovered:

Proposed follow-up issue(s):

WHAT changed
[Lista de archivos modificados/creados]

WHY this approach
[Justificación basada en ADRs]

Acceptance criteria mapping
AC1 → change + evidence

AC2 → change + evidence

Validation evidence
Command:

Result:

Trazabilidad verificada
Todos los archivos tienen cabecera con @baseline

Manifiesto de trazabilidad generado

Grafo actualizado y verificado

Documentación actualizada

Rollback note
Residual scope (if any)
text

## REGLAS DE VALIDACIÓN CI/CD (MANDATORY)

El pipeline DEBE verificar:

1. ✅ Todo archivo tiene cabecera con @baseline ADR-[NÚMERO]
2. ✅ Los números ADR referenciados existen en el grafo y están ACCEPTED
3. ✅ Los schemas JSON tienen versión alineada con el contrato
4. ✅ Los tests incluyen validación contra golden vectors
5. ✅ El issue tiene Think-First Analysis antes de implementación
6. ✅ El issue tiene Pre-implementation brief antes de código
7. ✅ El PR incluye referencia al issue (`Closes #X` / `Refs #X`)
8. ❌ Rechazar PRs con código sin trazabilidad a ADR
9. ❌ Rechazar PRs sin actualización de grafo cuando corresponda
10. ❌ Rechazar PRs sin actualización de documentación

## FORMATO DE PETICIÓN

Cuando solicites generación de código, DEBES especificar:

- **ADR(s) de base**: [Números de ADR]
- **Issue #**: [número del issue]
- **Tipo de artefacto**: [schema/código/tests/documentación]
- **Versión del contrato**: [semver]
- **Requiere actualización de grafo**: [sí/no]
- **Requiere actualización de documentación**: [sí/no]
- **Restricciones específicas**: [opcional]

## EJEMPLO COMPLETO DE USO

**Usuario:**
"Genera el schema JSON y tipos TypeScript para eventos de workflow basado en ADR-0004 y ADR-0005. Issue #123. Requiere actualización de grafo y documentación."

**Respuesta de IA DEBE incluir:**

1. Think-First Analysis en el issue
2. Pre-implementation brief
3. Validación de ADRs
4. Código con cabeceras de trazabilidad
5. Actualización de grafo (comandos Cypher)
6. Actualización de documentación
7. Manifiesto de trazabilidad
8. Final close summary

**NO** se permite respuesta parcial o sin trazabilidad completa.
````

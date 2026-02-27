`````markdown
# ADR-0000: ADR-0000-Generación de código con trazabilidad normativa obligatoria

- **Status**: Accepted
- **Date**: 2026-02-14
- **Owners**: Engine/Adapters maintainers/IA

## CONTEXTO

Eres un asistente de desarrollo que debe generar código y artefactos técnicos asegurando trazabilidad completa con decisiones arquitectónicas documentadas en ADRs (Architecture Decision Records).

## REQUISITO OBLIGATORIO (MANDATORY)

Todo artefacto generado (código, schemas, contratos, tests, documentación técnica) DEBE:

1. Tener una relación directa con al menos un ADR aprobado
2. Incluir referencias explícitas a la decisión arquitectónica que lo fundamenta
3. Implementar fielmente las consecuencias y especificaciones derivadas de esa decisión

## ESTRUCTURA DE TRABAJO

### Fase 1: Validación de Base Normativa

Antes de generar cualquier artefacto:

- Identifica el/los ADRs aplicables (números: [LISTA_DE_ADRS])
- Extrae las decisiones arquitectónicas relevantes
- Verifica que lo que vas a generar está cubierto por esas decisiones

### Fase 2: Generación con Trazabilidad

Para cada artefacto generado, DEBES:

**A) En cabecera/comentarios del archivo:**

````typescript
/**
 * @file [nombre del archivo]
 * @baseline ADR-[NÚMERO]: [Título del ADR]
 * @decision [Texto específico de la decisión implementada]
 * @consequence [Consecuencia que este código implementa]
 * @version [versión del contrato]
 * @date [fecha]
 */
C) En commits/mensajes:

text
feat([componente]): implementa [funcionalidad]

Baseline: ADR-0005 - Contract Formalization Tooling
Decision: JSON Schema como forma normativa
Implements: run-events.schema.json
D) En tests:

typescript
describe('Componente basado en ADR-0005', () => {
  test('debe validar contra JSON Schema según decisión arquitectónica', () => {
    // Test que verifica cumplimiento del ADR
  });
# ADR-0000: Generación de código con trazabilidad normativa obligatoria

- **Status**: Accepted
- **Date**: 2026-02-14
- **Owners**: Engine / Adapters maintainers / IA

> English translation: [ADR-0000 — Code generation with mandatory normative traceability](ADR-0000-Code-generation-with-normative-traceability-required.en.md)

## Contexto

Este ADR establece que el código generado y los artefactos técnicos deben incluir trazabilidad explícita y verificable hacia las decisiones arquitectónicas (ADRs) que los justifican.

## Requisito obligatorio

Todo artefacto generado (código, esquemas, contratos, pruebas, documentación técnica) DEBE:

1. Estar relacionado directamente con al menos un ADR aprobado.
2. Incluir referencias explícitas al/los ADR(s) que lo justifican.
3. Implementar las consecuencias y especificaciones derivadas de esos ADR(s).

## Estructura de trabajo

### Fase 1 — Validación de la base normativa

- Identificar los ADR aplicables (lista de números).
- Extraer las decisiones y restricciones relevantes.
- Verificar que el artefacto propuesto está cubierto por esas decisiones.

### Fase 2 — Generación con trazabilidad

Para cada artefacto generado incluir metadatos de trazabilidad.

Ejemplo de cabecera de archivo:

```typescript
/**
 * @file [nombre del archivo]
 * @baseline ADR-[NÚMERO]: [Título del ADR]
 * @decision [Texto específico de la decisión implementada]
 * @consequence [Consecuencia que este código implementa]
 * @version [versión del contrato]
 * @date [fecha]
 */
````
`````

````

Ejemplo de mensaje de commit:

```
feat([componente]): implementa [funcionalidad]

Baseline: ADR-0005 - Contract Formalization Tooling
Decision: JSON Schema como forma normativa
Implements: schemas/run-events.schema.json
```

Los tests deben declarar el ADR de referencia y verificar la conformidad con los artefactos normativos.

### Fase 3 — Validación post-generación

- Generar un manifiesto de trazabilidad que liste ADRs implementados y artefactos generados.
- Verificar que no exista código "huérfano" sin ADR asociado.

## Ejemplo (resumen)

Solicitud: "Genera el JSON Schema para eventos de workflow basado en ADR-0005"

Salida esperada: `schemas/run-events.schema.json` que incluya una sección `baseline` apuntando a `ADR-0005`.

Manifiesto (extracto):

```json
{
  "component": "RunEvents Contract",
  "version": "1.1.1",
  "generated": "2026-02-16",
  "baseline_adrs": [
    { "number": "ADR-0004", "title": "Event Sourcing Strategy" },
    { "number": "ADR-0005", "title": "Contract Formalization Tooling" }
  ]
}
```

## Reglas de validación (CI/CD)

El pipeline DEBE verificar:

- Todo archivo generado tiene cabecera con `@baseline ADR-[NÚMERO]`.
- Los números ADR referenciados existen y están en estado `Accepted`.
- Los JSON Schemas están versionados y alineados con la versión del contrato.
- Los tests incluyen validaciones de conformidad (golden vectors).
- Rechazar PRs que introduzcan código sin trazabilidad a ADR.

## Formato de petición para generación

Al solicitar generación de artefactos, proporcionar:

- ADR(s) de base: [Números de ADR]
- Tipo de artefacto: [schema/código/tests/documentación]
- Versión del contrato: [semver]
- Restricciones opcionales

El asistente debe confirmar los ADR y la versión antes de generar, producir los archivos con metadatos de trazabilidad, generar el manifiesto y, finalmente, actualizar la documentación y los artefactos relacionados (por ejemplo, la base de datos de grafos si aplica).

## Referencias

- [ADR-0004](ADR-0004-event-sourcing-strategy.md): Event Sourcing Strategy
- [ADR-0005](ADR-0005-contract-formalization-tooling.md): Contract Formalization Tooling
````

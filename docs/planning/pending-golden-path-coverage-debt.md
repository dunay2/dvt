---
title: Pending Golden Path Coverage Debt
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: status
---

# Pending Golden Path Coverage Debt

# Deuda pendiente: cobertura de Golden Paths (Contracts & Determinism)

Fecha: 2026-03-04
Estado: Pendiente
Prioridad: Alta (calidad CI/CD)

## Resumen

La cobertura actual de golden paths es base mínima funcional, pero insuficiente para validar riesgos clave del engine/adapters en escenarios contractuales end-to-end.

## Estado actual

Golden paths implementados:

- `plan-minimal`
- `plan-parallel`
- `plan-cancel-and-resume`

Entradas no activas en baseline:

- `hello-world` (deprecated)
- `pause-resume` (deprecated)
- `retry` (not-implemented)

Cobertura efectiva actual:

- Determinismo de fixtures/hashes.
- Consistencia de baseline en `.golden/hashes.json`.

## Huecos detectados

- Retry real con inyección de fallo (`retry` pendiente).
- Escenarios de error complejos y rutas de fallo del workflow.
- Aislamiento multi-tenant en validación golden end-to-end.
- Dead-letter y replay como casos contractuales golden.
- Cobertura por adapter real más allá de `mock` en rutas críticas.

## Impacto

- Riesgo de regresiones no detectadas en cambios de ejecución.
- Señal de CI insuficiente para decisiones de merge en áreas sensibles.
- Menor confianza en invariantes contractuales de producción.

## Acciones propuestas

1. Implementar golden `retry` con failure injection controlada.
2. Añadir golden de error terminal (run failed determinista).
3. Añadir golden multi-tenant (aislamiento de lectura/escritura esperado).
4. Añadir golden de dead-letter + replay (flujo completo).

## Criterios de cierre

- `retry` pasa de `not-implemented` a `implemented` en `.golden/hashes.json`.
- Se añaden al menos 3 nuevos golden paths de riesgo alto.
- CI de `Contracts & Determinism` bloquea correctamente drift en esos escenarios.
- Documentación de contratos/golden actualizada y trazable.

nálisis crítico del documento "Deuda pendiente: cobertura de Golden Paths"

1. Falta de alineación con el sistema de trazabilidad (ADR-0000c y ADR-012)
   El documento no referencia ningún ADR, guía o criterio de calidad. Parece un informe aislado, sin vinculación con la política de trazabilidad.

Problema: No se puede verificar si esta deuda ya estaba identificada en el risk register, si hay un Evidence Doc asociado, o si debería tener un nivel ARC.

Solución: Debería incluir metadatos como related_adrs: [ADR-012, ADR-0000c], o ser parte de un issue con enlaces a los riesgos correspondientes.

1. Vocabulario impreciso y mezcla de conceptos
   Usa "golden paths" para referirse a pruebas de determinismo y contratos, pero en el ecosistema DVT+ los golden paths son un tipo específico de evidencia (ver GUIDE-determinism-replay.md). No queda claro si son pruebas unitarias, de integración o end-to-end.

Mezcla "contratos" con "ejecución" y "multi-tenant". Cada uno tiene sus propias guías (GUIDE-api-design.md, GUIDE-event-driven.md, GUIDE-security-advanced.md). Al agruparlos, se pierde especificidad.

1. Carencia de métricas y priorización real
   Se declara "Prioridad: Alta", pero no hay datos que respalden esa urgencia. ¿Cuántas regresiones ha causado esta falta de cobertura? ¿Qué incidentes recientes justifican mover esto al tope?

Las acciones propuestas son una lista de tareas sin orden ni criterio de éxito medible más allá de "implementar X". El "criterio de cierre" es débil: "Se añaden al menos 3 nuevos golden paths de riesgo alto" es arbitrario; ¿quién define "riesgo alto"?

1. Duplicidad con posibles riesgos ya existentes
   Si estos huecos ya estaban identificados en el risk register (ej. en engine/R-099.md), este documento sería redundante. Si no, debería haberse creado un riesgo primero, y luego un plan de acción. El formato actual parece un "todo en uno" que no encaja en el flujo definido (riesgo → ED → implementación).

2. Ausencia de enlaces a evidencia concreta
   No cita archivos de código, tests existentes, ni enlaces a PRs. Por ejemplo, "retry pendiente" podría tener un issue en GitHub o un ED borrador, pero no se menciona.

Tampoco se indica qué adaptadores están afectados (solo dice "más allá de mock"), lo que dificulta la acción.

1. Mezcla de deuda técnica con requisitos funcionales
   Algunos puntos (ej. "dead-letter y replay") parecen funcionalidades no implementadas, no necesariamente deuda. La deuda es cuando algo debería funcionar pero no está cubierto por pruebas. Si la funcionalidad no existe, es backlog, no deuda.

2. Falta de propietario y fecha límite
   Un documento de deuda sin responsable asignado ni fecha objetivo es papel mojado. El equipo necesita saber quién se encargará y cuándo se espera resolver.

3. No sigue la plantilla de Evidence Doc ni de Risk Register
   Si esto es un análisis de brecha, debería ser un ED (ARC-2 o ARC-3) o una entrada en el risk register. En su lugar, es un documento híbrido que no se ajusta a ninguna plantilla, lo que dificulta su trazabilidad y cierre.

Propuesta de mejora (aplicando nuestros estándares)
Para que este documento sea efectivo y se integre en el sistema, debería transformarse en:

Opción A: Como entrada en el risk register (varios riesgos)
Crear un archivo por cada hueco identificado, por ejemplo:

docs/risk-register/engine/R-043-missing-retry-golden.md

docs/risk-register/engine/R-044-missing-multitenant-golden.md

etc.

Cada uno con:

Severidad y probabilidad (basadas en datos).

Enlaces a los ADRs relevantes (012, 0000c).

Propietario y fecha de creación.

Posible mitigación (las acciones propuestas).

Opción B: Como un Evidence Doc (ARC-2) que documenta el análisis y plan
Si es un análisis único que requiere un cambio planificado, podría ser un ED con:

Front-matter con arc_level: ARC-2, owners, etc.

Sección "Qué cambia": describir el plan para implementar los nuevos golden paths.

Evidencia: análisis de impacto, enlaces a issues existentes.

Riesgos: los mismos que se pretenden mitigar, referenciados en el risk register.

Plan de acción detallado con tareas y responsables.

Opción C: Como una guía (si es un documento instructivo)
Si pretende ser una guía para futuros desarrolladores sobre cómo añadir golden paths, debería estar en docs/guides/ con un nombre como GUIDE-adding-golden-paths.md y explicar el proceso, no listar deuda.

Conclusión
El documento refleja una preocupación legítima, pero en su forma actual no es útil para el sistema de trazabilidad que hemos construido. Adolece de falta de estructura, métricas, responsabilidad y alineación con los ADRs y guías existentes. Para que pase de ser una "nota mental" a una acción concreta y rastreable, debe transformarse siguiendo los patrones establecidos.

Nota: 3/10 – Necesita reestructuración completa para integrarse en el flujo de trabajo definido.

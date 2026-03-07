---
title: Documentation Restructuring Diagnostic And Roadmap
status: Draft
owner: docs
last_reviewed: 2026-03-07
planning_type: proposal
---

# Reestructuracion De Documentacion: Diagnostico Y Hoja De Ruta

> Documento consolidado a partir de tus respuestas. La primera parte deja cerradas las decisiones. La segunda parte baja esas decisiones a un plan operativo.

## Preguntas Contestadas Y Respuestas Consolidadas

### 1. Objetivo final

Pregunta: Si este proyecto documental sale bien, que deberia ser cierto dentro de 30 dias?

Respuesta consolidada:

- La documentacion deja de generar deuda.
- La estructura es clara, navegable y sin duplicados.
- Existe trazabilidad en ambos sentidos entre codigo y documentacion.
- Hay mantenimiento continuo y control en PR para no volver al desorden.
- El equipo usa la documentacion como referencia principal y confia en ella.
- Existe un roadmap visible y un tablero para seguir el avance.

### 2. Fuente de verdad

Pregunta: Que carpetas y archivos consideras hoy fuente canonica de documentacion?

Respuesta consolidada:

- `docs/` es la fuente principal y canonica.
- Cada carpeta importante dentro de `docs/` debe tener `index.md`.
- Todo documento relevante debe vivir en `docs/` y estar trackeado en git.
- El resto de material relacionado puede vivir fuera de `docs/`, pero debe quedar enlazado desde la documentacion principal.

### 3. Carpeta generada

Pregunta: Cual es la regla exacta para `site/`?

Respuesta consolidada:

- `site/` es salida generada por MkDocs.
- No debe editarse manualmente.
- Debe regenerarse desde la fuente documental.
- La publicacion ideal sale desde CI, no desde trabajo manual sobre `site/`.

### 4. Material fuera de git

Pregunta: Que tipo de archivos no trackeados quieres incorporar?

Respuesta consolidada:

- Notas tecnicas.
- Borradores.
- Runbooks.
- Decisiones arquitecturales.
- Traducciones.
- Exportaciones de IA con valor real.
- Cualquier artefacto documental relevante para el equipo.

### 5. Politica de idioma

Pregunta: La documentacion objetivo debe quedar solo en ingles, bilingue, o con excepciones controladas?

Respuesta consolidada:

- El idioma objetivo debe ser ingles.
- Puede haber excepciones temporales o muy justificadas.
- Las excepciones deben estar claramente marcadas y enlazadas desde la documentacion principal.

### 6. Publico principal

Pregunta: Para quien estamos ordenando esta documentacion primero?

Respuesta consolidada:

- El publico principal son los desarrolladores.
- La estructura tambien debe servir a reviewers, operadores, arquitectura, IA y nuevos miembros.

### 7. Nivel de rigor

Pregunta: Que tipos de cambios de codigo deben obligar actualizacion documental?

Respuesta consolidada:

- Cambios de arquitectura.
- Cambios de contratos.
- Cambios de diseno.
- Cambios operativos.
- Cambios funcionales relevantes.
- Correcciones que alteren comportamiento o entendimiento del sistema.
- El trabajo ideal sigue un enfoque de diseno primero.

Nota adicional:

- Hay que localizar el modelo modular de IA ya existente y formalizarlo como ADR.

### 8. Tipos documentales

Pregunta: Que categorias quieres mantener explicitamente?

Respuesta consolidada:

- ADR.
- Guias.
- Runbooks.
- Planning.
- Evidencia.
- Risk register.
- Contratos.
- Arquitectura.

### 9. Archivo historico

Pregunta: Cuando pasa un documento a archivo?

Respuesta consolidada:

- Cuando ya no es relevante para el estado actual del proyecto.
- Cuando fue reemplazado por otro documento mejor o mas actual.
- Cuando es historico y se conserva solo como referencia.
- Cuando su mantenimiento activo ya no aporta valor.

### 10. Propiedad

Pregunta: Cada documento o seccion debe tener `owner` explicito?

Respuesta consolidada:

- Si.
- El owner actual es demasiado generico.
- Hay que decidir si el owner sera persona, equipo, modulo o una combinacion util de estos.

### 11. Caducidad

Pregunta: Quieres fecha de revision obligatoria para todos los docs o solo para planning, runbooks y normativa?

Respuesta consolidada:

- La revision deberia ser obligatoria para todos los docs.
- La cadencia puede variar por tipo documental.
- Planning, runbooks y normativa deberian tener una frecuencia mas alta.

### 12. Relacion codigo-documentacion

Pregunta: Como quieres representar la trazabilidad?

Respuesta consolidada:

- Enlaces a rutas de codigo.
- Frontmatter con `code_paths`.
- Tablas por modulo.
- Checklist en PR.
- Diagramas o mapas si ayudan a entender la relacion.

### 13. Umbral de calidad

Pregunta: Que cosas deben bloquear merge si fallan?

Respuesta consolidada:

- Links rotos.
- Documentos huerfanos.
- Frontmatter incompleto.
- Drift de docs generados.
- Falta de evidencia en cambios relevantes.
- Falta de trazabilidad minima entre codigo y docs.

### 14. Estado actual mas doloroso

Pregunta: Que te molesta mas hoy?

Respuesta consolidada:

- El desorden estructural es el problema principal.
- Le siguen los documentos obsoletos.
- Tambien pesa mucho la falta de trazabilidad con el codigo.
- El material sin clasificar agrava el problema.

### 15. Restricciones practicas

Pregunta: Hay algo que no podamos tocar por ahora?

Respuesta consolidada:

- No hay restricciones duras.
- Si se cambian nombres o rutas, hay que actualizar referencias y scripts con cuidado.

### 16. Prioridad de salida

Pregunta: Que prefieres obtener primero?

Respuesta consolidada:

- Primero orden estructural.
- Luego limpieza de contenido.
- Luego trazabilidad con el codigo.
- Por ultimo automatizacion en CI.

## Decisiones Operativas Cerradas

- La fuente canonica es `docs/`.
- `site/` debe tratarse como artefacto generado.
- Todo material documental relevante debe acabar dentro del sistema documental versionado.
- El idioma objetivo es ingles.
- El publico principal son los desarrolladores.
- Los cambios de arquitectura, contratos, diseno y operativa obligan actualizacion documental.
- Las categorias activas quedan limitadas a ADR, guias, runbooks, planning, evidencia, risk register, contratos y arquitectura.
- Todo documento activo debe tener metadata minima y fecha de revision.
- La trazabilidad codigo-documentacion no es opcional en cambios relevantes.
- Los checks documentales importantes deben bloquear merge.

## Tensiones Que El Plan Tiene Que Resolver

- El objetivo dice que `site/` no debe tratarse como fuente, pero el repo hoy contiene `site/` trackeado. Eso requiere una decision tecnica explicita.
- El idioma objetivo es ingles, pero hoy hay bastante planning en espanol. Hay que separar borrador temporal de documentacion estable.
- El `owner` existe, pero hoy es demasiado generico. Hay que hacerlo util sin volverlo burocratico.

## Diagnostico Inicial: Que Hay Que Auditar

### A. Alcance y estructura

- Que rutas son fuente.
- Que rutas son generadas.
- Que rutas son historicas.
- Que carpetas carecen de `index.md`.
- Que secciones se pisan entre si.

### B. Inventario y control de versiones

- Todos los `.md`, `.txt` y artefactos documentales relevantes.
- Material trackeado vs no trackeado.
- Documentos nuevos sin destino claro.
- Duplicados por nombre, titulo o contenido.

### C. Calidad estructural

- Archivos huerfanos.
- Links rotos.
- Referencias legacy.
- Frontmatter faltante.
- Titulos duplicados.
- Indices que no reflejan el contenido real.

### D. Calidad de contenido

- Obsolescencia.
- Ownership insuficiente.
- Status inexistente o ambiguo.
- Revision vencida.
- Mezcla de idiomas sin politica.
- Falta de ejemplos o comandos de validacion.
- Borradores confundidos con normativa.

### E. Trazabilidad con el codigo

- Paquetes sin docs asociadas.
- Docs normativos sin rutas de codigo, tests o comandos de verificacion.
- Docs generados sin comando declarado.
- Cambios de codigo que hoy no disparan trabajo documental.

### F. Flujo de mantenimiento

- Que valida cada script.
- Que se ejecuta en local.
- Que se ejecuta en pre-commit.
- Que se ejecuta en PR.
- Que se ejecuta en CI.
- Que condiciones bloquean merge.

## Hallazgos Iniciales Del Repo

- `docs:doctor` falla hoy por titulos duplicados y por `last_reviewed` ausente en varios docs de `planning`.
- `docs:quality:check` ya esta detectando mezcla de idioma en planning.
- Hay material no trackeado dentro de `docs/`.
- `site/` se mueve mucho, lo que confirma que es output y no la unidad correcta de trabajo.
- Ya existe una base util de scripts para sincronizacion, calidad, estado y capacidad.

## Orden Recomendado De Ejecucion

### Ola 1: Orden estructural

Objetivo: dejar claro que es fuente, que es generado, que tipos documentales existen y donde vive cada cosa.

- T01
- T02
- T03
- T04
- T05
- T06
- T09
- T10
- T11
- T18
- T29

### Ola 2: Limpieza y consolidacion

Objetivo: reducir ruido, cerrar duplicados y dejar una sola fuente de verdad por tema.

- T07
- T08
- T12
- T13
- T14
- T15
- T16
- T17
- T19
- T30
- T31

### Ola 3: Trazabilidad con el codigo

Objetivo: hacer visible y mantenible la relacion bidireccional entre codigo y documentacion.

- T20
- T21
- T22
- T23
- T24
- T33

### Ola 4: Automatizacion y mantenimiento continuo

Objetivo: impedir que vuelva a entrar deuda documental.

- T25
- T26
- T27
- T28
- T32

## Backlog Atomico De Trabajo

| ID | Tarea | Descripcion breve | Prioridad | Paralelizable | Estado |
| --- | --- | --- | --- | --- | --- |
| T01 | Declarar fuentes | Escribir la lista oficial de carpetas fuente, generadas e historicas. | Alta | No | Pendiente |
| T02 | Declarar regla de `site/` | Documentar la regla objetivo para `site/`: generado, no editable y publicado desde CI. | Alta | No | Pendiente |
| T03 | Listar docs trackeados | Generar inventario de todos los docs versionados. | Alta | Si | Pendiente |
| T04 | Listar docs no trackeados | Generar inventario de docs no versionados. | Alta | Si | Pendiente |
| T05 | Clasificar docs no trackeados | Marcar cada no trackeado como incorporar, mover, archivar o descartar. | Alta | Si | Pendiente |
| T06 | Confirmar categorias documentales | Cerrar la taxonomia oficial de tipos de documento. | Alta | No | Pendiente |
| T07 | Definir politica de idioma | Cerrar ingles como idioma objetivo y definir excepciones permitidas. | Alta | No | Pendiente |
| T08 | Definir metadata minima | Fijar campos obligatorios: `title`, `status`, `owner`, `last_reviewed` y trazabilidad cuando aplique. | Alta | No | Pendiente |
| T09 | Detectar huerfanos | Localizar docs que no aparecen en nav, indices o landings. | Alta | Si | Pendiente |
| T10 | Detectar enlaces rotos | Revisar links internos markdown y nav. | Alta | Si | Pendiente |
| T11 | Detectar duplicados | Revisar duplicados por titulo y por contenido. | Alta | Si | Pendiente |
| T12 | Detectar obsoletos | Marcar docs sin vigencia, reemplazados o sin revisar en plazo razonable. | Alta | Si | Pendiente |
| T13 | Completar frontmatter | Agregar metadata obligatoria donde falte. | Alta | Si | Pendiente |
| T14 | Corregir titulos duplicados | Resolver colisiones de titulos en una misma seccion. | Alta | Si | Pendiente |
| T15 | Unificar docs repetidos | Elegir una copia canonica y archivar o redirigir el resto. | Alta | Si | Pendiente |
| T16 | Normalizar nombres de archivo | Ajustar nombres inconsistentes o ambiguos. | Media | Si | Pendiente |
| T17 | Normalizar idioma de contenido | Traducir o mover docs que violen la politica acordada. | Media | Si | Pendiente |
| T18 | Revisar indices generados | Verificar que los `index.md` representen el contenido real. | Alta | Si | Pendiente |
| T19 | Definir doc canonico por tema | Dejar una sola fuente de verdad por tema grande. | Alta | No | Pendiente |
| T20 | Mapear paquetes a docs | Crear matriz paquete/app -> documentos relacionados. | Alta | Si | Pendiente |
| T21 | Mapear docs a codigo | Anadir referencia a rutas de codigo, tests y scripts relevantes. | Alta | Si | Pendiente |
| T22 | Definir trazabilidad minima | Fijar `code_paths`, `verification_cmd`, tablas por modulo y checklist de PR. | Alta | No | Pendiente |
| T23 | Identificar docs generados | Marcar explicitamente que docs se generan y con que comando. | Alta | Si | Pendiente |
| T24 | Revisar ADR de IA modular | Localizar el modelo modular de IA actual y convertirlo en ADR formal. | Alta | Si | Pendiente |
| T25 | Integrar `docs:sync` | Usar `docs:sync` como paso obligatorio de normalizacion. | Alta | No | Pendiente |
| T26 | Integrar `docs:doctor` | Usar `docs:doctor` para duplicados, metadata y envejecimiento. | Alta | No | Pendiente |
| T27 | Integrar checks de calidad | Usar `docs:quality:check`, `docs:canonical:check`, `docs:status:check` y `docs:capability:check` en el flujo normal. | Alta | No | Pendiente |
| T28 | Anadir checks faltantes | Crear checks para docs huerfanos, links rotos y docs no trackeados. | Media | Si | Pendiente |
| T29 | Resolver el caso `site/` | Cerrar si `site/` sale de git o si se mantiene como excepcion controlada. | Alta | No | Pendiente |
| T30 | Cerrar criterios de archivo | Definir exactamente cuando un doc pasa a `archive`. | Media | No | Pendiente |
| T31 | Mover historicos | Archivar documentos fuera de vigencia. | Media | Si | Pendiente |
| T32 | Definir chequeos bloqueantes | Formalizar que validaciones fallan el merge y cuales solo avisan. | Alta | No | Pendiente |
| T33 | Crear roadmap y tablero | Llevar el avance en una sola pagina con responsables, estado y fechas objetivo. | Alta | No | Pendiente |

## Tareas Que Se Pueden Hacer En Paralelo

### Bloque 1: Inventario rapido

Se pueden ejecutar a la vez:

- T03
- T04
- T09
- T10
- T11
- T12

### Bloque 2: Normalizacion basica

Se pueden ejecutar a la vez, una vez cerradas las reglas:

- T13
- T14
- T16
- T17
- T18
- T23

### Bloque 3: Trazabilidad

Se pueden ejecutar a la vez:

- T20
- T21
- T24

### Bloque 4: Nuevos validadores

Se pueden ejecutar a la vez:

- T25
- T26
- T27
- T28

## Integracion De Scripts Existentes En El Flujo

| Script o comando | Uso propuesto | Momento |
| --- | --- | --- |
| `pnpm docs:sync` | Regenerar indices, normalizar estructura y docs derivados. | Antes de commit y en CI |
| `pnpm docs:doctor` | Detectar duplicados, metadata faltante y docs envejecidos. | Local y CI |
| `pnpm docs:quality:check` | Detectar placeholders y avisar sobre idioma o calidad basica. | Local y CI |
| `pnpm docs:canonical:check` | Bloquear rutas o referencias legacy. | CI |
| `pnpm docs:status:check` | Asegurar que el estado generado desde codigo no quede desfasado. | CI |
| `pnpm docs:capability:check` | Asegurar que la cobertura generada desde codigo este actualizada. | CI |
| `tools/ci/arc-check.mjs` | Detectar si un cambio exige evidencia, riesgo o controles extra. | PR y CI |
| `tools/ci/doc-check.mjs` | Validar evidencia y riesgo cuando la politica ARC lo exige. | PR y CI |

## Flujo Recomendado

1. Editar solo fuentes documentales.
2. Ejecutar `pnpm docs:sync`.
3. Ejecutar `pnpm docs:doctor`.
4. Ejecutar `pnpm docs:quality:check`.
5. Ejecutar `pnpm docs:canonical:check`.
6. Si el cambio toca arquitectura, contratos o riesgos, ejecutar `arc-check` y `doc-check`.
7. Si el cambio toca codigo estructural, ejecutar `pnpm docs:status:check` y `pnpm docs:capability:check`.

## Criterios De Hecho

La reestructuracion se considera cerrada cuando se cumpla todo esto:

- Toda la documentacion fuente esta clasificada.
- No quedan docs relevantes fuera de git.
- No quedan docs huerfanos.
- No quedan duplicados sin resolver.
- Cada doc activo tiene metadata minima.
- La politica de idioma esta cerrada y aplicada.
- Existe trazabilidad minima entre codigo y documentacion.
- Los checks documentales corren en local y en CI.
- `site/` se trata como salida generada y no como fuente.
- Existe un roadmap visible y un tablero de seguimiento con responsables y estado.
- El material del modelo modular de IA ya no esta disperso y ha quedado formalizado como ADR.

## Siguiente Iteracion Recomendada

La siguiente iteracion de este documento deberia hacer estas tres cosas:

1. Convertir la Ola 1 en issues o checklist de ejecucion inmediata.
2. Crear el tablero de seguimiento con responsables y fechas objetivo.
3. Bajar la trazabilidad a un formato tecnico concreto para empezar a aplicarla.

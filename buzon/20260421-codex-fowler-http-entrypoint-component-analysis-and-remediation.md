---
review_by: Codex
review_date: 2026-04-21
branch: main
scope: apps/api HTTP entrypoint error and plan-route response seams
method: Fowler-style architecture analysis with remediation brief
---

# Analisis Fowler del stack HTTP de `apps/api`

## Contexto

El trabajo reciente habia endurecido bien el componente local de traduccion de
errores runtime HTTP:

- habia una fachada publica explicita (`httpErrorTranslation.ts`)
- el clasificador runtime tipado estaba separado del mapper de parse/auth/facade
- existia documentacion local del componente
- existia una prueba de arquitectura con semantica AST

Eso mejoraba claramente el punto de partida, pero el sistema mostraba una
asimetria: los flujos `preview/compile/import` seguian resolviendo envelopes
HTTP mediante mappers sueltos sobre `httpErrorContract.ts` sin una fachada
local de componente equivalente.

## Comparacion con sistemas maduros

Comparado con sistemas maduros, el estado original estaba a medio camino entre
un `utility cluster` y un componente semantico bien cerrado:

- en ASP.NET Core maduro suele existir un seam unico para `ProblemDetails` o
  `IResult` por familia de errores y no una mezcla de helpers publicos e
  internos consumidos arbitrariamente
- en Spring MVC maduro el equivalente suele vivir detras de un
  `@ControllerAdvice` o un traductor de excepciones por bounded context, no
  repartido en varios mappers sin API publica comun
- en sistemas con fuerte disciplina de entrypoints, como gateways internos o
  plataformas tipo Stripe, la capa HTTP suele exponer una API de traduccion por
  dominio de transporte, mientras que las primitivas de envelope quedan
  internas

La mejora reciente acercaba `runtime protected routes` a ese modelo maduro,
pero los `plan routes` todavia no lo hacian.

## Patrones mejorados

- **Facade**:
  `httpErrorTranslation.ts` ya actuaba como seam publico real y no como barrel
  cosmetico.
- **Separated translator roles**:
  el mapper y el classifier ya tenian responsabilidades distintas y
  defendibles.
- **Local component guide**:
  la documentacion ya describia API, invariantes, transiciones y consumidores.
- **Semantic architecture testing**:
  la prueba AST validaba semantica de imports y llamadas, no solo delgadez del
  barrel.

## Antipatrones detectados antes de la remediacion

- **Utility cluster residual**:
  `compile/import/preview` usaban primitivas HTTP directamente sin una fachada
  de componente hermana.
- **Semantic encapsulation drift**:
  no todos los modulos relacionados con el seam HTTP declaraban su
  `Owned concern` en cabecera.
- **Documentation asymmetry**:
  el componente runtime estaba explicado, pero el seam de respuesta de
  `plan routes` no estaba nombrado como componente local.
- **Test support duplication pressure**:
  la prueba AST concentraba helpers reutilizables que debian vivir en soporte
  compartido.

## Componentes que convenia agrupar

### 1. HTTP runtime error translation

Ya existia y debia mantenerse como componente local separado para:

- parse/auth/facade/engine/runtime protegido
- envelopes de admin y workspace graph draft
- escritura del `HttpResponseModel` mediante la fachada publica

### 2. Plan route response translation

Convenia formalizar como componente local separado para:

- `compilePlanRouteResponseMapper.ts`
- `importPlanRouteResponseMapper.ts`
- `previewPlanRouteResponseMapper.ts`
- `planPreviewContractErrorMapper.ts`

Razon:
pertenece al bounded context de plan routes y al flujo de preview / compile /
import, no al runtime protegido. Agruparlo evita dos errores comunes:

- inflar el componente runtime con otro contexto
- dejar otra familia de envelopes HTTP como helpers dispersos sin semantica de
  componente

## Repeticiones detectadas

- repeticion de errores internos `internal_error` en mappers de plan route
- repeticion de uso directo de `createHttpErrorResponse(...)` en el bounded
  context de plan routes
- repeticion de utilidades AST en una sola prueba de arquitectura

## Oportunidades detectadas

- crear una fachada publica `planRouteResponseTranslation.ts`
- mover helpers AST a soporte compartido de pruebas
- reforzar la documentacion canonica para nombrar ambos seams como componentes
  hermanos
- convertir las cabeceras `Owned concern` en parte explicita del contrato local
  de arquitectura

## Drift identificado antes de la remediacion

### Drift en codigo

- `executePlanRouteFacade.ts` participaba del seam pero no declaraba todavia su
  concern propio
- `preview/compile/import` dependian de primitivas de envelope sin una API
  publica local equivalente

### Drift documental

- `apps/api/docs/http-runtime-error-translation-component.md` describia bien el
  componente runtime, pero no situaba el seam de plan routes como componente
  hermano
- `docs/architecture/components/api/index.md` y
  `api-current-to-target-architecture.md` todavia no reflejaban esa particion
  semantica completa

## Ensenanzas para futuro

- cuando aparezca un segundo grupo coherente de consumidores HTTP con reglas de
  traduccion propias, no reutilizar primitivas directamente: crear una fachada
  local de componente desde el principio
- las primitivas (`createHttpErrorResponse`, `sendHttpResponse`) son kernel
  interno del transporte, no API publica por defecto
- las pruebas de arquitectura deben validar semantica de ownership, imports y
  llamadas, no solo estructura superficial
- la documentacion local del componente debe nacer junto con la fachada, no
  despues

## Opcion seleccionada

Aplicar una remediacion pequena pero estructural:

1. formalizar `planRouteResponseTranslation.ts` como componente local hermano
2. migrar consumidores de plan route a esa fachada
3. anadir docblocks `Owned concern` a los modulos del seam
4. extraer soporte AST compartido
5. anadir una prueba de arquitectura semantica para el nuevo componente
6. actualizar la documentacion local y canonica con diagramas y limites de
   ownership

## Opcion descartada

- meter `preview/compile/import` dentro de `httpErrorTranslation.ts`

Motivo:
mezcla bounded contexts y reintroduce el `large facade` que sistemas maduros
evitan separando traductores por familia de entrada.

## Estado despues de la remediacion

La remediacion ya esta aplicada en el arbol local:

- existe `planRouteResponseTranslation.ts` como API publica del componente de
  `plan-route response translation`
- `compilePlanRoute.ts`, `importPlanRoute.ts`, `previewPlanRoute.ts` y
  `previewPlanRouteRequestResolver.ts` consumen esa fachada
- los modulos tocados del seam ya declaran `Owned concern`
- existe soporte AST compartido en
  `apps/api/test/entrypoints/http/httpArchitectureAst.support.ts`
- existe una nueva prueba semantica de arquitectura para el componente
  `planRouteResponseTranslation`
- existe guia local de componente para el seam nuevo y actualizacion de los
  docs canonicos

## Patrones realmente mejorados tras la remediacion

- **Sibling components**:
  ahora el runtime protected-route seam y el plan-route seam quedan explicitos
  como componentes hermanos, no como utilidades mezcladas.
- **Facade with internal kernel**:
  las primitivas de envelope siguen internas y las familias de consumidores
  entran por una API publica local.
- **Semantic ownership**:
  los docblocks `Owned concern` ya no son una excepcion puntual, sino una
  pista de ownership consistente en los modulos tocados.
- **Shared semantic test support**:
  el soporte AST se reutiliza y reduce repeticion accidental en los tests.

## Residuales abiertos

- el seam generico de `executePlanRouteFacade.ts` y `planRouteRequestResolver.ts`
  todavia podria formalizarse como componente local propio si el sistema sigue
  creciendo en routes de plan
- la validacion vertical de `pnpm --filter dvt-api build` ya vuelve a ser
  util como baseline del slice despues de corregir el `tsconfig` de
  `@dvt/adapter-postgres` para resolver `@dvt/delivery` y
  `@dvt/traceability-service`
- la revision posterior senala un posible shim de compatibilidad en
  `httpErrorMapper.ts`; verificacion local: no hay una ruta legacy viva ni un
  re-export de compatibilidad en el codigo actual. El residual real es de
  narrativa y trazabilidad: mantener docs y closeouts alineados con ese hard
  cut para no describir compatibilidad inexistente
- la cobertura del happy path del facade `planRouteResponseTranslation` sigue
  siendo parcial: `compile/import` se prueban en verde a traves de los route
  consumers, pero faltan tests directos de
  `planRouteResponseTranslation.compile.result(...)` y
  `planRouteResponseTranslation.import.result(...)` como contrato focalizado de
  facade

## Pre-implementation brief usado para el slice

- Mode: Slim
- Scope:
  componente local nuevo para `plan route response translation`, soporte AST
  compartido, docblocks, docs y pruebas semanticas
- Riesgos:
  - crear un barrel tonto en lugar de una fachada con ownership
  - duplicar documentacion
- Mitigaciones:
  - test AST semantico
  - una sola guia local por componente y actualizacion de los docs canonicos
- Validacion prevista:
  - `vitest` enfocado en pruebas de arquitectura y plan routes
  - `eslint` sobre fuentes y tests tocados
  - `markdownlint` sobre docs tocados
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`

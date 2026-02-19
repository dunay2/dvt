# DVT+ Frontend — Plan de interfaz limpia y enfocada a backend

## 1. Objetivo

Definir un plan práctico para evolucionar la UI de `apps/web` desde un prototipo amplio hacia una interfaz:

- más limpia (menos ruido visual),
- más ordenada (jerarquía clara de trabajo),
- más enfocada (flujo principal Plan → Run → Monitor),
- y alineada con la evolución real del backend actual.

## 2. Diagnóstico actual

### 2.1 Frontend hoy

El frontend actual es un prototipo de alta fidelidad con cobertura amplia de vistas y componentes:

- Rutas múltiples (`/canvas`, `/runs`, `/artifacts`, `/diff`, `/lineage`, `/cost`, `/plugins`, `/admin`).
- Estado local unificado con Zustand.
- Simulación basada en datos mock (`mockDbtData.ts`) y acciones locales de plan/run.
- Shell complejo con barra superior, barra lateral de iconos, panel explorador, panel inspector y consola.

Conclusión: visualmente potente, pero todavía “producto demo-first” (centrado en mock UI) más que “workflow-first” (centrado en integración backend).

### 2.2 Backend hoy (evolución disponible)

El backend en `apps/api` es una base operativa sólida pero mínima, con foco en infraestructura y salud de servicio:

- `GET /healthz` y `GET /readyz`.
- `GET /version`.
- `GET /db/ready` con chequeo real de PostgreSQL si existe `DATABASE_URL`.
- CORS configurable, validación de entorno con Zod y arranque Fastify estricto.

Conclusión: aún no hay endpoints de dominio para `plan`, `run`, `lineage`, `artifacts`, `cost` o `plugins`; por tanto el frontend debe priorizar integración gradual y evitar sobre-prometer UX sobre datos mock.

## 3. Principio rector de producto (nuevo foco)

Pasar de **“UI con muchas vistas”** a **“UI operacional para ejecutar con backend real”**.

Regla:

1. Primero confiabilidad de shell + conectividad + estados de red.
2. Después flujo core (Plan / Run / Monitor) con datos reales.
3. Luego vistas secundarias (diff, lineage, cost, plugins, admin).

## 4. Plan de limpieza y orden visual

## 4.1 Simplificación de navegación (Fase UI-1)

### Cambios

- Mantener barra lateral izquierda solo con iconos + tooltip (sin textos permanentes).
- Eliminar encabezados redundantes en barras laterales (`Projects`, `dbt explorer`) para ganar foco vertical.
- Mantener ancho fijo tipo IDE (sin doble sistema de colapso ambiguo).
- Reducir densidad de la barra superior: mover controles secundarios de “View” a menú contextual único.

### Resultado UX esperado

- Menos ruido visual.
- Más área útil de canvas.
- Menos decisiones por pantalla.

## 4.2 Jerarquía de vistas por prioridad (Fase UI-2)

Definir vistas por niveles:

- **Nivel A (Core):** Canvas, Runs.
- **Nivel B (Operación):** Artifacts, Diff.
- **Nivel C (Avanzado/Admin):** Lineage, Cost, Plugins, Admin.

Aplicar “progresive disclosure”:

- Nivel C oculto por defecto en modo básico.
- Activable por feature flags o rol.

### Resultado UX esperado

- Interfaz más enfocada al trabajo diario.
- Menor carga cognitiva en usuarios nuevos.

## 4.3 Layout orientado a tarea (Fase UI-3)

Estandarizar layout por contexto:

- **Modo Build (default):** Explorer + Canvas + Inspector.
- **Modo Run:** Runs + Console prioritaria.
- **Modo Focus:** Canvas casi completo.

Evitar que el usuario gestione demasiados paneles manualmente; el layout debe responder al contexto de ruta.

## 5. Plan de alineación con backend

## 5.1 Contrato mínimo de conectividad (inmediato)

Crear cliente API tipado para endpoints ya existentes:

- `GET /healthz`
- `GET /readyz`
- `GET /version`
- `GET /db/ready`

Uso en frontend:

- Indicador global de estado de plataforma en top bar.
- Banner degradado/offline real (no mock).
- “Service diagnostics” en panel de estado.

## 5.2 Estrategia anti-mock (corto plazo)

Separar explícitamente fuentes de datos:

- `mock` (desarrollo/demo)
- `api` (real)

Conmutación por variable de entorno (`VITE_DATA_SOURCE=mock|api`).

Objetivo: mantener demo útil sin bloquear integración real.

## 5.3 Contratos backend que el frontend necesita (siguiente evolución)

Propuesta priorizada para backend:

1. `POST /plans/preview` (subgrafo/selección → plan inmutable).
2. `POST /runs` (start run desde plan).
3. `GET /runs/:id` + `GET /runs` (estado y listado).
4. `GET /runs/:id/events` (SSE o polling equivalente).
5. `GET /artifacts/:runId/*` (manifest/run_results/catalog mínimos).

El frontend debe prepararse con interfaces TypeScript para estos contratos desde ya, aunque el backend los entregue de forma incremental.

## 6. Arquitectura frontend recomendada

## 6.1 Stores por responsabilidad

Refactor progresivo del store global actual hacia:

- `shellStore`: layout, paneles, foco, navegación.
- `sessionStore`: tenant/proyecto/env/git/ref.
- `graphStore`: nodos/edges/selección.
- `runStore`: plan actual, run actual, timeline.
- `statusStore`: salud de backend y conectividad.

## 6.2 Capa de datos

Estandarizar con TanStack Query:

- queries de estado (`health`, `version`, `dbReady`),
- mutations de acciones (`plan`, `run`),
- invalidación predecible por dominio.

## 6.3 Principio UI

Componentes de vista no consumen mock directamente; usan servicios (`app/services/*`) y view-models tipados.

## 7. Roadmap propuesto (4 sprints)

## Sprint 1 — “Base limpia y conectada”

- Limpieza visual shell (navegación y cabeceras redundantes).
- Cliente API mínimo (`health`, `ready`, `version`, `db/ready`).
- Estado de red real en top bar + banner global.
- Documentar modo `mock` vs `api`.

## Sprint 2 — “Flujo core real (v1)”

- Integrar plan preview real (si backend disponible; si no, adapter temporal).
- Integrar inicio de run.
- Reforzar vista Runs como foco operativo.

## Sprint 3 — “Monitor y trazabilidad”

- Timeline de run con eventos reales/polling.
- Consola unificada de eventos y logs.
- Estados vacíos, errores, retry y degradación.

## Sprint 4 — “Expansión controlada”

- Artifacts y Diff sobre datos reales.
- Activación gradual de Lineage/Cost/Plugins/Admin por feature flag.
- Hardening UX (accesibilidad + performance).

## 8. Criterios de éxito

1. Un usuario puede completar el flujo principal sin depender de datos mock.
2. La UI muestra estado real del backend en todo momento.
3. La navegación prioriza tareas core y reduce ruido.
4. La base técnica permite escalar a contratos futuros sin rehacer shell.

## 9. Entregables de documentación frontend

Este documento se complementa con:

- Actualización de `apps/web/README.md` para reflejar estado real.
- Roadmap de integración por fases para equipo frontend/backend.

Estado: Propuesta operativa inicial.
Fecha: 2026-02-19.

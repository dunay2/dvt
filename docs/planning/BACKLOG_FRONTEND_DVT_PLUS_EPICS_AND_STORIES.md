# Backlog Frontend DVT+ — Épicas + Historias de Usuario

> Objetivo: convertir la especificación técnica frontend DVT+ en un backlog ejecutable con el mismo sistema de `EPICA-*` + `US-*` usado en el proyecto.

## Estado de ejecución (GitHub)

- Milestones creados: `EPICA-F1` a `EPICA-F9`.
- Issues de épica creadas: `#160` a `#168`.
- Issues de historias creadas: `#169` a `#188`.
- Evidencia y registro detallado: `BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md`.

## Convención para GitHub

- 1 milestone por épica (`EPICA-F1 ...`, `EPICA-F2 ...`).
- 1 issue por historia (`US-F1.1 ...`, `US-F1.2 ...`).
- Labels recomendados: `epic`, `story`, `frontend`, `ui`, `ux`, `security`, `observability`, `testing`.

## ÉPICA F1 — UI Shell & Navigation Foundation

### US-F1.1 — Definir shell principal y navegación lateral

Como usuario técnico, quiero una shell consistente para navegar Graph, Plan, Run, Diff y Admin sin perder contexto.

**Entregables**

- Layout base con áreas fijas (sidebar, topbar, workspace, panel contextual).
- Enrutado de vistas principales.
- Estado de navegación persistente por sesión.

### US-F1.2 — Sistema de paneles y modales global

Como usuario, quiero overlays predecibles para inspección, confirmaciones y configuración.

**Entregables**

- Manager de overlays/modales.
- Reglas de foco y cierre (keyboard-first).
- Estados `loading/success/error` homogéneos.

## ÉPICA F2 — Graph Workspace (React Flow + Layout)

### US-F2.1 — Render DAG con interacción base

Como analista, quiero visualizar el DAG y navegarlo fluidamente.

**Entregables**

- Render de nodos/edges en React Flow.
- Zoom, pan, fitView, minimap.
- Selección simple/múltiple y resaltado de contexto.

### US-F2.2 — Auto-layout con ELK/dagre y nodos fijados

Como usuario, quiero ordenar grafos grandes sin perder posiciones críticas.

**Entregables**

- Auto-layout por tipo de grafo.
- Soporte pinned nodes.
- Re-layout incremental (sin reset total de viewport).

### US-F2.3 — Búsqueda y filtrado en grafo

Como usuario, quiero ubicar nodos por nombre, tipo o estado rápidamente.

**Entregables**

- Search index frontend.
- Filtros por dominio/estado/impacto.
- Navegación de resultados (next/prev match).

## ÉPICA F3 — Execution Plan UX (Read-only explicable)

### US-F3.1 — Plan Preview con acciones RUN/SKIP/PARTIAL

Como usuario, quiero ver el plan resultante antes de ejecutar.

**Entregables**

- Tabla/vista de acciones por nodo.
- Badges de estado y agrupación por tipo de acción.
- Export/compartir snapshot de plan.

### US-F3.2 — Explainability por decisión de plan

Como usuario, quiero comprender por qué un nodo cae en RUN/SKIP/PARTIAL.

**Entregables**

- Panel de “why” por nodo.
- Trazas de regla/política aplicada.
- Mensajería legible para troubleshooting.

## ÉPICA F4 — Run Monitoring & Live Status

### US-F4.1 — Timeline de ejecución con estados de step

Como operador, quiero seguimiento en tiempo real del run.

**Entregables**

- Timeline cronológico.
- Estado run-level y step-level.
- Sincronización con contrato de eventos del engine.

### US-F4.2 — Logs, progreso y reconexión resiliente

Como operador, quiero continuidad de monitor incluso con red inestable.

**Entregables**

- Polling/streaming con fallback.
- Banner `reconnecting/degraded/offline`.
- Retry con backoff y circuit-break visual.

## ÉPICA F5 — Diff, Lineage & Impact Analysis UX

### US-F5.1 — Diff view de cambios relevantes

Como usuario, quiero comparar estados para decidir ejecución.

**Entregables**

- Vista diff anterior vs actual.
- Realce de cambios semánticos.
- Filtros por severidad/tipo.

### US-F5.2 — Lineage upstream/downstream

Como usuario, quiero entender dependencias e impacto.

**Entregables**

- Navegación de lineage en ambos sentidos.
- Modo impacto con profundidad configurable.
- Acciones de foco contextual.

## ÉPICA F6 — Cost, Guardrails & FinOps UX

### US-F6.1 — Cost snapshot en frontend

Como owner, quiero ver coste estimado/observado por plan/run.

**Entregables**

- Panel de coste por unidad relevante.
- Indicadores por nodo/etapa.
- Historial mínimo de snapshots.

### US-F6.2 — Señales de guardrails y recomendaciones

Como operador, quiero alertas accionables cuando un plan exceda políticas.

**Entregables**

- Alertas por umbral.
- Mensajes de mitigación/recomendación.
- Estados de “bloqueado por política” visibles.

## ÉPICA F7 — Plugins & Extensibilidad UI

### US-F7.1 — Catálogo de plugins con estado/compatibilidad

Como administrador, quiero gestionar plugins desde UI con visibilidad clara.

**Entregables**

- Lista de plugins instalados/disponibles.
- Estado (active, incompatible, error).
- Compatibilidad por `apiVersion`.

### US-F7.2 — Manejo seguro de fallos de plugin en UI

Como usuario, quiero que un fallo de plugin no degrade toda la app.

**Entregables**

- Error boundaries por superficie plugin.
- Fallback UI aislado.
- Eventos auditables de fallo/recuperación.

## ÉPICA F8 — Seguridad, RBAC y Admin UX

### US-F8.1 — Reglas RBAC visuales (hide/disable/read-only)

Como organización, quiero que la UI respete permisos de backend de forma explícita.

**Entregables**

- Motor de render condicional por permiso.
- Matriz de comportamiento por vista/acción.
- Mensajería de acceso denegado coherente.

### US-F8.2 — Superficie admin restringida y auditada

Como admin, quiero operar configuraciones críticas con trazabilidad.

**Entregables**

- Vistas admin protegidas.
- Registro de acciones privilegiadas.
- Confirmaciones reforzadas en acciones sensibles.

## ÉPICA F9 — Frontend Observability, A11y & Performance

### US-F9.1 — Telemetría frontend con eventos clave

Como equipo de plataforma, quiero métricas de salud UX y errores por vista.

**Entregables**

- Instrumentación OTel de interacciones críticas.
- Métricas: TTFMP, error-rate, latencia plan preview.
- Correlación de sesión/trace con backend.

### US-F9.2 — Accesibilidad operativa de vistas críticas

Como usuario, quiero operar por teclado y lector de pantalla en flujos principales.

**Entregables**

- Navegación keyboard-first en shell/canvas/modales.
- ARIA en componentes críticos.
- Validación en golden paths de accesibilidad.

### US-F9.3 — Performance budget para grafos grandes

Como usuario, quiero experiencia fluida con grafos de alta cardinalidad.

**Entregables**

- Definición y enforcement de budget UI.
- Estrategias de virtualización/lazy rendering.
- Benchmarks y alertas de regresión.

## Orden recomendado de implementación

1. ÉPICA F1
2. ÉPICA F2
3. ÉPICAS F3 y F4 en paralelo controlado
4. ÉPICAS F5 y F6
5. ÉPICAS F7 y F8
6. ÉPICA F9 como quality gate transversal

## DoR por historia

- Contrato/view-model de referencia identificado.
- Criterios de aceptación verificables.
- Riesgos de seguridad/RBAC declarados.
- Métricas mínimas de UX/observabilidad definidas.

## DoD por historia

- Documentación actualizada y enlazada en índice.
- Pruebas asociadas (unit/integration/e2e o contrato UI).
- Evidencia en issue + milestone correspondiente.
- Estado de trazabilidad spec ↔ historia actualizado.

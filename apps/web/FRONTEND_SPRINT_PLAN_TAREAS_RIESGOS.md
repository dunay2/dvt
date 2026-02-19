# DVT+ Frontend — Plan de ejecución por tareas, sprints y fases

## 1) Objetivo

Entregar una interfaz de DVT+ más limpia, ordenada y enfocada en operación real con backend, manteniendo arquitectura actual (Planner/Engine/State/UI) y enfoque state-driven.

## 2) Enfoque de ejecución

- Horizonte: 4 sprints.
- Duración sugerida: 2 semanas por sprint.
- Estrategia: primero base visual y conectividad, después flujo core, luego observabilidad y escalado.

## 3) Fases claras

## Fase A — Fundación UX + Integración mínima

Sprints: 1

Meta: limpiar shell y conectar estados reales de plataforma.

## Fase B — Flujo core operativo

Sprints: 2

Meta: consolidar Canvas → Plan → Run con contratos reales o adaptador transitorio.

## Fase C — Monitoreo y robustez

Sprints: 3

Meta: timeline, consola útil, resiliencia de red y errores.

## Fase D — Escalabilidad y expansión controlada

Sprints: 4

Meta: experiencia estable en grafos grandes y activación gradual de vistas avanzadas.

---

## 4) Plan detallado por sprint (tareas concretas)

## Sprint 1 — Base limpia y conectada

### Objetivo del sprint

Reducir ruido visual y sustituir estado de conectividad mock por estado real de backend.

### Tareas

1. **Consolidar navegación y jerarquía visual del shell**
   - Eliminar cabeceras redundantes en barras laterales.
   - Mantener navegación izquierda icon-only + tooltip.
   - Unificar controles secundarios en menú contextual.

2. **Implementar cliente de plataforma (health/version/db)**
   - Endpoints: `/healthz`, `/readyz`, `/version`, `/db/ready`.
   - Tipado de respuestas y manejo de errores.

3. **Estado global de red/plataforma real**
   - Top bar con estado real (ok/degraded/offline).
   - Banner persistente en degradado/offline.
   - Política de retry y backoff simple.

4. **Separación de fuentes de datos `mock|api`**
   - Feature flag `VITE_DATA_SOURCE`.
   - Documentar modo de operación.

5. **Definir baseline de UX del canvas (Design Mode limpio)**
   - Sin métricas persistentes en modo diseño.
   - Detalle solo en hover/inspector.

### Riesgos

- Acoplar UI al formato actual de endpoints de salud y tener retrabajo después.
- Estados intermedios confusos si no se define matriz de estados (offline/degraded/reconnecting).

### Oportunidades

- Ganancia inmediata en percepción de producto “real”.
- Base reusable para toda vista que dependa de disponibilidad de backend.

---

## Sprint 2 — Flujo core: Plan + Run

### Objetivo del sprint

Llevar el flujo principal desde interacción visual a operación backend (o contrato transitorio estable).

### Tareas

1. **Definir contratos frontend para Plan Preview y Run Start**
   - Interfaces TS para request/response.
   - Adaptadores de datos a view-models.

2. **Integrar acción Plan desde selección de canvas**
   - Mutation de plan con estados: idle/loading/success/error.
   - Modal Plan Preview sobre datos reales/adaptados.

3. **Integrar acción Run desde plan confirmado**
   - Mutation start run.
   - Navegación contextual a Runs.

4. **Estados UX de error y permisos**
   - Manejo de 401/403/409/5xx en flujo plan/run.
   - Mensajes accionables y reintento.

5. **Registrar telemetría mínima de flujo core**
   - Eventos: plan_opened, plan_confirmed, run_started, run_failed_ui.

### Riesgos

- Contratos backend aún no estables para plan/run.
- Dependencia de decisiones de API puede bloquear cierre del sprint.

### Oportunidades

- Primer valor de negocio directo: ejecución desde UI.
- Reducción del gap entre demo visual y operación real.

---

## Sprint 3 — Monitor, consola y resiliencia

### Objetivo del sprint

Hacer operable el seguimiento de ejecución con degradación controlada.

### Tareas

1. **Implementar Run Monitor state-driven**
   - Estado de run por polling/SSE según disponibilidad.
   - Timeline de eventos ordenada y consistente.

2. **Consola unificada (events/logs/metrics)**
   - Filtros por step/severidad/timestamp.
   - Persistencia de preferencias básicas de usuario.

3. **Políticas de fallback y reconexión**
   - SSE → polling automático.
   - Circuit-break visual de servicio inestable.

4. **Overlay Runtime y Cost por modo (sin mezclar)**
   - Runtime Mode: estado + duración.
   - Cost Mode: heatmap.
   - Design Mode limpio por defecto.

5. **Hardening de mensajes de error**
   - Errores recuperables (toast + retry).
   - Errores no recuperables (panel bloqueante con diagnóstico).

### Riesgos

- Alta frecuencia de eventos puede degradar rendimiento del render.
- Inconsistencias temporales entre snapshot de run y stream de eventos.

### Oportunidades

- Diferenciación fuerte del producto en operación diaria.
- Mejor trazabilidad para soporte y debugging funcional.

---

## Sprint 4 — Escalabilidad + vistas avanzadas controladas

### Objetivo del sprint

Garantizar legibilidad y rendimiento en grafos grandes y activar capacidades avanzadas sin ruido.

### Tareas

1. **Implementar layering completo del canvas**
   - Core/Validation/Exposure/Runtime/Cost/Impact con toggles.
   - Regla de una capa intensiva a la vez.

2. **Representación de tests y exposures no intrusiva**
   - Tests agregados por badge + inspector.
   - Exposures ocultas por defecto y estilo secundario.

3. **Estrategia de escalado para 300+ nodos**
   - Progressive reveal por zoom.
   - Auto-grouping y clusters colapsables.
   - Optimización de render en viewport.

4. **Layout determinista recomendado (ELK layered)**
   - Orden estable por tipo/nombre/dependencia.
   - Inserción incremental sin “caos visual”.

5. **Activación gradual de vistas avanzadas**
   - Diff/Artifacts primero.
   - Lineage/Cost/Plugins/Admin por flags y/o rol.

### Riesgos

- Complejidad de UX si se exponen demasiados toggles sin guía.
- Coste técnico de migrar layout manteniendo experiencia actual.

### Oportunidades

- Escalabilidad real para casos enterprise.
- Base robusta para roadmap de observabilidad avanzada.

---

## 5) Dependencias clave entre sprints

- Sprint 2 depende del contrato mínimo de Sprint 1 (estado de plataforma + data source).
- Sprint 3 depende de tener Run Start funcional o simulación contractual estable.
- Sprint 4 depende de baseline de modos (Design/Runtime/Cost/Impact) definido en Sprint 3.

## 6) Riesgos transversales del plan

1. **Desalineación Front/Back en contratos de dominio**
   - Mitigación: versionado de contrato y adapters temporales explícitos.

2. **Regresión de usabilidad por exceso de controles**
   - Mitigación: defaults estrictos, progressive disclosure y criterios de “vista limpia”.

3. **Rendimiento en grafos grandes**
   - Mitigación: estrategia de render por nivel de zoom + clusters.

4. **Ambigüedad de estados de red**
   - Mitigación: matriz única de estados y copy UX consistente.

## 7) Oportunidades transversales

1. **Acelerar adopción interna** con una UI más clara para operación diaria.
2. **Reducir coste de soporte** por mejor diagnóstico visual y estados explícitos.
3. **Mejorar colaboración Front/Back** con contratos de integración concretos por sprint.
4. **Preparar terreno enterprise** mediante escalabilidad y control visual por capas.

## 8) Métricas de éxito sugeridas

- Tiempo hasta primera acción útil en Canvas (TTFA).
- % de sesiones que completan Plan → Run sin error UX bloqueante.
- Tasa de errores recuperados vía retry exitoso.
- Rendimiento en grafo de 300 nodos (fps/interacción y latencia de layout).
- Uso de modos (Design/Runtime/Cost/Impact) y tiempo de permanencia.

## 9) Cierre

Este plan divide la evolución en entregables concretos y acumulativos, con foco en claridad cognitiva, integración real con backend y escalabilidad, sin deriva arquitectónica.


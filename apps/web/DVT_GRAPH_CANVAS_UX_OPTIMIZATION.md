# DVT+ Graph Canvas UX Optimization (State-Driven, Architecture-Preserving)

## 1) UX Architecture Proposal (Overview)

Objetivo: optimizar claridad cognitiva del canvas DAG sin tocar arquitectura ni contratos.

Principios:

- Separar capas semánticas por modo visual (no mezclar abstracciones).
- Mantener el grafo estructural base estable entre modos.
- Mostrar detalle bajo demanda (hover/inspector), no persistente.
- Priorizar legibilidad inicial y escalabilidad (>300 nodos).

Restricciones explícitas (se mantienen):

- Sin cambios en Planner/Engine/State/artefactos dbt/plugins.
- Sin nuevas capacidades de ejecución.
- UI estrictamente state-driven.

## 2) Layer Model Specification

## 2.1 Capas definidas

1. **Core Pipeline Layer (default ON)**
   - Sources + Models.
   - Es la única capa obligatoria por defecto.

2. **Validation Layer (default OFF en vista limpia)**
   - Tests representados de forma agregada (badges/inspector), no como nodos principales.

3. **Exposure Layer (default OFF)**
   - Exposures visibles solo al activar la capa.

4. **Runtime Layer (default OFF)**
   - Estado de ejecución + duración.

5. **Cost Layer (default OFF)**
   - Heatmap de coste sobre nodos core.

6. **Lineage/Impact Layer (default OFF)**
   - Resaltado upstream/downstream sobre selección.

## 2.2 Reglas de convivencia

- Solo una capa “intensiva” activa simultáneamente: Runtime **o** Cost **o** Impact.
- Validation y Exposure pueden combinarse con Core, pero no dominar visualmente.
- La estructura base (nodos/edges core) no cambia al alternar capas.

## 3) Interaction Model Specification

## 3.1 Modos de trabajo

- **Design Mode (default):** Core limpio, sin métricas persistentes.
- **Runtime Mode:** superpone estado/duración.
- **Cost Mode:** superpone heatmap de coste.
- **Impact Mode:** superpone impacto de selección.

## 3.2 Rediseño de Tests

Representación primaria:

- Badge agregado por nodo (`tests: pass/fail`).
- Indicador crítico (rojo) solo cuando existe fallo.
- Detalle completo en inspector lateral (lista de tests con estado).

Visibilidad de nodos de test:

- Solo en “Validation Layer ON + zoom alto” o en vista dedicada de diagnóstico.

Drill-down:

- Click en badge de test abre inspector filtrado por nodo.
- Desde inspector se navega al test individual sin saturar el canvas principal.

## 3.3 Rediseño de Exposures

- Estado por defecto: ocultas.
- Al activar Exposure Layer:
  - Estilo visual secundario (borde discontinuo, menor contraste que modelos).
  - Conexiones finas y semitransparentes.
- Exposures nunca compiten en tamaño/color con nodos core.

## 3.4 Runtime y métricas

- **Design Mode:** sin duración/coste visibles de forma persistente.
- **Runtime Mode:** mostrar status + duración por nodo (persistente en este modo).
- **Cost Mode:** mostrar mapa de color por coste (persistente en este modo).
- Hover: revela tooltip contextual (detalle puntual) en cualquier modo.

## 3.5 Inspector

- Contextual al nodo seleccionado.
- Secciones ordenadas: Summary → Runtime → Cost → Tests → Exposures.
- Fuente principal para detalle; canvas reservado para señalización.

## 3.6 Actualizaciones y animación

- Transiciones suaves y cortas (150–250ms) en cambios de estado.
- Sin animación decorativa continua.
- Cambios de modo no reescriben layout; solo overlays/estilos.

## 4) Layout Rules

## 4.1 Motor recomendado

- **ELK layered** como preferente para jerarquía legible y edge routing estable.
- Mantener compatibilidad de fallback con layout actual (dagre) si aplica.

## 4.2 Orden y jerarquía

- Eje principal izquierda→derecha por dependencias.
- Swimlanes opcionales por tipo (Source / Staging / Marts / Outputs).
- Tests y exposures fuera del carril principal en modo limpio.

## 4.3 Reglas visuales

- Tamaño base uniforme en core nodes.
- Color por tipo semántico (pocos colores, contrastes consistentes).
- Estado (éxito/fallo/en curso) como señal secundaria (badge/borde), no color de fondo dominante.
- Routing de edges ortogonal/suave, minimizando cruces.

## 4.4 Reglas deterministas

- Orden estable por tipo + nombre + dependencia para evitar “saltos”.
- Inserción de nuevos nodos de manera incremental preservando layout existente.

## 5) Scalability Guidelines

## 5.1 Progressive reveal

- Zoom bajo: solo etiquetas críticas y forma general.
- Zoom medio: nombres + estado resumido.
- Zoom alto: metadatos adicionales bajo demanda.

## 5.2 Agrupación y colapso

- Auto-group por dominio/tag/capa de transformación.
- Clusters colapsables con contadores (nodos, fallos, coste agregado).
- Expandir solo el grupo en foco para reducir carga visual.

## 5.3 Rendimiento visual

- Virtualización/ocultación de detalles no visibles en viewport.
- Minimizar re-render global; preferir actualización granular por nodo/capa.

## 6) Enumerated Optimization Tasks

1. Implementar sistema de capas toggleables (Core/Validation/Exposure/Runtime/Cost/Impact).
2. Migrar tests a representación agregada (badge + inspector) como default.
3. Definir exposures como capa opcional de bajo peso visual.
4. Introducir overlays de Runtime y Cost aislados por modo.
5. Estandarizar jerarquía visual (tamaño, color, bordes, edges).
6. Implementar selector de modo único (Design/Runtime/Cost/Impact).
7. Añadir grouping colapsable + progressive reveal para grafos grandes.
8. Adoptar layout determinista ELK layered y reglas de inserción incremental.

## 7) Before/After (Conceptual)

Antes:

- Todo visible simultáneamente (core + tests + exposures + métricas).
- Competencia de señales y ruido en lectura inicial.

Después:

- Vista limpia por defecto (solo Core).
- Señales especializadas por modo/capa.
- Detalle trasladado a inspector/hover.
- Estructura estable al cambiar de modo.

## 8) Acceptance Criteria

- Un grafo de 50 nodos es legible “first glance” en Design Mode.
- Tests no compiten visualmente con modelos en la vista principal.
- Métricas runtime/coste no aparecen persistentes en modo diseño.
- Cambiar a Runtime/Cost no altera la estructura del grafo base.
- No hay cambios en arquitectura ni semántica de ejecución.
- La UI se mantiene estrictamente state-driven.

## 9) Explicit Non-Goals

- Rediseñar Planner.
- Cambiar semántica de ejecución.
- Reemplazar React Flow.
- Eliminar artefactos dbt.
- Introducir lógica de orquestación nueva.
- Añadir feature creep fuera de optimización UX.


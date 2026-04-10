# 01. Market Benchmarks: productos con tableros grandes y trabajo iterativo

## Por qué estos referentes

No basta con mirar productos “bonitos”.
Para DVT hacen falta referentes que resuelvan al menos una de estas tensiones:

- tablero o superficie grande,
- navegación repetitiva entre contexto y detalle,
- operación técnica densa,
- edición/inspección de artefactos,
- y extensibilidad por plugins.

## Referentes clave

### 1. VS Code

**Qué aporta**

- Shell muy estable.
- Activity bar clara.
- Explorer + editor + panel inferior.
- Quick Open y command palette.
- Persistencia fuerte de contexto.

**Qué conviene copiar**

- Gramática de layout.
- Prioridad de teclado y quick switch.
- Separación entre navegación global y contenido activo.
- Panel inferior como diagnóstico, no como pantalla aparte.

**Qué no conviene copiar tal cual**

- Exceso de densidad críptica.
- Demasiadas affordances “developer IDE” si el público de DVT no es 100% ingeniería.

### 2. dbt Studio IDE

**Qué aporta**

- Unificación entre build/test/run/versionado en una sola interfaz.
- Lenguaje de trabajo centrado en proyecto y ejecución.

**Qué conviene copiar**

- Que el usuario no cambie de “aplicación mental” para editar, comparar y ejecutar.
- Unión entre artefacto, compilación y monitorización.

**Qué no conviene copiar tal cual**

- Visión demasiado centrada en editor textual si DVT quiere conservar el canvas como ventaja diferencial.

### 3. Miro

**Qué aporta**

- Estructuración de board mediante frames.
- Navegación entre zonas de trabajo.
- Presentación y wayfinding sobre superficies grandes.

**Qué conviene copiar**

- Frames / sections / saved areas.
- Navegación por zonas en tableros extensos.
- Pensar el canvas como espacio navegable, no sólo como render de nodos.

**Qué no conviene copiar tal cual**

- Libertad total de colocación y caos visual.
- Multiplicación de herramientas flotantes.

### 4. FigJam / Figma

**Qué aporta**

- Sections para agrupar objetos.
- Inspector lateral muy claro.
- Jerarquía limpia entre canvas, propiedades y librería.

**Qué conviene copiar**

- Inspector contextual.
- Agrupación semántica de áreas.
- Estructura clara entre panel izquierdo, superficie central y panel derecho.

**Qué no conviene copiar tal cual**

- Exceso de tooling visual si la tarea principal es operativa y no de diseño.

### 5. Grafana (Explore + Dashboards)

**Qué aporta**

- Diferencia muy bien “explorar” de “monitorizar”.
- Soporta iteración rápida y vistas densas.
- Tiene una cultura fuerte de plugins.

**Qué conviene copiar**

- Separación entre vista de exploración y vista operacional resumida.
- Alta densidad con claridad.
- Modelo de plugins como producto, no como hack.

**Qué no conviene copiar tal cual**

- Panelitis.
- Demasiadas superficies simultáneas sin jerarquía.

### 6. Dagster

**Qué aporta**

- Relación fuerte entre grafo/lineage y ejecución.
- Navegación por assets y dependencias.
- Modelo de operación centrado en flows y estados.

**Qué conviene copiar**

- Cercanía entre grafo, ejecución y contexto de activos.
- Jump paths entre nodo, lineage y runtime.

**Qué no conviene copiar tal cual**

- Complejidad conceptual expuesta demasiado pronto.

### 7. Backstage

**Qué aporta**

- Composición app-first mediante plugins.
- Navegación y rutas desacopladas mediante referencias.
- Escalabilidad estructural del frontend.

**Qué conviene copiar**

- Que el plugin se adapte a la shell y no al revés.
- Integración gobernada de navegación y vistas.

**Qué no conviene copiar tal cual**

- Exceso de “portal corporativo” si DVT quiere una experiencia más afilada y operativa.

## Patrones transversales que sí convienen a DVT

### 1. Shell grammar fija

Todos los productos maduros tienen una gramática estable de layout.
DVT debe evitar que cada ruta invente su propia composición.

### 2. Jerarquía de acciones

- globales arriba,
- de navegación a la izquierda,
- locales cerca del contenido,
- contextuales en inspector,
- diagnósticos abajo.

### 3. Persistencia de contexto

Los usuarios iterativos no quieren “empezar de cero” cada vez.
Conviene persistir:

- layout,
- ruta reciente,
- selección,
- filtros,
- tab activo,
- vista guardada.

### 4. Progresive disclosure

Las capacidades avanzadas deben existir, pero no saturar la primera capa.
Primero la tarea.
Luego el detalle.

### 5. Densidad con orden

La densidad es buena si ayuda a:

- buscar,
- comparar,
- revisar,
- accionar.
  Es mala si sólo mete más ruido.

## Traducción directa a DVT

### DVT debería tomar de VS Code / dbt Studio

- shell de workbench,
- tabs contextuales,
- panel inferior útil,
- command palette,
- Monaco bien integrado.

### DVT debería tomar de Miro / FigJam

- frames o zonas para canvas grande,
- navegación entre áreas,
- inspector contextual más claro.

### DVT debería tomar de Grafana / Dagster

- vistas densas para operación,
- clara relación entre estado, ejecución y superficie visual,
- overlays y filtros que realmente aporten señal.

### DVT debería tomar de Backstage

- disciplina de pluginización,
- extensión por contratos,
- experiencia integrada y no oportunista.

## Conclusión del benchmark

El mejor posicionamiento no es “mezclar un graph viewer con varias pantallas”.
Es construir un **workflow workbench** donde:

- el grafo sea el mapa,
- el editor/diff sean la mesa de trabajo,
- los runs sean el runtime cockpit,
- y los plugins entren por docks previsibles.

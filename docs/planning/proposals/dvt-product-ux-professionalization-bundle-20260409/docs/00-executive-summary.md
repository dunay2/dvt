# 00. Executive Summary

## Posicionamiento recomendado

DVT no debería presentarse como “otro dashboard técnico oscuro”.
Debería presentarse como un **workbench operativo para diseñar, ejecutar, inspeccionar y extender workflows**.

Eso cambia varias decisiones:

1. **La shell manda.**  
   La navegación, el estado persistente y los paneles deben comportarse como gramática fija del producto, no como decisiones dispersas por pantalla.

2. **El canvas es el centro, pero no el único surface.**  
   El grafo debe convivir con código, diff, artefactos y monitorización en la misma experiencia, sin hacer que el operador salte de contexto todo el rato.

3. **La top bar no puede ser un cajón de sastre.**  
   Hoy mezcla identidad, selectores de workspace, estado de conexión y controles de layout. Hay que separar controles globales de controles locales.

4. **La navegación primaria debe agrupar tareas, no subherramientas.**  
   `Canvas`, `Runs` y `Lineage` encajan como tareas core.  
   `Code`, `Diff` y parte de `Artifacts` encajan mejor como superficies contextuales o tabs del workbench.

5. **La densidad tiene que subir, pero con orden.**  
   Para operaciones, listas, eventos, plugins y administración, el patrón dominante deben ser tablas, splits, headers consistentes y paneles estables; no una mezcla de cards y bloques.

6. **Los plugins deben entrar por docks conocidos.**  
   El repo ya tiene una base muy buena de plugin contributions. Falta convertir esa capacidad técnica en una experiencia visual y operativa gobernada.

## Decisión de producto más importante

La dirección correcta es:

**“Persistent shell + activity rail + route header + contextual workbench + inspector + diagnostics panel”**

y no

**“cada ruta con su propia mini-UI independiente”**.

## Recomendaciones críticas

### A. Simplificar la navegación core

Mantener como principales:

- Canvas
- Runs
- Lineage

Replantear:

- Code
- Diff
- Artifacts

Estas vistas siguen existiendo, pero conviene tratarlas cada vez más como:

- tabs del workbench,
- vistas derivadas del nodo o del run actual,
- o rutas secundarias.

### B. Detox de la top bar

La top bar debería quedarse con:

- marca y contexto de workspace,
- estado global,
- selector rápido / command palette,
- acciones globales.

No debería concentrar tantos controles de layout y densidad.

### C. Convertir el panel inferior en “Diagnostics Workspace”

El componente `Console` es una base útil, pero demasiado estrecha.
Debería crecer hacia un panel inferior con tabs:

- Events
- Logs
- Problems
- Output

### D. Bajar el ruido visual

El producto ya tiene tokens semánticos en `theme.css`, pero sigue manteniendo gradientes decorativos, hardcodes `slate-*` y colores directos en varias superficies.
Hay que:

- bajar brillo,
- bajar decoración,
- subir jerarquía,
- subir consistencia.

### E. Estructurar mejor los tableros grandes

Para trabajo iterativo sobre grafos grandes, conviene introducir:

- **saved views**
- **frames / zones**
- filtros persistentes
- quick switch
- command palette
- restauración de layout y contexto

## Qué haría primero

### Primer bloque (rápido, alto retorno)

- Route header estándar
- Limpieza de top bar
- Simplificación visual del shell
- Tokenización de hardcodes
- Panel inferior con gramática mejorada
- Productizar `PluginsView`

### Segundo bloque

- Workbench tabs reales en Canvas
- Code/Diff/Artifacts abiertos desde contexto
- Monaco theme DVT
- Runs más denso y más analítico

### Tercer bloque

- Contrato UX para plugins
- Command palette
- Saved views / frames / quick open
- Extensión a futuros step-kind plugins y source-generation workbenches

## Resultado esperado

Si se ejecuta bien, DVT pasará a sentirse como:

- más profesional,
- más rápido de usar,
- más ordenado para usuarios repetitivos/power users,
- más claro para demos y presentación de startup,
- y mucho más preparado para crecer por plugins sin perder coherencia.

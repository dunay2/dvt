# 02. DVT Current-State Audit (repo real)

## 2.1. Lo que ya está bien orientado

### Shell persistente

La estructura base ya apunta en la dirección correcta:

- `Root.tsx`
- `TopAppBar.tsx`
- `LeftNavigation.tsx`
- `Console.tsx`
- `ShellHealthBanner.tsx`

Eso ya es una base de “workbench shell” y es mejor que una app de pantallas aisladas.

### Pluginización real

El frontend no está improvisando plugins:

- `app/plugins/contracts/PluginManifest.ts`
- `app/plugins/registry.ts`
- `app/shell/useShellRuntime.ts`
- `app/routes.ts`

Ya hay capacidad para:

- vistas,
- navegación,
- toolbar contributions,
- inspector panels,
- overlays,
- badges,
- puertos `produces/consumes`.

Eso es muy valioso y hay que protegerlo.

### Canvas como núcleo de producto

La ruta Canvas ya se apoya en:

- `views/Canvas.tsx`
- `views/canvas/CanvasShell.tsx`
- `views/canvas/CanvasToolbar.tsx`
- `views/canvas/CanvasViewport.tsx`

La composición de paneles laterales + viewport ya es un punto de partida sólido.

### Monaco ya existe

No estamos ante una idea futura abstracta.
Existen:

- `components/monaco/MonacoCodeSurface.tsx`
- `components/monaco/MonacoDiffSurface.tsx`
- `components/monaco/MonacoViewerFallback.tsx`
- `views/CodeView.tsx`
- `views/DiffView.tsx`

Por tanto, el trabajo no consiste en “añadir editor”, sino en **integrarlo bien**.

## 2.2. Problemas de producto/UX detectados

### A. Fragmentación de rutas

Hoy el repo presenta demasiada separación entre:

- Canvas
- Lineage
- Code
- Diff
- Runs
- Artifacts

Eso es técnicamente válido, pero desde UX divide un flujo que debería sentirse continuo:

1. veo el nodo,
2. inspecciono,
3. comparo,
4. ejecuto,
5. monitorizo.

### B. Top bar sobrecargada

`TopAppBar.tsx` y `topAppBar/TopAppBarShellMenu.tsx` cargan:

- contexto de workspace,
- estado de conexión,
- git ref,
- toggles de explorer/inspector/console,
- focus mode,
- grid size.

Conclusión:

- hay demasiado control global en una sola franja;
- parte de eso debería estar más cerca del canvas o del route-local toolbar.

### C. Ruido visual todavía alto

Aunque `styles/theme.css` ya tiene buena base de tokens, siguen existiendo hardcodes y decoración fuerte en:

- `styles/index.css`
- `views/canvas/CanvasViewport.tsx`
- `views/ArtifactsView.tsx`
- `components/Console.tsx`
- `components/monaco/MonacoViewerFallback.tsx`
- y muchas clases `bg-slate-* / text-slate-*`

Visualmente esto produce:

- demasiada mezcla de superficies,
- menor lectura jerárquica,
- sensación más “prototype dark UI” que “producto operativo”.

### D. El panel inferior es útil pero demasiado estrecho

`Console.tsx` resuelve una necesidad real, pero como experiencia:

- está demasiado ligado al concepto “console”,
- no cubre bien eventos, problemas, salidas y runtime detail,
- y en modo API ya admite explícitamente que el streaming no está disponible.

La dirección correcta es convertirlo en una **bandeja de diagnósticos**.

### E. Falta estructura específica para boards grandes

`CanvasViewport.tsx` ya usa minimap y grid, pero eso no basta para grafos grandes.
Faltan:

- zonas/frames,
- saved views,
- quick focus,
- bookmarks,
- presets de filtro,
- restauración de contexto de tarea.

### F. Densidad no estandarizada

Hay vistas que todavía parecen “pantalla compuesta por bloques” y no “surface operacional”.
Esto afecta sobre todo a:

- Runs
- Plugins
- Admin
- Artifacts
- Diff

### G. Falta una gramática de integración visual para plugins

La infraestructura técnica ya existe, pero falta una regla de producto del tipo:

- qué puede entrar en top bar,
- qué entra en route header,
- qué entra en toolbar local,
- qué entra en inspector,
- qué entra en bottom panel,
- qué nunca debe entrar como UI arbitraria.

## 2.3. Oportunidades claras

### Opportunity 1: unificar shell + workbench

El repo ya tiene suficiente base para convertir la app en una experiencia unificada de trabajo.

### Opportunity 2: usar el sistema de plugins como ventaja competitiva

Pocos productos medianos tienen ya esta estructura tan preparada para extensión de vistas y overlays.

### Opportunity 3: profesionalizar sin rehacer todo

No hace falta reescribir `apps/web`.
El salto grande vendrá de:

- grammar,
- simplificación,
- tokenización,
- densidad,
- y relación ordenada entre superficies.

## 2.4. Hallazgos concretos por superficie

### Root shell

**Ficheros**

- `app/Root.tsx`
- `app/components/TopAppBar.tsx`
- `app/components/LeftNavigation.tsx`
- `app/components/Console.tsx`

**Lectura**
Base fuerte para workbench.

**Problema**
Le falta una separación más limpia entre:

- navegación,
- acción local,
- estado contextual,
- diagnóstico.

### Canvas

**Ficheros**

- `app/views/Canvas.tsx`
- `app/views/canvas/CanvasShell.tsx`
- `app/views/canvas/CanvasToolbar.tsx`
- `app/views/canvas/CanvasViewport.tsx`

**Lectura**
Es la mejor base actual del producto.

**Problema**
Todavía se siente “graph route” más que “workspace operacional”.

### Code / Diff / Artifacts

**Ficheros**

- `app/views/CodeView.tsx`
- `app/views/DiffView.tsx`
- `app/views/ArtifactsView.tsx`
- `app/components/monaco/*`

**Lectura**
Son útiles, pero todavía orbitan como rutas separadas.

**Problema**
Deberían sentirse cada vez más como extensiones contextuales del workspace.

### Runs

**Ficheros**

- `app/views/RunsView.tsx`
- `app/views/runs/*`

**Lectura**
Necesita convertirse en cockpit operacional denso.

### Plugins

**Ficheros**

- `app/views/PluginsView.tsx`
- `app/plugins/registry.ts`
- `app/plugins/contracts/PluginManifest.ts`

**Lectura**
Hoy es más “diagnóstico técnico” que “experiencia de gestión de extensiones”.

## 2.5. Veredicto

DVT ya tiene la arquitectura visual mínima para convertirse en un producto profesional.
Lo que le falta no es más feature count.
Le falta:

- más gramática,
- menos fragmentación,
- más densidad útil,
- menos ruido,
- y una política explícita para cómo se acopla todo, incluidos plugins.

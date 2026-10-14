---
title: Manual de usuario del workspace y Canvas
status: Active
owner: Frontend / UX
last_reviewed: 2026-08-06
---

# Manual de usuario del workspace y Canvas

## Para quién es este manual

Este manual parte de cero. No presupone que la persona conozca Raven, dbt,
Canvas ni la estructura interna de un proyecto. Cada operación indica qué debe
verse, cómo salir y qué hacer si la opción no está disponible.

La aceptación experta completa se rige por `WUX1-EXPERT-MANUAL-v1`, publicado
en el documento canónico
[Screen Manuals And User Stories](../architecture/components/web/screen-manuals-and-user-stories.md#wux1-demanding-user-manual).
Este documento es la guía operativa en español; no redefine ni rebaja aquella
matriz.

## 1. Arranque y primer proyecto

Durante el arranque se muestra una única pantalla de estado. Los pasos se
presentan en orden, con texto y color; el color nunca es la única señal. Si un
prerrequisito bloquea el arranque, la pantalla permanece visible y explica qué
comprobación necesita atención.

Al entrar sin un proyecto activo aparece **Elige o crea un proyecto**:

1. En **Proyectos disponibles**, localiza el proyecto por su nombre e ID.
2. Pulsa **Abrir proyecto**. No es necesario crear un proyecto nuevo.
3. Si no existe ninguno y tienes permiso, completa **Tenant** y **Nombre del
   proyecto** en **Crear un proyecto**.
4. Pulsa **Crear proyecto**.
5. Si la lista parece desactualizada, pulsa **Actualizar proyectos**.

La interfaz muestra un mensaje explícito si tu cuenta no puede crear proyectos.

## 2. Saber qué proyecto está activo y cambiarlo

En la barra superior, el control **Proyecto: _nombre_** identifica el proyecto
activo. Para cambiarlo:

1. Abre **Proyecto: _nombre_**.
2. Revisa la lista de proyectos autorizados por el servidor.
3. Selecciona otro proyecto.
4. Comprueba que el nombre de la barra superior y el contexto del workspace se
   actualizan antes de continuar.

Si solo tienes acceso a un proyecto, el selector lo indica y explica que no hay
otro proyecto autorizado. Raven no inventa proyectos ni permite escribir un ID
arbitrario.

## 3. Cambiar el idioma

1. Abre el menú **Vista** o **View**.
2. Abre **Idioma** o **Language**.
3. Selecciona **Español** o **English**.
4. Comprueba que el menú, los tooltips, los diálogos, el Canvas y el contexto de
   proyecto cambian sin recargar la página.

La preferencia queda guardada para la siguiente sesión y el documento publica
el atributo `lang` correspondiente para tecnologías de asistencia.

## 4. Abrir y cerrar el código

### Código de un nodo

1. Selecciona un nodo del grafo.
2. Sitúa el puntero sobre el botón **Abrir código del nodo** para consultar su
   tooltip; la explicación no permanece ocupando el Canvas.
3. Pulsa el botón. El banco de trabajo abre el archivo exacto del nodo, no una
   plantilla genérica.
   La acción no se repite en **Más acciones del nodo** ni en el menú de clic
   derecho.
4. Usa el encabezado para arrastrar el banco a otra zona del Canvas. Con teclado,
   enfoca el control **Mover banco de trabajo de código** y utiliza las teclas de
   dirección.
5. Pulsa **Cerrar** o usa `Escape` cuando el control lo permita. Si hay una
   escritura en curso, Raven termina la sincronización antes de desmontar el
   editor.

### Código completo del proyecto

1. Abre **Workspace** o **Espacio de trabajo**.
2. Pulsa **Abrir código del proyecto**.
3. Usa el explorador de archivos para recorrer todos los archivos autorizados.
4. El editor muestra el contenido completo del archivo seleccionado y permite
   desplazamiento vertical; no lo sustituye por un extracto explicativo.
5. Mueve el banco desde su encabezado y ciérralo con el botón visible.

## 5. Selección de ejecución y conexiones

- El botón con triángulo **Play** significa **Seleccionar para ejecución**.
- Cuando el nodo ya está seleccionado, el icono cambia a **Pausa** y la acción
  se denomina **Quitar de la ejecución**.
- El menú contextual repite esa misma semántica en el idioma activo.
- Las conexiones muestran una flecha en el extremo de destino. La punta indica
  el sentido aguas arriba → aguas abajo y mantiene contraste con el Canvas.

La selección no inicia una ejecución por sí sola. La previsualización del plan
y la ejecución siguen siendo operaciones gobernadas separadas.

El estado de preparación aparece completo en la barra superior. En una ventana
estrecha los controles se redistribuyen en varias líneas; Raven no sustituye
**Vista previa obligatoria** por puntos suspensivos.

### Inspector del nodo

1. Selecciona un nodo para abrir su Inspector.
2. Recorre **General**, **Columnas**, **Pruebas**, **Entradas y salidas** y
   **Código**. Abre **Más** para ver claves, índices, restricciones, resumen,
   configuración e historial cuando correspondan.
3. Comprueba que encabezados, valores, estados vacíos y nombres accesibles usan
   el idioma activo.
4. En **Entradas y salidas**, usa **Dirección**, **Nodo**, **ID del nodo** y
   **Relación** para confirmar el sentido de la conexión.
5. Cierra el Inspector y comprueba que el foco vuelve al nodo.

## 6. Añadir componentes

1. Abre el menú contextual del Canvas con clic derecho o con `Shift+F10` y
   selecciona **Añadir…**.
   No existe un botón fijo **Añadir componente** sobre el Canvas: el clic
   derecho o su equivalente de teclado abren la única entrada para esta acción.
2. El catálogo agrupa los componentes por **Orígenes**, **Modelos**, **Seeds**,
   **Transformaciones**, **Tests**, **Salidas**, **Macros** u otras categorías
   registradas.
3. Lee la descripción completa bajo cada acción. No debe existir desplazamiento
   horizontal para terminar de leerla.
4. Usa el campo de búsqueda para reducir la lista sin perder la agrupación.
5. Selecciona la acción necesaria.

En una ventana estrecha, el catálogo se limita al ancho visible y conserva el
ajuste de línea.

## 7. Explorar, importar y cancelar

- **Explorar proyecto** abre la lista de Canvas del proyecto actual.
- **Importar proyecto dbt** abre la validación y el inventario antes de importar.
- **Configuración de Canvas** abre preferencias de visualización.

Todas estas superficies tienen un botón de cierre o cancelación visible. También
admiten `Escape`, mantienen el foco dentro del diálogo y devuelven el foco al
control de origen al cerrar. **Cancelar** una importación no equivale a
**Importar proyecto** y no publica una recepción de éxito.

## 8. Comprobación de accesibilidad y visibilidad

La siguiente matriz sirve como comprobación manual mínima en escritorio
(`1440 × 900`) y ventana estrecha (`390 × 844`):

| Pantalla o superficie   | Comprobación visual                                              | Teclado y asistencia                             | Forma de salir                        |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| Arranque                | Texto ≥ 13 px, título contenido, paleta neutra, estados legibles | Anuncio `aria-live`, progreso descrito con texto | Se cierra al resolver todos los pasos |
| Selección de proyecto   | Proyectos antes que creación, acciones con texto                 | Orden de foco lógico; campos con etiqueta        | Abrir un proyecto autorizado          |
| Barra superior          | Proyecto activo visible sin depender de tooltip                  | Selector y menús operables por teclado           | `Escape` cierra menús                 |
| Canvas                  | Nodos, puertos y flechas distinguibles; sin recorte horizontal   | Acciones con nombre accesible; foco visible      | Menús cierran con `Escape`            |
| Catálogo de componentes | Categorías y descripciones completas en ambos anchos             | Búsqueda etiquetada; grupos con nombre accesible | `Escape` o selección                  |
| Banco de código         | Explorador y archivo completo visibles; panel movible            | Control de movimiento y cierre etiquetados       | Botón **Cerrar**                      |
| Explorador de proyecto  | Lista desplazable sin quedar detrás del viewport                 | Diálogo modal, trampa de foco y `Escape`         | Botón **Cerrar**                      |
| Importación dbt         | Inventario desplazable; acciones separadas                       | Título y descripción del diálogo; foco visible   | **Cancelar**, `Escape` o cierre       |
| Ajustes de Canvas       | Controles no dependen del color                                  | Etiquetas y estado textual activar/desactivar    | Botón **Cerrar** o `Escape`           |

En cada ancho debe comprobarse además:

- contraste de texto, bordes, foco, flechas y controles deshabilitados;
- zoom del navegador al 200 % y 400 % sin pérdida de acciones ni texto;
- navegación solo con `Tab`, `Mayús+Tab`, `Intro`, `Espacio` y `Escape`;
- ausencia de texto cortado o de desplazamiento horizontal accidental;
- idioma coherente en texto visible, nombre accesible y tooltip;
- que ningún estado crítico se comunique exclusivamente mediante color.
- que movimiento reducido elimine animación decorativa sin ocultar cambios de
  estado;
- que colores forzados/alto contraste conserven foco, límites, selección,
  dirección y acciones destructivas;
- que Canvas, Runs, Templates, Plugins, Admin y Cost cuando esté concedido,
  además de sus diálogos y bancos contextuales, tengan trabajo principal,
  acción, estado y salida identificables.

## 9. Diagnóstico rápido

| Problema                                 | Comprobación                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| No aparece otro proyecto                 | El selector indica si el servidor solo autoriza uno; solicita acceso si esperabas más |
| El código no corresponde al nodo         | Cierra el banco, selecciona el nodo correcto y usa **Abrir código del nodo**          |
| No se ve una flecha                      | Comprueba que la conexión tiene destino y que no está atenuada por filtros            |
| No puedes importar                       | Ejecuta primero **Validar proyecto** y revisa los diagnósticos                        |
| La interfaz mezcla idiomas               | Vuelve a **Vista → Idioma**; registra la superficie exacta si persiste                |
| Un diálogo parece bloquear la aplicación | Usa el botón visible **Cerrar/Cancelar** o `Escape`                                   |

## Evidencia esperada para aceptación

La aceptación exige capturas o grabación de los recorridos anteriores en ambos
anchos, pruebas automatizadas de los contratos estables y un informe crítico de
una persona revisora que empiece sin conocimiento previo de Raven. Un recorrido
feliz sin comprobar salida, idioma, foco, recorte y error no es evidencia
suficiente.

<a id="section-canvas-node-gestures"></a>

## Canvas Node Gestures

The product-owner correction in [#3186](https://github.com/dunay2/dvt/issues/3186)
supersedes the native DVT Transform gesture policy in
[Canvas Node Workbench Hardening](https://github.com/dunay2/dvt/blob/f921266eaa528f9533cb5545f7678a408920935e/docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-workbench-hardening-plan-20260808.md).
File-backed dbt node entry is unchanged.

| Native DVT Transform gesture                                        | Result                                         |
| ------------------------------------------------------------------- | ---------------------------------------------- |
| Left single click on the card body                                  | Select its semantic output in Semantics        |
| Left double click on the card body, including its title and metrics | Open Data for that Transform, never Properties |
| Enter on the focused node                                           | Same entry as double click                     |
| Right click on the card                                             | Existing Properties operation                  |
| Embedded column control or field context menu                       | Its own action; do not enter the card          |

The adapter reuses `InspectCanvasNode`, the existing semantic contribution and
the existing Data drawer. No second navigation command, query, editor or store
is introduced. Field-scoped in-place editing is owned by
[#2923](https://github.com/dunay2/dvt/issues/2923), not by card entry.

Current defect: `CanvasShell` overrides Transform entry with
`onInspectNode(general)` and its regression test requires that wrong destination.
The correction changes the destination and extracts the existing sample-request
lifecycle into one presentation-only hook, leaving query ports unchanged.

```text
Left click --------> Semantics
Double click/Enter -> Data -> authoritative sample or explicit unavailable state
Right click -------> existing Properties operation
```

Semantic inspection compares the stored Substrait source identities with the
currently connected graph. When an input was removed or a new input was added,
the drawer shows one pending-composition state instead of presenting the stored
relation as current. Inspection does not guess a replacement JOIN and does not
destroy the recoverable semantic document; explicit confirmed dependency
removal remains owned by
[#3123](https://github.com/dunay2/dvt/issues/3123).

Opening Data must invalidate any earlier sample request: a late Source or Sink
response must never appear under a Transform's name. Navigation does not execute
SQL, start a run, write Graph Draft or change node geometry. If no authoritative
Transform result is available, show the existing unavailable state, never an
empty success or another node's rows. Result binding and real runtime execution
remain governed by [#2582](https://github.com/dunay2/dvt/issues/2582) and
[#2723](https://github.com/dunay2/dvt/issues/2723).

Regression proof covers single/double click, Enter, card context menu, embedded
controls, unchanged geometry/draft, absent query fallback, and suppression of late
responses. This guide does not claim that implementing navigation supplies the
missing Transform result capability.

> Section status: Active. Owner: Frontend / Product. Colocation does not merge component responsibilities.

<a id="section-canvas-authoring-user-manual-20260501"></a>

## Manual de usuario de autoria en Canvas

### Estado de evidencia

Este documento no debe leerse como prueba de un flujo SQL profesional completo.
Las capturas existentes muestran capacidades parciales del Canvas, pero no
demuestran todavia el flujo exigente de producto desde un canvas vacio hasta:

- exploracion real de origenes con conexion, tablas, columnas y metadata;
- seleccion visible de tablas origen antes de crear el grafo;
- autoria de transformacion SQL con contexto de columnas de entrada;
- seleccion explicita de destino con adaptador, base de datos, esquema, tabla,
  materializacion y modo de escritura;
- preview, ejecucion y evidencia que nombren el mismo origen y destino elegidos.

El gap operativo esta registrado en la BBDD como
`SQL-CANVAS-UX-P0-PRO-FLOW-1`. Hasta que ese trabajo cierre con pruebas E2E y
capturas nuevas, este manual es una guia limitada de superficies existentes, no
un visto bueno de producto maduro.

### Audiencia

Este manual es para usuarios, QA y revisores de producto que validan la autoria
visual de workflows en Canvas. Describe como usar la herramienta, que casos de
uso estan cubiertos por el flujo actual y que casos siguen condicionados o fuera
de alcance.

Los nombres de controles se citan como aparecen en la evidencia inglesa. Desde
`Vista > Idioma` se puede elegir `Espanol` o `Ingles`; etiquetas, tooltips,
mensajes y estados deben cambiar juntos al idioma seleccionado.

### Prerrequisitos

- El usuario debe tener una sesion autenticada.
- Debe existir tenant, proyecto y entorno seleccionados.
- El backend debe responder salud, capacidades y borrador de workspace.
- El canvas debe ser escribible para crear nodos, conectar nodos o importar
  fuentes.
- Las acciones visibles dependen del tipo de canvas activo. Un canvas `dbt`
  muestra tipos `dbt`; un canvas de transformacion no debe mezclar tipos
  incompatibles.

La pantalla no debe inventar datos de ejemplo cuando falta proyecto, entorno o
autoridad de borrador.

### Mapa rapido

La vista principal tiene estas zonas:

- Barra superior de workspace: estado de conexion, workspace y vista.
- Superficie de grafo: nodos, aristas, controles de zoom y minimapa.
- Menu contextual del canvas: creacion de nodos, `Add source`, exploracion de
  proyecto, codigo de proyecto, validacion y preview.
- Workbench contextual del nodo: propiedades, columnas, metadata, tests,
  codigo y evidencia del nodo seleccionado.
- Consola inferior: eventos de ejecucion cuando existe un run activo.

![Canvas dbt actual](./assets/canvas-authoring-user-manual/08-current-dbt-canvas.png)

### Abrir un canvas existente

1. Abrir `/canvas` con sesion y proyecto seleccionados.
2. Confirmar que aparece el canvas activo, por ejemplo `dbt canvas`.
3. Confirmar que los nodos persistidos se renderizan en el grafo.
4. Confirmar el estado del borrador: `Borrador sincronizado`, `Plan requerido`
   u otro estado explicito.

Resultado esperado: el usuario ve un grafo real de proyecto. Si falta autoridad
de backend o de proyecto, la vista debe bloquear autoria en vez de mostrar datos
de muestra.

### Cambiar de proyecto sin mezclar datos

1. Pulsar el nombre `Proyecto: ...` de la barra superior para abrir `Espacio de
trabajo`.
2. Revisar el tenant, proyecto y entorno activos en `Contexto del proyecto`.
   Esos campos son informativos; no se editan escribiendo sobre ellos.
3. En `Proyectos disponibles en esta sesion`, elegir el scope
   `tenant / proyecto / entorno` deseado. Con teclado, llevar el foco a la
   opcion y pulsar `Enter` o espacio.
4. Confirmar que el menu se cierra y que la barra superior muestra el proyecto
   nuevo antes de continuar.
5. Volver al proyecto anterior con el mismo selector cuando sea necesario.

Resultado esperado: la seleccion usa el rail `SelectWorkspaceScope`, vuelve a
cargar el borrador, archivos y conexiones del scope elegido y no reutiliza el
contenido de otro proyecto aunque ambos tengan una ruta como
`models/sources/src_public.yml`. La prueba mas exigente usa el mismo objeto
fisico PostgreSQL en A y B, confirma que B empieza sin el grafo de A y, al
volver, recupera las dos fuentes y `Model 1` de A. Si solo existe un proyecto
autorizado, aparece `No hay otro proyecto disponible en esta sesion.`; no se
inventan alternativas.

Comprobacion exigente: repetir A -> B en ingles y B -> A en espanol. El nombre
visible de `Project/Proyecto` debe cambiar antes que el grafo; el selector debe
tener foco visible y no presentar hallazgos axe `serious` o `critical`.

### Insertar nodos

1. Hacer click derecho sobre una zona vacia del canvas.
2. Elegir el tipo de nodo permitido por el canvas activo.
3. Confirmar que el nodo aparece en el punto contextual del grafo.
4. Abrir el workbench del nodo con doble click o menu contextual del nodo.

![Busqueda de nodos](./assets/canvas-authoring-user-manual/09-insert-node-search.png)

Resultado esperado: el menu contextual solo muestra acciones del canvas y no
mezcla propiedades de nodos. En un canvas `dbt`, las acciones crean tipos
compatibles con dbt; en un canvas DVT, crean tipos compatibles con el flujo DVT.
La insercion de nodos no sustituye al importador de fuentes gobernadas.
`Anadir componente` no debe ocupar un boton fijo sobre el Canvas: el unico
acceso al catalogo es el menu contextual abierto con click derecho.

### Usar el explorador de proyecto

1. Hacer click derecho sobre el canvas.
2. Elegir `Explore project`.
3. Buscar archivos, artefactos o canvases del workspace en el dialogo
   contextual.
4. Cerrar el dialogo para volver al grafo sin dejar un panel fijo abierto.

Resultado esperado: el explorador lista recursos existentes del proyecto bajo
demanda. No debe aparecer un panel lateral fijo `Project Resources` en el modo
base del grafo.

### Registrar fuentes de datos

1. Hacer click derecho sobre una zona vacia del canvas.
2. Elegir `Add source`.
3. En `Connections`, elegir una conexion gobernada.
4. En `Browse`, revisar esquemas, tablas, filas y columnas disponibles.
5. En `Metadata`, revisar columnas y metadata del origen activo.
6. En `Selected`, confirmar la cesta de tablas y pulsar `Attach sources to
canvas`.
7. Si la cesta supera el alto visible, usar la barra de desplazamiento del
   contenido. `Cancel` y `Attach sources to canvas` permanecen accesibles.
8. Abrir el Workbench del nodo importado y comprobar en `General` la fila
   `Connection`, con nombre, proveedor e identificador completos.

Resultado esperado: el flujo registra fuentes gobernadas desde los rails
`ListWarehouseConnections`, `ListWarehouseConnectionSourceObjects` e
`ImportWarehouseSources`, y las proyecta como nodos de fuente en el canvas cerca
del punto donde se abrio el menu contextual. La identidad persistida es la
combinacion de conexion y objeto fisico: importar el mismo objeto mediante dos
conexiones produce dos nodos distinguibles. No se muestran secretos ni se
deduce una conexion a partir del nombre de tabla.

### Gestionar proyecto

1. Pulsar `Proyecto`.
2. Usar `Exportar` para descargar un snapshot del proyecto/canvas.
3. Usar `Importar` para cargar un snapshot compatible.

![Menu de proyecto](./assets/canvas-authoring-user-manual/10-project-snapshot-menu.png)

Resultado esperado: `Proyecto > Importar` importa un snapshot de proyecto. No
abre el wizard de conexiones ni descubre fuentes externas.

### Crear plan y ejecutar

1. Completar un grafo valido.
2. Revisar que el estado deje de indicar `Plan requerido`.
3. Pulsar `Plan` para generar la previsualizacion.
4. Revisar el plan antes de iniciar la ejecucion.
5. Pulsar `Ejecutar` cuando el boton este habilitado.
6. Revisar logs y evidencia en `Ejecuciones`.

Resultado esperado: no se puede ejecutar un canvas sin plan valido. En la
captura principal, `Ejecutar` esta deshabilitado porque la barra indica
`Plan requerido`.

### Revisar codigo y artefactos

1. Seleccionar un nodo y pulsar el icono `Codigo` de su barra flotante.
2. Si el nodo declara una ruta persistida, confirmar que se abre ese archivo
   exacto en el Workbench de codigo del proyecto.
3. Si el nodo es nuevo o generado y aun no tiene archivo persistido, confirmar
   que se abre `More: Code` del propio nodo para revisar o editar su SQL.
4. Con el editor SQL enfocado, usar `Backspace` o `Delete` y confirmar que solo
   cambia el texto; el nodo seleccionado debe seguir en el grafo.
5. Para revisar el proyecto completo, abrir `Espacio de trabajo > Open project
code` y elegir un archivo del explorador. En la prueba de aislamiento, abrir
   `models/sources/src_public.yml` en B y en A y confirmar visualmente que cada
   archivo contiene su propia identidad de fuente y no la del otro proyecto.
6. Abrir `Artefactos` para revisar artefactos sincronizados y usar `View` o
   `Download` cuando esten disponibles.

Resultado esperado: codigo y artefactos son vistas de inspeccion del workspace;
no sustituyen el grafo, no fabrican rutas `models/<nombre>.sql` y nunca deben
mostrar el primer archivo disponible o contenido de otro nodo como sustituto
del recurso seleccionado.

La accion `Abrir codigo del nodo` no debe repetirse en `Mas acciones` ni en el
menu de click derecho. Si aparece ahi, o si esa copia no abre exactamente el
mismo recurso, el resultado es `NO-GO`; la unica entrada es el icono superior
de la barra flotante del nodo seleccionado.

### Casos de uso con evidencia parcial

- Abrir canvas con borrador:
  `/canvas` con proyecto y entorno validos. Evidencia:
  `08-current-dbt-canvas.png`. Limite: no prueba flujo desde canvas vacio hasta
  ejecucion.
- Crear nodo del catalogo:
  `Insertar` y elegir tipo compatible. Evidencia:
  `09-insert-node-search.png`. Limite: no prueba seleccion de origen real ni
  metadata de tabla.
- Buscar tipos de nodo:
  escribir en la paleta de insercion. Evidencia:
  `09-insert-node-search.png`. Limite: busca tipos, no origenes warehouse.
- Inspeccionar recursos:
  abrir `Explore project` desde el menu contextual del canvas. Limite: no
  demuestra columnas ni metadata de warehouse.
- Abrir Add Source:
  `Canvas context menu > Add source`. Evidencia E2E:
  `apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts`. Cubre
  runtime protegido, conexion warehouse real, metadata, seleccion y attach al
  canvas sin stubs de draft. La identidad entre dos conexiones y la recarga se
  prueban en `canvas-source-identity-live.cy.ts`; Preview y Run de DVT tienen
  su propia vertical protegida. El flujo dbt Canvas anterior fue retirado.
- Importar/exportar snapshot:
  `Proyecto > Exportar` o `Importar`. Evidencia:
  `10-project-snapshot-menu.png`. Limite: es snapshot, no flujo de conexion,
  origen y destino.
- Bloquear ejecucion sin plan:
  `Ejecutar` queda deshabilitado. Evidencia:
  `08-current-dbt-canvas.png`. Limite: no prueba readiness profesional de
  origen, transformacion y destino.
- Canvas de solo lectura:
  grafo visible sin acciones de escritura. Evidencia:
  `05-read-only-canvas.png`. Limite: solo postura de permisos.
- Primer nodo en canvas vacio:
  catalogo tipado del canvas activo. Evidencia:
  `06-empty-canvas.png`, `07-empty-canvas-first-node.png`. Limite: no prueba
  flujo SQL completo.

### Casos no contemplados o condicionados

#### Flujo SQL profesional completo no esta probado

No existe todavia evidencia aceptable de que un usuario pueda empezar desde un
canvas vacio, explorar origenes reales con columnas y metadata, seleccionar las
tablas origen, crear la transformacion SQL, escoger destino exacto, planificar,
ejecutar y revisar evidencia sin depender de campos manuales o supuestos de
fixture. Ese trabajo queda fuera de este manual hasta que cierre
`SQL-CANVAS-UX-P0-PRO-FLOW-1`.

#### API, File y Stream no estan disponibles aun

El registro de objetos muestra `File`, `API` y `Stream`, pero los marca como no
disponibles. La slice actual solo permite registro real de `Database`.

![Tipos no disponibles](./assets/canvas-authoring-user-manual/11-dataobject-registry-connection.png)

#### `Proyecto > Importar` no conecta fuentes

El menu `Proyecto` solo contiene importacion y exportacion de snapshot. No debe
usarse para crear conexiones Postgres, REST, API o warehouse.

![Importar snapshot](./assets/canvas-authoring-user-manual/10-project-snapshot-menu.png)

#### No hay ejecucion sin plan valido

Cuando aparece `Plan requerido`, el boton `Ejecutar` permanece deshabilitado.
El usuario debe corregir el grafo o generar un plan antes de ejecutar.

![Plan requerido](./assets/canvas-authoring-user-manual/08-current-dbt-canvas.png)

#### Borrado contextual de aristas no demostrado en esta evidencia

La pasada de captura de 2026-06-02 hizo clic contextual sobre el elemento SVG
de la arista, pero no mostro `Eliminar conexion`. Por tanto este manual no lo
presenta como flujo validado. El borrado de nodos si aparece como menu
contextual independiente.

![Arista sin menu contextual visible](./assets/canvas-authoring-user-manual/12-edge-delete-context-menu.png)

#### Conectores externos reales siguen gobernados por rail

La UI abre `Add source` desde el canvas, pero la verdad de conexiones no debe
salir de fixtures locales ni de formularios ad hoc. Las conexiones deben venir
de rails protegidos como `ListWarehouseConnections`,
`ListWarehouseConnectionSourceObjects` e `ImportWarehouseSources`.

### Lista de comprobacion QA

- Abrir `/canvas` y comprobar que no se cargan datos de muestra sin proyecto.
- Confirmar que el menu contextual del canvas muestra solo acciones de canvas.
- Confirmar que no existe panel fijo `Project Resources` ni accion `Add data`
  en el modo base del grafo.
- Crear un nodo y verificar que queda visible en el mismo contexto del grafo.
- Confirmar que no existe un boton fijo `Anadir componente`; abrir el catalogo
  solamente con click derecho sobre una zona vacia.
- Seleccionar un nodo y revisar que el workbench contextual muestra datos del
  nodo real.
- Abrir `Add source` desde el menu contextual y comprobar conexiones, tablas,
  columnas, metadata y cesta de seleccion.
- Con una cesta alta, recorrerla con teclado y puntero; comprobar que la barra
  de desplazamiento es visible y que `Cancel` y `Attach sources to canvas` son
  alcanzables sin perder contexto.
- Abrir el nodo importado y verificar que `Connection` muestra nombre,
  proveedor e identificador completos, sin elipsis y sin secretos.
- Importar el mismo objeto fisico mediante dos conexiones y confirmar que no se
  deduplican entre si.
- Cambiar entre dos proyectos autorizados que compartan una ruta de archivo y
  un nombre de nodo; confirmar que B empieza limpio, crea su propio estado y que
  cada uno conserva su contenido al volver A -> B -> A.
- Repetir el selector con `Enter` o espacio en ingles y espanol; comprobar foco
  visible, `Project/Proyecto` actualizado y cero hallazgos axe graves.
- Abrir `Proyecto` y confirmar que `Importar` es snapshot, no conexion.
- Confirmar que `Ejecutar` no se habilita con `Plan requerido`.
- Pulsar `Codigo` en un nodo persistido y en uno generado; comprobar que cada
  accion abre el recurso exacto y nunca un archivo de respaldo no relacionado.
- Abrir `Mas acciones` y el menu contextual del nodo; confirmar que ninguno
  repite `Abrir codigo del nodo`.
- Borrar texto dentro del editor SQL con `Backspace` y `Delete`; comprobar que
  el nodo seleccionado no se elimina y que el Canvas conserva su grafo.
- Repetir la comprobacion de visibilidad a 1000x660, 1280x720 y 1440x900, con
  zoom de navegador al 100 % y al 200 %, sin texto truncado que oculte identidad
  ni controles fuera del alcance del scroll.
- Recorrer las acciones con teclado, comprobar foco visible, nombres
  accesibles, orden logico, cierre con `Escape` y ausencia de violaciones axe
  `serious` o `critical` en las superficies revisadas.
- Abrir `Codigo`, `Artefactos` y `Ejecuciones` y comprobar que cada vista muestra
  informacion alineada con el workspace activo.

#### Cobertura automatizada y comprobacion manual exigente

La prueba protegida de Source Import ejecuta 1440x900, 1280x720, 1000x660 y
500x330. Este ultimo tamano ejerce la presion de layout equivalente a ampliar al
200 % la base 1000x660. En cada tamano exige el dialogo y el Workbench de la
fuente completamente dentro del viewport, `Connection` visible con su identidad
exacta, scroll util, cierre y `Cancel` alcanzables, cero hallazgos axe
`serious`/`critical` y ninguna tercera fuente persistida al cancelar. No se usan
clicks forzados.

La misma prueba abre dos scopes concedidos por el servidor en una unica sesion,
cambia mediante el selector visible, crea B desde su estado vacio, reutiliza la
ruta `models/sources/src_public.yml` y el mismo objeto fisico, y vuelve a A. Las
lecturas autorizadas de borrador y archivo deben devolver A, B y A sin datos
cruzados. Ademas abre el YAML exacto en Project Code para B y A, rechaza
visualmente la identidad del otro scope y revisa selector/Workbench con axe.
Tambien vacia el SQL con teclado y exige que `Model 1` permanezca antes de
continuar la autoria; el Canvas suspende sus atajos globales de borrado mientras
el Workbench contextual posee el teclado.

El usuario exigente debe repetir ademas el 200 % con el zoom real del navegador,
porque el rasterizado, las preferencias de fuente y el escalado del sistema
operativo no quedan completamente representados por un viewport CSS reducido.
Si titulo, conexion, identificador, acciones o foco quedan ocultos, el resultado
es `NO-GO` aunque la prueba automatizada sea verde.

### Diagnostico rapido

| Sintoma                                  | Revision                                                         |
| ---------------------------------------- | ---------------------------------------------------------------- |
| Menu contextual no abre                  | Permisos de escritura y captura de click derecho en el canvas    |
| El nodo creado no persiste               | Respuesta del guardado de borrador y revision esperada           |
| No aparece `Add source`                  | Capacidad de source import y plugin `dvt.warehouse-source`       |
| `Proyecto > Importar` no descubre tablas | Es correcto: es importacion de snapshot                          |
| `Ejecutar` esta deshabilitado            | Revisar `Plan requerido` y generar plan valido                   |
| El inspector no muestra datos            | Seleccion activa y metadata del nodo en el borrador              |
| El menu de arista no aparece             | Flujo no validado por esta evidencia; registrar bug si reproduce |

### Evidencia de capturas

Las capturas `01` a `07` proceden de pruebas Cypress E2E del build `@dvt/web`
y representan proyectos ya seleccionados. Las capturas `08` a `13` se
generaron el 2026-06-02 con Chrome headless contra `http://localhost:5173/canvas`.

Estas capturas son evidencia de comportamiento UI, no sustituyen pruebas de
contrato ni validacion de backend.

> Section status: Accepted. Owner: Web. Colocation does not merge component responsibilities.

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

## 6. Añadir componentes

1. Abre el menú contextual del Canvas y selecciona **Añadir…**.
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

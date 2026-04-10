# 09. Wireframes And Layouts

These wireframes define shell and route-shape intent.

They are workbench grammar references, not pixel-perfect implementation specs.

## 9.1. Target Shell

```text
+--------------------------------------------------------------------------------+
| Top global bar: brand | tenant/project/env | health | quick switch | command  |
+-----------+---------------------------------------------------+----------------+
| Left rail | Route header                                      | Inspector      |
|           | title | subtitle | primary action | filters       | summary        |
|           +---------------------------------------------------+----------------+
|           | Local toolbar                                     | runtime        |
|           +---------------------------------------------------+----------------+
|           | Center workspace                                  | SQL / lineage  |
|           | graph | code | diff | artifacts | runs            | plugin panels  |
+-----------+---------------------------------------------------+----------------+
| Bottom diagnostics: events | logs | problems | output                          |
+--------------------------------------------------------------------------------+
```

## 9.2. Canvas Workbench

```text
+--------------------------------------------------------------------------------+
| Route header: Canvas                                                           |
+--------------------------------------------------------------------------------+
| Toolbar: layout | overlays | saved views | focus | contextual actions          |
+----------------+-----------------------------------------------+----------------+
| Explorer       | Tab strip: Graph | SQL | Diff | Artifacts     | Inspector      |
| nodes          +-----------------------------------------------+----------------+
| filters        | Active work area                              | contextual     |
| sections       | graph-first surface with optional review tabs | panels         |
+----------------+-----------------------------------------------+----------------+
| Bottom diagnostics                                                            |
+--------------------------------------------------------------------------------+
```

## 9.3. Runs Surface

```text
+--------------------------------------------------------------------------------+
| Route header: Runs                                                             |
+--------------------------------------------------------------------------------+
| Filters | search | status | time range                                         |
+--------------------------------+-----------------------------------------------+
| Run list or table              | Run detail                                    |
| id | status | env | duration   | summary cards                                 |
|                                | step table or timeline                         |
|                                | related nodes and artifacts                    |
|                                | diagnostics and errors                         |
+--------------------------------+-----------------------------------------------+
| Bottom diagnostics optional and synchronized with selected run                 |
+--------------------------------------------------------------------------------+
```

## 9.4. Plugins Surface

```text
+--------------------------------------------------------------------------------+
| Route header: Plugins                                                          |
+--------------------------------------------------------------------------------+
| Search | availability | capability | backend state                             |
+--------------------------------+-----------------------------------------------+
| Plugin catalog or table        | Plugin detail                                 |
| name | state | routes          | manifest and version                          |
| backend availability           | capabilities                                  |
|                                | views, overlays, panels                       |
|                                | executability and blocked reasons             |
+--------------------------------+-----------------------------------------------+
```

## 9.5. Object Placement Rule

- app-wide concern -> top bar
- task switch -> left rail
- route-wide concern -> route header or local toolbar
- route summary or secondary header band -> header stack, not the scroll-owned body
- selection-driven concern -> inspector
- output or diagnostics -> bottom panel

## 9.6. Interpretation Rule

If a proposed UI object does not have an obvious place in these wireframes, the
product probably needs a grammar decision before implementation.

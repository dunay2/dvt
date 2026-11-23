---
title: Model View Navigation
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-11-18
---

# Model View Navigation

## Ownership and reason to change

The existing Shell presentation family renders Model view shortcuts. The Model
workspace owns the selected Model, semantic transaction, SQL visibility and SQL
buffer. Shell receives only presentation posture and callbacks through the
existing Model tab contribution. It receives no semantic document, SQL text,
connection configuration or query client.

The initial gesture design is `GH-3944-MODEL-VIEW-NAVIGATION`, recorded under
[the governing issue](https://github.com/dunay2/dvt/issues/3944#issuecomment-6957606183).
The combined design is `GH-3944-MODEL-CATALOG-PRESENTATION`, admitted from this
component guide. It reuses `InspectCanvasNode` and `SelectCanvasWorkbenchTab`; SQL context,
compilation, row execution and Apply keep their existing ports and guards.

## Current state and decision

The previous pointer arbiter deferred inspection by 500 ms so a double-click
sequence could suppress inspection altogether. This made an ordinary inspection
wait even when the catalog had no double-click open action. The browser's native
sequence already distinguishes `click` and `dblclick`, but the first click occurs
before the browser knows whether another click will follow.

Inspect on the first admitted click immediately. A subsequent native `dblclick`
invokes a genuine Model-open callback once. Its first click may inspect. Sources
and catalog definitions without an open capability retain inspection and never
acquire a fallback creation or Code action. This supersedes the delayed,
mutually exclusive pointer policy in the previous catalog revision.

```mermaid
flowchart LR
  Gesture[Native gesture] --> Admission[Existing control and drag admission]
  Admission -->|First click| Inspect[InspectCanvasNode immediately]
  Admission -->|Double click| Open[Existing Model open]
  Rail[Semantic or SQL shortcut] --> Selected{Current eligible Model?}
  Selected -->|Yes| Context[Resolve occurrence context]
  Selected -->|No| Saved{Valid remembered Model?}
  Saved -->|Yes| Context
  Saved -->|No| First{First eligible visible Model?}
  First -->|Yes| Context
  First -->|No| Browse[Canvas and project Explorer]
  Context --> Tab[Protected Model tab contribution]
  Tab --> Semantic[Retained semantic workspace]
  Tab --> SQL[Retained logical SQL editor]
```

No timeout or document-wide pending-click listener is needed. Consumed drag
clicks, default-prevented gestures, secondary buttons and embedded controls remain
excluded. Native keyboard activation keeps the existing open/inspect capability.
Catalog drag/drop remains the only placement gesture; inspection creates no
instance and performs no semantic write.

Immediate inspection can cover a card near the right edge. One Canvas-scoped
capture adapter retains the first admitted card's DOM shell, capability and
Canvas identity. If the native second mousedown has `detail=2` and targets the
newly covering inspector, it prevents accidental field activation. Native
`dblclick` delegates once to the existing eligible Model-open callback. An
ordinary same-card double click retains its existing handler. New first clicks,
keyboard, context menus and drag clear the transient record. Changed Canvas,
disconnected or hidden cards cannot receive a late entry. Sources gain no open
fallback. The adapter owns only this native event handoff.

## Model view shortcuts

The left rail exposes Semantic view and SQL with distinct shared glyphs, localized
accessible labels/tooltips and common navigation tokens. Exactly one destination
is active: Canvas, project Code/Git, semantic Model or Model SQL. An unavailable
Canvas disables the Model shortcuts. An in-progress Apply of a SQL proposal
retains the existing protected Model replacement decision.
Visual Apply retains its existing lifecycle while presentation switches without
unmounting the semantic workspace.

Both shortcuts reveal the project Model list and activate the requested editor
surface on the same gesture. From another route, the existing Canvas workbench
entry adapter consumes the requested view after Canvas admission. Reuse an eligible current Model or restore the
last accepted Model for this workspace and Canvas. If neither is available,
use the first eligible visible entry in Explorer order, honoring its search.
An empty or unavailable catalog keeps its existing posture. The Explorer remains
available for choosing another entry. In Semantic view, an eligible Model row
opens or activates its editor tab through the existing guarded selection. A
Source or file-only row reports that it has no semantic editor and keeps the
current surface. The Semantic shortcut uses a selected semantic-capable Model
or the remembered or first eligible Model when the current inspection is
ineligible. Canvas navigation from either the rail or workspace tab exits
Model browsing. Canvas and SQL continue to route supported resource inspection
through the existing owner.

Accepting Model B updates an earlier inspection of A in the same scope.
Returning from another route therefore reopens B. A later explicit inspection
has priority on the next shortcut when the resource supports the chosen view.

The browser tab remembers one scoped Model identity across route changes and
reloads. Revalidate it against the current catalog at entry. An unavailable
preference, removed Model or scope mismatch follows the ordinary selection
order. Record only an accepted destination. A rejected replacement preserves
the prior Model. The governing decision is
[`GH-3969-MODEL-VIEW-DEFAULT-ENTRY`](https://github.com/dunay2/dvt/issues/3969#issuecomment-6985780529).

The catalog identity is the shared definition. Resolve a real existing instance
for its input context before entering the editor: reuse a matching current
session, use the sole instance, or ask the user to choose when several exist.
An unplaced Model remains its definition and retains its real incomplete-input
state. Never create an instance or silently choose the first of several contexts.
This distinction is required by the existing SQL query port and shared-definition
contract; display names do not determine identity.

The project Model list is the default Explorer presentation for every open
Model editor, including card double-click, the Semantic shortcut and an existing
Model tab. The shared search, result counts, Source facet and file-publication
adapter retain the same projection. The Model-local input palette stays available
through the Inputs control. It keeps its existing inspection and occurrence
actions for producers already admitted to the Model.

```mermaid
flowchart LR
  Entry[Rail, card or tab] --> Session[Selected Model session]
  Session --> Catalogue[Project Model list]
  Session --> Inputs[Model inputs]
  Catalogue -->|Select| Browse[Guarded Model navigation]
  Catalogue -->|Add working copy or drop| Compose[Existing composition command]
  Compose --> Draft[Private working definition and local Read]
```

Selecting a catalogue row creates nothing. Eligible rows expose the explicit
working-copy action and accept a drop inside the current editor, delegating to
the existing composition command under ADR-0070. Apply publishes the candidate
through the existing draft guard. Cancel discards it. File-only and unsupported
resources retain their established admission.

One presentation owner retains search, Models disclosure and expanded Model
details across the Canvas and Model views. Both surfaces consume the shared
Explorer's controlled presentation contract; placement and selection callbacks
remain with their existing owners. Workspace scope, Canvas and project-root
changes reset that presentation and reject obsolete callbacks. Keep only the
current scoped state, without a growing map of past projects. Opening a Model
or receiving its file projection must not clear the current filter.

`ListCanvasWorkbenchTabs` projects the open Model tabs in insertion order from
the current Canvas selection session. The tab identity is the authorized Model
context within the Canvas. Canvas and Code do not count against the limit of six
Model tabs. A seventh distinct Model leaves selection and tabs unchanged and
reports that a tab must be closed. An open Model is always selectable at capacity.
Switching workspace, environment, Canvas or project root discards the tab list.

```mermaid
flowchart LR
  Selection[Scoped Model selection] --> Tabs[ListCanvasWorkbenchTabs]
  Gesture[Open, select or close] --> Command[SelectCanvasWorkbenchTab]
  Command --> Admission{Current scope and capacity}
  Admission -->|Admitted| Guard[Existing Model leave decision when replacing or closing]
  Guard -->|Continue| Selection
  Admission -->|Capacity| Notice[Close a Model tab to continue]
```

`SelectCanvasWorkbenchTab` delegates protected replacement to the current Model
session. A visible Model owns the existing editor and its leave decision while
other open tabs retain identity and last view. Switching to Canvas or Code can
hide the current editor without replacing it. Closing an inactive tab removes
only that tab. Closing the current editor returns to Canvas if there is no
remaining Model and otherwise selects its nearest remaining neighbour when the
editor was visible. Draft refusal never adds or removes a tab.

A fresh session receives its initial view atomically; selecting the same
session reuses its published view callback. Semantic view collapses SQL and SQL
expands its retained logical editor. Shell receives presentation mode and callbacks
only, without owning SQL text, semantic drafts or authorization.
Focused local alias text remains pending when focus moves to a declared
workbench navigation control. Navigation and hiding a retained surface cannot
accept that alias through blur. Ordinary field blur retains its existing
acceptance behavior; explicit Close still discards the local input.
Presentation switching retains the SQL buffer, current Model and lower data
results. It never implicitly compiles, executes, applies, saves or discards.
Expanding SQL may prepare the existing protected logical-input context. SQL
generation, validation, row execution and Model Apply remain explicit actions.

The shared tab list divides the available shell width among tabs, truncates
long labels with their full titles available, and scrolls horizontally beneath
the minimum usable width. Each Model tab has a distinct tab and panel identity.

The workspace tab family owns revealing the selected tab and observing its
available width. The shell identity supplies context without inspecting child
DOM. One native pointer activation invokes the selection callback once, including
when focus enters the selected tab. Keyboard focus and pointer reactivation of
an already focused tab retain their existing selection behavior. Control-click
and secondary pointer gestures do not acquire a selection action. This refinement
uses the existing rails under `GH-3951-WORKSPACE-TAB-ACTIVATION`.

## Physical responsibilities

| Surface                      | Responsibility                                                      |
| ---------------------------- | ------------------------------------------------------------------- |
| `useCanvasNodeActivation`    | Admit native card inspection and Model-open gestures                |
| `useCanvasNativeNodeEntry`   | Preserve a native pair when inspection covers its second target     |
| `CanvasNodeShell`            | Compose the admitted node gesture with its existing menu and ports  |
| `ShellModelViewNavigation`   | Render the two view controls from published posture                 |
| `LeftNavigationRail`         | Compose direct destinations and exclusive active presentation       |
| `useCanvasModelBrowser`      | Resolve shortcut entry against the current project catalog          |
| `useCanvasModelSelection`    | Admit Model session changes and retain an accepted selection        |
| `useCanvasModelWorkspaceTab` | Publish current Model navigation callbacks                          |
| `CanvasModelEditor`          | Own semantic/SQL presentation and delegate existing draft lifecycle |

These responsibilities extend existing families and ports. They create no new
domain aggregate, backend endpoint or persistence schema.

## Native ownership reconciliation

The follow-up source is this committed component guide, admitted locally as
`GH-3944-MODEL-CATALOG-PRESENTATION`. Keep metadata updates bounded to the existing
Shell presentation, Canvas shell chrome, viewport and relational workbench
families. Source bindings must enumerate the actual implemented symbols and
their behavioral proof. Retired timer declarations must be removed rather than
kept as nonexistent evidence. Existing command/query identities and authorities
remain unchanged.

The global command/query catalog also changes the content digest of its existing
11 local and 16 imported declarations. Reconcile only those provenance leaves
through `CatalogReconciliation`, retaining all manifests and rail identities.
Its native storage scope is `planning_query_store.feature_mechanization_local_rails`,
`planning_query_store.command_query_rails` and
`planning_query_store.feature_mechanization_local_operations`. Component and rail
writes use their existing revision and binding-hash
compare-and-swap operators. No Planning DB import, rebuild or product schema
change is part of this slice.

## Corners and validation

- Immediate pointer inspection is observable before advancing a fake clock.
- Native click/click/dblclick inspects once and opens an eligible Model once.
- Embedded controls, cancelled/default-prevented clicks and consumed drag clicks
  dispatch neither inspection nor open. Drag retains its existing payload.
- Catalog activation and double click never create an occurrence.
- Model shortcuts are unavailable without a current owner; callbacks cannot target
  an obsolete owner after registration changes.
- A rail click opens the chosen surface for the current or valid saved Model.
  With neither, the first eligible visible result opens. Route return and
  browser reload exercise restoration. A stale or foreign identity cannot
  select another workspace's Model. An ambiguous definition still prompts
  for its occurrence, and cancelled replacement retains the current draft.
  Empty, no-match, loading and error states follow the project catalog.
- One active destination follows current Model/Code/SQL visibility. Keyboard and
  pointer invoke the same callbacks, with visible focus and accessible names.
- Filter text, result counts and detail disclosure survive Model entry and view
  switching; another workspace or Canvas cannot inherit them.
- Switching views retains the actual SQL buffer and data, with no implicit
  compilation, row query, Apply or save.
- The reported inspector layout shift requires rendered evidence before changing
  hidden-form retention. Closing must still discard local uncommitted inputs,
  reset edit mode, restore focus safely and prevent hidden query activity.

Use the existing card, catalog, Model navigation and SQL browser proofs. Keep
meaningful negative assertions and remove timer-specific assertions superseded by
the immediate native-event contract.

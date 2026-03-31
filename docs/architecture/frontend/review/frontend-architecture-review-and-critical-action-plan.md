---
title: Frontend Architecture Review and Critical Action Plan
status: Draft
owner: docs
last_reviewed: 2026-03-31
planning_type: review
---

# Frontend Architecture Review and Critical Action Plan

> Fowler-perspective analysis. Every finding is named, located, and paired with a named
> refactoring mechanic. The plan is executable in atomic steps; each step leaves the
> codebase shippable.

---

## 1. Purpose and approach

This document reviews `apps/web` against the target architecture in
`docs/architecture/frontend/` and produces an executable refactoring plan.

The approach follows Fowler's discipline from _Refactoring_ (2nd ed.) and _Patterns of
Enterprise Application Architecture_:

1. Catalog code smells by name with exact file locations.
2. Identify seams — safe cut points that allow incremental movement.
3. Specify a characterization-test strategy before touching anything.
4. Name the refactoring mechanic for each step.
5. Define a fitness function (done criterion) per task.
6. Draw the dependency DAG so tasks cannot be started out of order.
7. Ensure every intermediate state is green and shippable.

The goal is not to describe an ideal end-state. The goal is to describe the **next
concrete move** at each point in the sequence.

---

## 2. Sources reviewed

### Target architecture

- `docs/architecture/frontend/appshell/app-shell.md`
- `docs/architecture/frontend/frontend-state-ownership-and-persistence-policy.md`
- `docs/architecture/frontend/workspace/session/workspace-session-model-specification.md`
- `docs/architecture/frontend/workspace/workspace-domain-specification.md`
- `docs/architecture/frontend/views/workflow/workflow-graph-workbench-surfaces-and-operating-modes.md`
- `docs/architecture/frontend/dvt-frontend-architecture-introduction.md`
- `docs/architecture/frontend/runs/dvt-runs-frontend-architecture.md`

### Current implementation (measured)

| File                                      | Lines | Role                                   |
| ----------------------------------------- | ----- | -------------------------------------- |
| `apps/web/src/app/Root.tsx`               | 82    | Shell entry, providers, layout         |
| `apps/web/src/app/routes.ts`              | 73    | React Router v7, plugin-derived routes |
| `apps/web/src/app/stores/appStore.ts`     | 261   | Primary Zustand store, localStorage    |
| `apps/web/src/app/stores/sessionStore.ts` | 52    | Zustand, no persistence                |
| `apps/web/src/app/stores/index.ts`        | 202   | Legacy/parallel stores                 |
| `apps/web/src/app/plugins/registry.ts`    | 322   | Plugin contribution model              |

Test coverage: 4 test files across the entire frontend.

---

## 3. Code smell catalog

Smells are named using Fowler's taxonomy (_Refactoring_, 2nd ed., Chapter 3).

---

### 3.1 Large Class — `appStore.ts`

**Location:** `apps/web/src/app/stores/appStore.ts` (261 lines)

**Evidence:** A single Zustand store with localStorage persistence owns at least eight
independent concern clusters:

| Cluster            | Fields                                                              |
| ------------------ | ------------------------------------------------------------------- |
| Workspace identity | `tenantId`, `projectId`, `environmentId`, `branchRef`               |
| Shell layout       | nav state, panel visibility/sizes, console toggle, focus mode       |
| Canvas state       | viewport, node positions, overlays, selection                       |
| Tabs               | `activeTabs: Array<{ id, type, label, data?: any }>`, `activeTabId` |
| Run/plan context   | `currentPlan`, `currentRun`                                         |
| Inspector          | `inspectorNodeId`                                                   |
| Connection         | `connectionStatus`                                                  |
| Permissions        | `permissions`                                                       |

**Why it matters (Fowler):** A class (or store) with too many responsibilities is the
root cause of Divergent Change and Shotgun Surgery (see §3.4 and §3.5 below). Every
change to one concern risks breaking unrelated consumers.

---

### 3.2 Data Clump — workspace identity fields

**Location:**

- `apps/web/src/app/stores/appStore.ts` — `tenantId`, `projectId`, `environmentId`
- `apps/web/src/app/stores/sessionStore.ts` — same three fields plus `targetAdapter`
- `apps/web/src/app/stores/index.ts` — parallel `AppState` type repeating same fields

**Evidence:** Three stores own the same data group. `appStore.ts` imports `sessionStore`
but maintains its own copies of the identity fields instead of reading from `sessionStore`.

**Why it matters (Fowler):** A Data Clump that appears in three places will diverge. When
the canonical value is needed (e.g., for an API call), the caller must decide which store
to trust. This is where bugs live.

**Named refactoring:** _Move Field_ — the identity cluster belongs in `sessionStore.ts`
exclusively. `appStore.ts` must read from `sessionStore`, not shadow it.

---

### 3.3 Primitive Obsession — tab `data?: any` and string mode

**Location:**

- `apps/web/src/app/stores/appStore.ts` — `activeTabs: Array<{ id, type, label, data?: any }>`
- Mode represented as untyped string throughout

**Evidence:** The `data` field on each tab carries unknown shape. TypeScript cannot
validate tab content, discriminate on kind, or enforce completeness. Adding a new tab kind
requires searching all tab consumers by hand.

**Why it matters (Fowler):** Primitive Obsession prevents the compiler from doing
correctness work. Every tab consumer must defensively inspect `data` at runtime.

**Named refactoring:** _Replace Primitive with Object_ — introduce `WorkspaceTab` as a
discriminated union with typed `payload` per kind. Replace string mode with
`WorkspaceMode` enumerated type.

---

### 3.4 Divergent Change — `appStore.ts`

**Location:** `apps/web/src/app/stores/appStore.ts`

**Evidence:** `appStore.ts` must be modified to accommodate changes in at least four
independent dimensions:

- Shell layout preferences (panel sizes, nav state)
- Workspace session (project/env switches, mode changes)
- Run orchestration (new plan, run completion)
- Canvas interaction (node selection, viewport)

A change to any one of these concerns requires touching the same 261-line file and risks
regressing the others.

**Named refactoring:** _Extract Class_ four times — one extracted class per concern
cluster. The sequence is defined in §9 (Dependency DAG).

---

### 3.5 Shotgun Surgery — adding a tab kind

**Location:** Spans `appStore.ts`, `stores/index.ts`, and all tab-consuming components

**Evidence:** Adding a new tab kind currently requires:

1. Update `activeTabs` array type in `appStore.ts`
2. Update the parallel `TabsState` in `stores/index.ts`
3. Update every component that reads `tab.data` with a type guard
4. Update any persistence/restoration logic that serializes tabs

**Why it matters (Fowler):** Shotgun Surgery is the opposite of Divergent Change.
Where Divergent Change means one class changes for many reasons, Shotgun Surgery means
one change is scattered across many classes. Both are wrong; both point to the same
underlying missing abstraction: a well-bounded `WorkspaceSession` model.

---

### 3.6 Parallel Inheritance Hierarchies — `useAppStore` duplication

**Location:**

- `apps/web/src/app/stores/appStore.ts` — exports `useAppStore`
- `apps/web/src/app/stores/index.ts` — exports another `useAppStore` (202 lines)

**Evidence:** Two separate Zustand stores both named `useAppStore` exist. Consumers that
import from `stores/index.ts` get different state than consumers that import from
`stores/appStore.ts`. Which is authoritative is undocumented.

**Why it matters (Fowler):** This is a textbook Parallel Inheritance Hierarchy — two
parallel class trees that must evolve together. Whenever state moves in one store, the
other silently falls behind.

---

### 3.7 Feature Envy — shell components reading run/plan state

**Location:** `appStore.ts` persists `currentPlan` and `currentRun` in the shell store

**Evidence:** Shell-level components (header, nav, console) consume plan/run state from
the global shell store. This couples the shell frame lifecycle to the run execution
lifecycle. A run error could pollute shell state; a shell reset could clear run context.

**Named refactoring:** _Move Method / Move Field_ — `currentPlan` and `currentRun` move
out of the shell store and into a query-backed Runs read boundary. The shell reads a
projection (e.g., `runStatus`) through a well-defined selector or query hook, not raw
run internals and not browser-persisted runtime truth.

---

### 3.8 Incomplete Library Class — `sessionStore.ts` as partial session

**Location:** `apps/web/src/app/stores/sessionStore.ts` (52 lines)

**Evidence:** `sessionStore.ts` was introduced as the start of a `WorkspaceSession`
model. It owns `tenantId`, `projectId`, `environmentId`, `targetAdapter`, and
`buildRunContext`. It is the correct architectural nucleus. But it was never completed:
tabs, layout, mode, and selection remain in `appStore.ts`.

**Why it matters (Fowler):** This is an Incomplete Library Class — the right abstraction
was started but the code using it did not migrate. `appStore.ts` imports `sessionStore`
but duplicates rather than delegates.

**Named refactoring:** _Extend Session Store_ — this is not starting from scratch. It is
completing the abstraction that was already correctly started.

---

### 3.9 Conceptual Error — Mode conflation across two hierarchical levels

**Location:** `workspace-domain-specification.md §12`, `workflow-graph-workbench-surfaces-and-operating-modes.md §7`, `app-shell.md §6.3`

**Evidence:** Three documents use the term "mode" but describe two distinct, non-interchangeable concepts:

**Shell-level WorkspaceMode** — which product module is currently mounted in the shell. This is a routing/module concern:

```ts
// workspace-domain-specification.md §12
type WorkspaceMode = 'design' | 'dbt' | 'etl' | 'observer' | 'git' | 'run-analysis';
```

**Workbench-level WorkbenchMode** — how the user is interacting _within_ the graph workbench, regardless of which module is active. This is an interaction policy concern:

```ts
// workflow-graph-workbench-surfaces-and-operating-modes.md §7
type WorkbenchMode = 'edit' | 'navigate' | 'validate' | 'lineage' | 'observe' | 'review' | 'domain';
```

These operate at different levels of the hierarchy. A user can be in shell mode `'dbt'` while in workbench mode `'validate'`. They are orthogonal. The workspace-domain-specification conflates them by treating `WorkspaceMode` as the only concept.

**Why it matters:** The `WorkspaceSession` model currently holds `mode: WorkspaceMode` (shell level). If the workbench-level mode is added to the same session without distinguishing the two levels, the session becomes ambiguous and consumers will have to guess which level a given mode value belongs to.

**Correct resolution:** `WorkspaceSession` holds `moduleId: WorkspaceMode` (which shell module is mounted) separately from `workbenchMode: WorkbenchMode` (how the user is interacting inside that module). `workbenchMode` may be null or undefined when the active module does not use a graph workbench.

**Named refactoring:** _Rename Variable_ + _Introduce Parameter Object_ — separate the two mode concepts before implementing RF-06.

---

### 3.10 Missing design — cross-feature orchestration mechanism

**Location:** `workspace-domain-specification.md §11`, `dvt-frontend-architecture-introduction.md §11`, `workflow-graph-workbench-surfaces-and-operating-modes.md §11`

**Evidence:** Multiple documents state that feature surfaces should coordinate through the workspace domain — selecting a node should drive the inspector, artifact context, and run overlay simultaneously. The sequence diagram in the workflow workbench doc (§11) shows this is a design intent. But no document specifies the _mechanism_:

- Does the workbench call feature surfaces directly (imperative)?
- Does it publish a selection event that surfaces subscribe to (event bus)?
- Does it update a shared store that surfaces read via selectors (reactive)?
- Does a workspace application service orchestrate the cascade?

The interaction flow in the workflow workbench doc (§11) shows `W->>I: bind inspector to selected node` as a direct call, which contradicts the workspace-domain-spec's mediated model.

**Why it matters:** Without a specified mechanism, every developer working on a feature surface will choose a different one. Some will read from a shared store directly, some will call other features' internal APIs. This is the root cause of accidental coupling the architecture is trying to avoid.

**This is the largest unresolved design gap in the current architecture.** It is not addressed in this review's refactoring plan because it requires design decision first, implementation second. It must be decided before any feature surface work begins in earnest.

---

## 4. Seam map

A seam (Feathers, _Working Effectively with Legacy Code_, Chapter 4) is a place where
behavior can be changed without editing the code at that place. Seams are cut points for
safe incremental moves.

| Seam | Location                                        | Type        | Notes                                                                                                                     |
| ---- | ----------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| S1   | `stores/sessionStore.ts` — store boundary       | Object seam | New fields can be added here without touching `appStore.ts`                                                               |
| S2   | `stores/appStore.ts` — import of `sessionStore` | Link seam   | `appStore.ts` already imports session; reading identity from session store instead of own fields is a zero-UI-change move |
| S3   | `routes.ts` — plugin route composition          | Object seam | Routes are derived from plugin registry; new routes don't touch shell                                                     |
| S4   | `Root.tsx` — provider boundary                  | Object seam | Providers can be extracted into `AppProviders.tsx` without changing rendered output                                       |
| S5   | `plugins/registry.ts` — contribution model      | Object seam | Plugin contracts can be tightened without changing plugin implementations                                                 |
| S6   | `stores/index.ts` — re-export boundary          | Link seam   | `index.ts` can re-export from `appStore.ts` during migration; consumers see no change                                     |

---

## 5. Characterization test strategy

Before any structural move, write characterization tests (Feathers, Chapter 9) that pin
current behavior. These tests do not assert what _should_ be true; they assert what _is_
true today, so a regression is immediately visible.

### 5.1 Tests to write before touching stores

| Test | Location                      | What it pins                                       |
| ---- | ----------------------------- | -------------------------------------------------- |
| CT-1 | `stores/appStore.test.ts`     | `tenantId` survives localStorage persist/restore   |
| CT-2 | `stores/appStore.test.ts`     | `activeTabs` shape after add/remove                |
| CT-3 | `stores/appStore.test.ts`     | `currentPlan` and `currentRun` survive store reset |
| CT-4 | `stores/sessionStore.test.ts` | `buildRunContext` produces correct shape           |
| CT-5 | `stores/index.test.ts`        | `useTabsStore` add/remove pinned tabs              |
| CT-6 | `routes.test.ts`              | Plugin-derived routes include correct paths        |
| CT-7 | `Root.test.tsx`               | Root renders without crashing with mock providers  |

### 5.2 Strategy rule

No refactoring task (Phase 1 or later) starts until CT-1 through CT-7 are green.
The characterization tests are not deleted after the refactor; they become regression tests.

---

## 6. Gap analysis: current vs target

### 6.1 App Shell gap

| Dimension          | Target                               | Current                               | Gap      |
| ------------------ | ------------------------------------ | ------------------------------------- | -------- |
| State ownership    | Shell owns only layout/overlay state | Shell owns session, run, plan, canvas | Critical |
| Component boundary | `AppShell` distinct from providers   | Mixed in `Root.tsx`                   | High     |
| Module hosting     | Slot-based `ShellWorkspaceHost`      | Direct `Outlet` in layout             | Medium   |
| Overlay isolation  | `ShellOverlayRoot`                   | Inline in store/components            | Medium   |

### 6.2 Workspace Session gap

| Dimension               | Target                          | Current                                    | Gap      |
| ----------------------- | ------------------------------- | ------------------------------------------ | -------- |
| Canonical session model | One complete `WorkspaceSession` | `sessionStore.ts` partial nucleus          | Critical |
| Tabs ownership          | Session owns tabs               | `appStore.ts` + `index.ts` both own tabs   | Critical |
| Mode type safety        | `WorkspaceMode` discriminated   | Untyped string                             | High     |
| Layout persistence      | Separate from session           | Mixed in `appStore.ts` with `localStorage` | High     |
| Restoration model       | Explicit restore surface        | Implicit via localStorage key              | Medium   |

### 6.3 State ownership gap

| Cluster            | Should live in                       | Currently lives in                            | Gap      |
| ------------------ | ------------------------------------ | --------------------------------------------- | -------- |
| Workspace identity | `sessionStore.ts`                    | `sessionStore.ts` + `appStore.ts` (duplicate) | High     |
| Shell layout       | `shell.store.ts` (new)               | `appStore.ts`                                 | High     |
| Tabs               | `sessionStore.ts`                    | `appStore.ts` + `index.ts`                    | Critical |
| Run/plan context   | query-backed Runs read boundary      | `appStore.ts`                                 | High     |
| Canvas selection   | `canvas.store.ts` (new)              | `appStore.ts`                                 | Medium   |
| Modals             | `modal.store.ts` (new) or `index.ts` | `index.ts`                                    | Low      |

---

## 7. Refactoring playbook

Each entry specifies:

- **Mechanic** — Fowler technique name
- **Seam used** — which seam from §4
- **Atomic steps** — the minimum safe sequence
- **Fitness function** — concrete done criterion
- **Rollback** — how to undo if something goes wrong

---

### RF-01 — Write characterization tests

**Mechanic:** Characterization Tests (Feathers)
**Seam:** S1, S2, S6 (tests can be written before touching code)
**Prerequisite:** None
**Blocks:** RF-02 through RF-10

**Steps:**

1. Create `apps/web/src/app/stores/__tests__/appStore.test.ts`.
2. Render `appStore` with `create()` in isolation; pin `tenantId` persist/restore.
3. Pin `activeTabs` shape after add then remove.
4. Pin `currentPlan` and `currentRun` field names.
5. Create `apps/web/src/app/stores/__tests__/sessionStore.test.ts`.
6. Pin `buildRunContext` output shape.
7. Create `apps/web/src/app/routes.test.ts`; mount routes with mock plugins.
8. Create `apps/web/src/app/Root.test.tsx`; assert render without crash.

**Fitness function:** `pnpm --filter web test` passes green with all 8 characterization
tests present and asserting concrete shapes.

**Rollback:** Delete test files. Zero risk.

---

### RF-02 — Resolve the `useAppStore` naming collision

**Mechanic:** _Rename Function_ (Fowler §6.5)
**Seam:** S6 — `stores/index.ts` re-export boundary
**Prerequisite:** RF-01
**Blocks:** RF-03

**Steps:**

1. In `stores/index.ts`, rename the exported store to `useLegacyAppStore` and add a
   deprecation JSDoc comment.
2. Find all imports of `useAppStore` from `stores/index.ts` and update to
   `useLegacyAppStore`.
3. Verify `pnpm tsc --noEmit` passes.
4. `pnpm --filter web test` stays green.

**Fitness function:** TypeScript compiles with zero errors. No consumer imports both
`useAppStore` from `appStore.ts` and from `index.ts` without a clear rename.

**Rollback:** Revert the rename in `index.ts` and update imports back.

---

### RF-03 — Move identity fields: `appStore` reads from `sessionStore`

**Mechanic:** _Move Field_ (Fowler §8.2), using seam S2
**Seam:** S2 — `appStore.ts` already imports `sessionStore`
**Prerequisite:** RF-02

**Steps:**

1. In `appStore.ts`, remove the local declarations of `tenantId`, `projectId`,
   `environmentId`, `targetAdapter` from the state shape.
2. Add selectors that delegate to `sessionStore`:
   ```ts
   // In AppStore consumers that need identity:
   const tenantId = useSessionStore((s) => s.tenantId);
   ```
3. Update every `useAppStore` call-site that reads `tenantId | projectId | environmentId`
   to read from `useSessionStore` instead.
4. Update localStorage persistence in `appStore.ts` to exclude the moved fields.
5. `pnpm --filter web test` passes; characterization test CT-1 still pins the
   persist/restore of identity fields (now in `sessionStore`).

**Fitness function:** `grep -r 'appStore.*tenantId\|tenantId.*appStore' apps/web/src`
returns zero results. `pnpm tsc --noEmit` passes.

**Rollback:** Restore removed fields in `appStore.ts` state shape and revert call-site
changes.

---

### RF-04 — Replace Primitive with Object: `WorkspaceTab` discriminated union

**Mechanic:** _Replace Primitive with Object_ (Fowler §7.3)
**Seam:** S1 — `sessionStore.ts` is the destination for tabs
**Prerequisite:** RF-01 (characterization tests pin current tab shape)

**Steps:**

1. Define `WorkspaceTab` in a new file
   `apps/web/src/app/types/WorkspaceTab.ts`:

   ```ts
   // Field names and kind values must match workspace-domain-specification.md §12
   // and workspace-session-model-specification.md §14.
   // 'git-diff' not 'diff'; 'artifact' and 'observer' are required kinds.
   export type WorkspaceTabKind =
     | 'graph'
     | 'artifact'
     | 'run'
     | 'git-diff'
     | 'lineage'
     | 'observer';

   export type WorkspaceTab = {
     tabId: string;
     kind: WorkspaceTabKind;
     title: string;
     payloadRef: string; // opaque ref, resolved by kind handler
     isDirty: boolean;
     isPinned: boolean;
   };
   ```

2. In `appStore.ts`, replace `activeTabs: Array<{ id, type, label, data?: any }>` with
   `activeTabs: WorkspaceTab[]`.
3. Fix all type errors from the compiler. Do not cast with `as any`.
4. Update characterization test CT-2 to assert the new shape.
5. Update `useLegacyAppStore` in `index.ts` similarly or mark `TabsState` as
   deprecated toward `WorkspaceTab`.

**Fitness function:** `grep -r 'data?: any' apps/web/src` returns zero results.
`pnpm tsc --noEmit` passes. CT-2 is green.

**Rollback:** Revert `WorkspaceTab.ts` and restore old tab shape in `appStore.ts`.

---

### RF-05 — Extract Class: `shell.store.ts` from `appStore.ts`

**Mechanic:** _Extract Class_ (Fowler §7.5)
**Seam:** S1
**Prerequisite:** RF-03 (identity fields removed from `appStore`), RF-04 (tabs typed)

**Steps:**

1. Create `apps/web/src/app/stores/shell.store.ts`.
2. Move these fields from `appStore.ts` into `shell.store.ts`:
   - Nav open/closed state
   - Explorer panel visibility and size
   - Inspector visibility and size
   - Console visibility and size
   - Focus mode flag
   - Connection status
   - Global overlay flags
3. Wire `shell.store.ts` with `localStorage` persistence for layout preferences only.
4. For each moved field, update every consumer from `useAppStore(s => s.navOpen)` to
   `useShellStore(s => s.navOpen)`.
5. `pnpm --filter web test` passes.

**Fitness function:** `appStore.ts` no longer contains any of the moved field names.
`shell.store.ts` owns them exclusively. `pnpm tsc --noEmit` passes. Total lines removed
from `appStore.ts` ≥ 60.

**Rollback:** Move fields back into `appStore.ts` and delete `shell.store.ts`.

---

### RF-06 — Extract Class: complete `sessionStore.ts` as `WorkspaceSession`

**Mechanic:** _Extract Class_ (Fowler §7.5), extending the incomplete library class
**Seam:** S1
**Prerequisite:** RF-03, RF-04, RF-05

This is the central refactoring. `sessionStore.ts` is already the correct nucleus. The
task is to complete it by migrating the remaining session fields from `appStore.ts`.

> **Before starting RF-06:** resolve the mode conflation identified in §3.9. The session
> must own two separate mode fields: `moduleId` (which shell module is mounted) and
> `workbenchMode` (interaction policy inside the graph workbench). Do not merge them.

**Steps:**

1. Add to `sessionStore.ts`:

   ```ts
   // Shell-level module identity — which product perspective is active
   // Must match workspace-domain-specification.md §12
   type WorkspaceMode = 'design' | 'dbt' | 'etl' | 'observer' | 'git' | 'run-analysis';

   // Workbench-level interaction mode — only meaningful inside graph workbench
   // Must match workflow-graph-workbench-surfaces-and-operating-modes.md §7
   type WorkbenchMode =
     | 'edit' | 'navigate' | 'validate'
     | 'lineage' | 'observe' | 'review' | 'domain';

   // New state fields
   moduleId: WorkspaceMode;
   workbenchMode: WorkbenchMode | null;  // null when active module has no graph workbench
   tabs: WorkspaceTab[];
   activeTabId: string | null;
   layout: WorkspaceLayout;     // panel sizes for session restoration
   selection: SelectionContext | null;
   updatedAt: string;
   ```

2. Move `activeTabs` and `activeTabId` from `appStore.ts` to `sessionStore.ts`.
3. Move mode (currently untyped string) from wherever it lives to `sessionStore.ts`,
   split into `moduleId` and `workbenchMode`.
4. Update all consumers from `useAppStore(s => s.activeTabs)` to
   `useSessionStore(s => s.tabs)`.
5. Remove moved fields from `appStore.ts`.
6. `pnpm --filter web test` passes.

**Fitness function:** `sessionStore.ts` owns all session concerns.
`appStore.ts` no longer contains `activeTabs`, `activeTabId`, or mode fields.
CT-2 (tab shape) and CT-4 (`buildRunContext`) are green. `pnpm tsc --noEmit` passes.

**Rollback:** Move fields back to `appStore.ts`; revert `sessionStore.ts` additions.

---

### RF-07 — Extract query-backed Runs state boundary from `appStore.ts`

**Mechanic:** _Extract Class_ (Fowler §7.5), _Feature Envy_ correction
**Seam:** S1
**Prerequisite:** RF-05 (shell extracted)

**Steps:**

1. Create a query-backed Runs read boundary such as `runs.queries.ts` or an
   equivalent capability query module for `currentPlan` and `currentRun`
   projections.
2. Move `currentPlan` and `currentRun` out of `appStore.ts`.
3. Update all consumers that read plan/run state from `appStore` to read from
   the Runs query layer or a bounded Runs-local selector.
4. Remove browser persistence of `currentPlan` and `currentRun` from the shell
   store. Runtime truth must remain query-backed and non-authoritative in local
   browser persistence.
5. `pnpm --filter web test` passes. CT-3 is updated to target the query-backed
   Runs boundary instead of shell persistence.

**Fitness function:** `appStore.ts` contains no references to `currentPlan` or
`currentRun`. Runs truth is query-backed rather than shell-persisted.
`pnpm tsc --noEmit` passes.

**Rollback:** Move fields back to `appStore.ts`; remove the extracted Runs
query boundary.

---

### RF-08 — Extract Component: `AppProviders` and `AppShell` from `Root.tsx`

**Mechanic:** _Extract Function_ applied to React components (Fowler §6.1)
**Seam:** S4 — provider boundary in `Root.tsx`
**Prerequisite:** RF-01

**Steps:**

1. Create `apps/web/src/app/AppProviders.tsx`:
   ```tsx
   export function AppProviders({ children }: { children: React.ReactNode }) {
     return (
       <QueryClientProvider client={queryClient}>
         {/* other providers */}
         {children}
       </QueryClientProvider>
     );
   }
   ```
2. Create `apps/web/src/app/AppShell.tsx` containing the layout: `TopAppBar`,
   `LeftNavigation`, `ResizablePanelGroup`, `Console`, `Outlet`. This is an extraction
   of what `Root.tsx` currently renders — no visual change.
3. Reduce `Root.tsx` to:
   ```tsx
   export function Root() {
     return (
       <AppProviders>
         <AppShell />
       </AppProviders>
     );
   }
   ```
4. Run CT-7 (Root renders without crash). It must still pass.

**Fitness function:** `Root.tsx` is ≤ 20 lines. `AppShell.tsx` owns the layout.
`AppProviders.tsx` owns providers. Visual output is byte-for-byte identical.
`pnpm --filter web test` passes.

**Rollback:** Inline `AppProviders` and `AppShell` back into `Root.tsx`; delete the two
new files.

---

### RF-09 — Deprecate and drain `stores/index.ts`

**Mechanic:** _Strangler Fig Application_ (Fowler, _Patterns of Enterprise Application
Architecture_) — new stores grow while legacy store shrinks to zero consumers
**Seam:** S6
**Prerequisite:** RF-02, RF-05, RF-06, RF-07

After RF-05 through RF-07 are complete, `stores/index.ts` holds:

- `useLegacyAppStore` — identity fields now in `sessionStore`, tabs in `sessionStore`,
  shell in `shell.store`, run truth in the Runs query boundary
- `useCanvasStore` — canvas state (not yet extracted; scope below)
- `useTabsStore` — tabs now owned by `sessionStore`
- `useModalStore` — 6 modal states

**Steps:**

1. Delete `useTabsStore` from `index.ts` (consumers migrated to `sessionStore` in RF-06).
2. Delete `useLegacyAppStore` from `index.ts` (all fields migrated).
3. Move `useModalStore` into a new `modal.store.ts` or keep in `index.ts` pending further
   cleanup — mark with a `// TODO: extract to modal.store.ts` comment.
4. Move `useCanvasStore` into a new `canvas.store.ts`.
5. If `index.ts` has zero exports, delete it; update any barrel imports.
6. `pnpm tsc --noEmit` passes.

**Fitness function:** `stores/index.ts` either does not exist or exports only
`useCanvasStore` and `useModalStore` pending their dedicated migration tasks.
`pnpm tsc --noEmit` passes. Zero TypeScript errors.

**Rollback:** Restore removed stores from git; revert consumer import changes.

---

### RF-10 — Tighten the plugin contribution contract

**Mechanic:** _Introduce Parameter Object_ (Fowler §6.8) applied to plugin contributions
**Seam:** S5
**Prerequisite:** RF-08 (AppShell exists as explicit boundary)

**Steps:**

1. In `plugins/registry.ts`, define a `WorkspaceModuleContract` interface that
   makes the shell boundary explicit:
   ```ts
   interface WorkspaceModuleContract {
     id: string;
     title: string;
     mountPath: string;
     resolveMode: () => WorkspaceMode;
     getShellConfig?: () => ShellConfigContribution;
     getCommands?: () => CommandContribution[];
   }
   ```
2. Migrate the three existing plugins (dbt, monitoring, cost) to satisfy
   `WorkspaceModuleContract`. This is a narrowing of what they already do.
3. Update `AppShell.tsx` to read from `WorkspaceModuleContract`, not raw plugin
   contribution shape.
4. CT-6 (plugin-derived routes) is still green.

**Fitness function:** All three plugins satisfy `WorkspaceModuleContract` without type
casts. `pnpm tsc --noEmit` passes.

**Rollback:** Revert `WorkspaceModuleContract`; restore prior plugin consumption pattern.

---

## 8. Fitness functions per phase (aggregate)

These are the observable done criteria that determine when a phase is complete.
Failing any criterion means the phase is not done.

### Phase 0 — Characterization tests

| Criterion                          | Command                  |
| ---------------------------------- | ------------------------ |
| All 8 characterization tests green | `pnpm --filter web test` |
| TypeScript compiles clean          | `pnpm tsc --noEmit`      |

### Phase 1 — Store boundary isolation (RF-02 through RF-07)

| Criterion                                   | Command or assertion                                         |
| ------------------------------------------- | ------------------------------------------------------------ |
| Zero `data?: any` in `apps/web/src`         | `grep -r 'data\?: any' apps/web/src` → 0                     |
| `tenantId` not in `appStore` state shape    | `grep -n 'tenantId' apps/web/src/app/stores/appStore.ts` → 0 |
| `activeTabs` not in `appStore` state shape  | same grep                                                    |
| `currentPlan` not in `appStore` state shape | same grep                                                    |
| All characterization tests still green      | `pnpm --filter web test`                                     |
| TypeScript compiles clean                   | `pnpm tsc --noEmit`                                          |
| `appStore.ts` is ≤ 80 lines                 | `wc -l apps/web/src/app/stores/appStore.ts`                  |

### Phase 2 — Shell component extraction (RF-08)

| Criterion                                   | Command or assertion              |
| ------------------------------------------- | --------------------------------- |
| `Root.tsx` is ≤ 20 lines                    | `wc -l apps/web/src/app/Root.tsx` |
| `AppShell.tsx` and `AppProviders.tsx` exist | file check                        |
| CT-7 (Root renders) is green                | `pnpm --filter web test`          |

### Phase 3 — Legacy store drain (RF-09, RF-10)

| Criterion                                           | Command or assertion     |
| --------------------------------------------------- | ------------------------ |
| `stores/index.ts` exports zero deprecated stores    | manual or grep           |
| Plugin registry satisfies `WorkspaceModuleContract` | `pnpm tsc --noEmit`      |
| All characterization tests still green              | `pnpm --filter web test` |
| Zero TypeScript errors                              | `pnpm tsc --noEmit`      |

---

## 9. Dependency DAG

Tasks that are not connected may be parallelized. Tasks with an arrow must complete left
before right can start.

```
RF-01 (characterization tests)
  ├─► RF-02 (rename collision)
  │     └─► RF-03 (move identity fields)
  │           └─► RF-05 (extract shell.store)
  │                 └─► RF-07 (extract query-backed Runs boundary)
  │                       └─► RF-09 (drain index.ts)
  │
  ├─► RF-04 (WorkspaceTab type)
  │     └─► RF-06 (complete sessionStore)
  │           └─► RF-09 (drain index.ts)
  │
  └─► RF-08 (extract AppProviders + AppShell)
        └─► RF-10 (tighten plugin contract)
```

RF-09 can start only when RF-05, RF-06, and RF-07 are all complete.
RF-10 can start only when RF-08 is complete.
RF-03 and RF-04 can run in parallel after RF-01 and RF-02 respectively.

---

## 10. Observable intermediate states

Every step in the playbook must leave the code in a shippable state. This table
identifies the visible condition after each RF task is done.

| After | What is visible and stable                                                   |
| ----- | ---------------------------------------------------------------------------- |
| RF-01 | 8 new tests pass. Nothing structural has changed.                            |
| RF-02 | `useLegacyAppStore` appears in `index.ts`. Consumers updated. CI green.      |
| RF-03 | `sessionStore` is the sole owner of identity. `appStore` is smaller.         |
| RF-04 | `WorkspaceTab` type exists. `data?: any` eliminated.                         |
| RF-05 | `shell.store.ts` exists. Shell layout state moved. `appStore` shorter.       |
| RF-06 | `sessionStore` owns tabs, mode, layout. Complete `WorkspaceSession` visible. |
| RF-07 | Runs query boundary exists. Plan/run no longer in shell store.               |
| RF-08 | `Root.tsx` is 20 lines. `AppShell.tsx` is the explicit frame.                |
| RF-09 | `stores/index.ts` exports only canvas/modal pending their cleanup.           |
| RF-10 | All three plugins satisfy typed contract. Shell boundary is explicit.        |

---

## 11. Risks and mitigations

- `Consumers break when moving fields` (`Shotgun Surgery`):
  write characterization tests first and move one field group at a time.
- `sessionStore becomes new god store` (`Large Class`, displaced):
  RF-06 keeps session concerns only. Shell state goes to `shell.store`; Runs
  truth goes to the query boundary.
- `index.ts never gets drained` (`Lava Flow`, Cunningham):
  RF-09 remains a named task with a fitness function and new imports from
  `index.ts` should be blocked.
- `WorkspaceModuleContract over-designed` (`Speculative Generality`):
  the contract includes only what the existing plugins already provide.
- `Canvas extraction breaks @xyflow/react integration` (`Divergent Change`):
  defer canvas extraction until Phase 3 is complete.
  | App regresses visually between steps | — | CT-7 (Root renders) provides a smoke gate. Add a Playwright smoke test before RF-05. |

---

## 12. What is explicitly out of scope in this plan

The following are valid future work but are not scheduled here. Starting them before
completing RF-01 through RF-10 would increase drift, not reduce it:

- Canvas state extraction (`useCanvasStore` — complex `@xyflow/react` integration)
- Modal store extraction (low impact, not a blocker)
- Microfrontend or module federation adoption
- Full session persistence with backend (serializing `WorkspaceSession` to server)
- Replacing the existing plugin routing model
- Observability instrumentation (shell-level traces, route transition tracking)
- Error boundary layers (valuable, but only after store boundaries are stable)

### Missing architecture documents that must be produced before feature work

The following documents are referenced as "next steps" in the workspace specs but do not
exist yet. They must exist before any feature module is built, or each team will invent
its own answers:

| Missing doc                  | Needed for                                           | Referenced in                             |
| ---------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `workspace-tab-model.md`     | Typed tab lifecycle, deduplication rules             | workspace-session-model-specification §18 |
| `selection-context-model.md` | Cross-feature selection mechanism                    | workspace-domain-specification §17        |
| `workspace-layout-model.md`  | Layout persistence and restoration rules             | workspace-domain-specification §17        |
| `workspace-orchestration.md` | **Cross-feature coordination mechanism** (see §3.10) | workspace-domain-specification §17        |

The `workspace-orchestration.md` is the most critical missing document. Without it,
the coordination mechanism (§3.10) remains undefined and each developer will choose a
different pattern.

---

## 13. Execution order summary

```
Sprint A — Safety net and foundation
  RF-01: Write characterization tests          ← start here, blocks everything
  RF-02: Resolve useAppStore naming collision  ← parallel with RF-04 after RF-01
  RF-04: WorkspaceTab discriminated union      ← parallel with RF-02 after RF-01

Sprint B — Store boundary isolation
  RF-03: Move identity fields                  ← after RF-02
  RF-05: Extract shell.store.ts                ← after RF-03
  RF-06: Complete sessionStore                 ← after RF-04 and RF-05
  RF-07: Extract query-backed Runs boundary    ← after RF-05

Sprint C — Legacy drain and shell formalization
  RF-08: Extract AppProviders + AppShell       ← after RF-01 (independent)
  RF-09: Drain stores/index.ts                 ← after RF-05 + RF-06 + RF-07
  RF-10: Tighten plugin contract               ← after RF-08
```

Total observable intermediate states: 10. Every one is green and shippable.

---

## 14. References

- Fowler, _Refactoring: Improving the Design of Existing Code_ (2nd ed., 2018)
  — Chapters 3 (Smells), 6–8 (Mechanics), 12 (Dealing with Inheritance)
- Feathers, _Working Effectively with Legacy Code_ (2004)
  — Chapters 4 (Seams), 9 (Characterization Tests)
- Fowler, _Patterns of Enterprise Application Architecture_ (2002) — Strangler Fig

### Architecture documents reviewed

| Doc                                                                       | Status            | Key contribution to this review                                         |
| ------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| `appshell/app-shell.md`                                                   | Draft             | Component model, shell contract, folder structure                       |
| `workspace/session/workspace-session-model-specification.md`              | Draft             | `WorkspaceSession` invariants, `WorkspaceTab` field names               |
| `workspace/workspace-domain-specification.md`                             | Draft             | `WorkspaceMode` values, `WorkspaceTabKind` values, DDD folder structure |
| `views/workflow/workflow-graph-workbench-surfaces-and-operating-modes.md` | Draft             | `WorkbenchMode` (second mode level, §3.9), surface matrix               |
| `dvt-frontend-architecture-introduction.md`                               | Draft             | Validates monolithic store as named anti-pattern                        |
| `runs/dvt-runs-frontend-architecture.md`                                  | Draft             | Validates React Query for run state (RF-07)                             |
| `dvt_frontend_architecture_blueprint.md`                                  | Historical sketch | Not authoritative — predates the above docs                             |
| `astproposal.md`                                                          | Design note       | DSL authoring UX advisory, not architecture — consider relocating       |

### Current implementation

- `apps/web/src/app/Root.tsx`
- `apps/web/src/app/stores/appStore.ts`, `sessionStore.ts`, `stores/index.ts`
- `apps/web/src/app/plugins/registry.ts`
- `apps/web/src/app/routes.ts`

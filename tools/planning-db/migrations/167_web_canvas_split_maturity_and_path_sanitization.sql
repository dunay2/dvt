-- Close maturity and duplicate-path gaps introduced by the Canvas residual
-- split. Child components must have unique architecture repo_path anchors and
-- explicit observability posture, even when component-level browser telemetry
-- is not applicable.

with repo_path_repoints (component_id, repo_path) as (
  values
    (
      'SYS-WEB-CANVAS-SHELL-CHROME',
      'apps/web/src/app/views/canvas/canvasShellChromeStateBuilder.ts'
    ),
    (
      'SYS-WEB-CANVAS-CONTEXT-MENU-CORE',
      'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx'
    ),
    (
      'SYS-WEB-CANVAS-DIALOGS-RECOVERY-PLAYGROUND',
      'apps/web/src/app/views/canvas/canvasModalHostPropsBuilder.ts'
    ),
    (
      'SYS-WEB-CANVAS-INSPECTOR-AUTHORING',
      'apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts'
    )
)
update architecture.component component
set
  repo_path = repo_path_repoints.repo_path,
  updated_at = now()
from repo_path_repoints
where component.component_id = repo_path_repoints.component_id;

with canvas_components (component_id, signal_name) as (
  values
    (
      'SYS-WEB-CANVAS-DRAFT-LIFECYCLE',
      'Component-level browser telemetry is not applicable; draft lifecycle health is exposed through recovery states and required draft tests.'
    ),
    (
      'SYS-WEB-CANVAS-SHELL-CHROME',
      'Component-level browser telemetry is not applicable; shell chrome health is exposed through Canvas route UI states and required shell tests.'
    ),
    (
      'SYS-WEB-CANVAS-AUTHORING-DOCUMENT',
      'Component-level browser telemetry is not applicable; authoring document behaviour is validated through create-document and first-authoring tests.'
    ),
    (
      'SYS-WEB-CANVAS-EXECUTION-RUNS',
      'Component-level browser telemetry is not applicable; execution and run feedback is visible through Canvas run UI states and required execution tests.'
    ),
    (
      'SYS-WEB-CANVAS-SOURCE-PREVIEW-TRANSFORMATION',
      'Component-level browser telemetry is not applicable; source preview and transformation behaviour is validated through preview and validation tests.'
    ),
    (
      'SYS-WEB-CANVAS-INSPECTOR-AUTHORING',
      'Component-level browser telemetry is not applicable; inspector authoring state is visible through inspector UI and required authoring tests.'
    ),
    (
      'SYS-WEB-CANVAS-GRAPH-LIFECYCLE',
      'Component-level browser telemetry is not applicable; graph lifecycle health is visible through graph surface states and required graph tests.'
    ),
    (
      'SYS-WEB-CANVAS-COPY-LOCALIZATION',
      'Component-level browser telemetry is not applicable; copy catalog behaviour is validated through required copy tests.'
    ),
    (
      'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
      'Component-level browser telemetry is not applicable; node and edge authoring health is validated through admission and handler tests.'
    ),
    (
      'SYS-WEB-CANVAS-PROJECT-SNAPSHOT',
      'Component-level browser telemetry is not applicable; project snapshot behaviour is validated through snapshot tests.'
    ),
    (
      'SYS-WEB-CANVAS-DIALOGS-RECOVERY-PLAYGROUND',
      'Component-level browser telemetry is not applicable; dialog, recovery, and playground states are visible in UI and covered by required tests.'
    ),
    (
      'SYS-WEB-CANVAS-CONTEXT-MENU-CORE',
      'Component-level browser telemetry is not applicable; context menu state is visible in UI and covered by required presenter and view tests.'
    ),
    (
      'SYS-WEB-CANVAS-CONTROLLER-INTERACTION',
      'Component-level browser telemetry is not applicable; controller interaction health is validated through controller, mutation, layout, and selection tests.'
    )
)
insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-COMPONENT-TELEMETRY',
  component_id,
  signal_name,
  'dashboard',
  true,
  'not_applicable'
from canvas_components
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

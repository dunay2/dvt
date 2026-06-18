-- Close integrity gaps found after mapping the Web root filesystem.
-- Old or nonfunctional files are not inferred here; they remain active until
-- source-drift or component-integrity evidence supports an explicit DB
-- deprecation row.

update architecture.component
set
  repo_path = case component_id
    when 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD'
      then 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx'
    when 'SYS-WEB-VIEW-CANVAS'
      then 'apps/web/src/app/views/Canvas.architecture.test.ts'
    else repo_path
  end,
  updated_at = now()
where component_id in (
  'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD',
  'SYS-WEB-VIEW-CANVAS'
);

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values
  (
    'OBS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-COMPONENT-TELEMETRY',
    'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH',
    'Component-level browser telemetry is not applicable; required Canvas presentation and architecture tests prove observable UI states.',
    'dashboard',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-CANVAS-GRAPH-SURFACE-COMPONENT-TELEMETRY',
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'Component-level browser telemetry is not applicable; graph surface state is exposed through Canvas route UI and required architecture tests.',
    'dashboard',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-CANVAS-GRAPH-VIEWPORT-COMPONENT-TELEMETRY',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
    'Component-level browser telemetry is not applicable; viewport behaviour is exposed through route UI and required viewport tests.',
    'dashboard',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-CANVAS-NODE-WORKBENCH-COMPONENT-TELEMETRY',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'Component-level browser telemetry is not applicable; node workbench state is exposed through inspector UI and required presentation tests.',
    'dashboard',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-CANVAS-SHELL-MAIN-PANEL-COMPONENT-TELEMETRY',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'Component-level browser telemetry is not applicable; shell panel state is exposed through Canvas route UI and required shell tests.',
    'dashboard',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-SERVICES-RUNS-COMPONENT-TELEMETRY',
    'SYS-WEB-SERVICES-RUNS',
    'Component-level browser telemetry is not applicable; run service adapter behaviour is validated through required API mapping tests.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-SERVICES-WORKSPACE-COMPONENT-TELEMETRY',
    'SYS-WEB-SERVICES-WORKSPACE',
    'Component-level browser telemetry is not applicable; workspace service adapter behaviour is validated through required port and projection tests.',
    'log',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-VIEW-CANVAS-COMPONENT-TELEMETRY',
    'SYS-WEB-VIEW-CANVAS',
    'Component-level browser telemetry is not applicable; Canvas route health is exposed through user-visible route states and required architecture tests.',
    'dashboard',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES-COMPONENT-TELEMETRY',
    'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES',
    'Component-level browser telemetry is not applicable; residual Canvas surfaces expose recoverable UI states and required presentation tests.',
    'dashboard',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-VIEW-CANVAS-ROUTE-COMPONENT-TELEMETRY',
    'SYS-WEB-VIEW-CANVAS-ROUTE',
    'Component-level browser telemetry is not applicable; Canvas route shell state is exposed through route smoke tests and visible recovery states.',
    'dashboard',
    true,
    'not_applicable'
  ),
  (
    'OBS-WEB-VIEWS-RUNS-COMPONENT-TELEMETRY',
    'SYS-WEB-VIEWS-RUNS',
    'Component-level browser telemetry is not applicable; Runs route states are visible in the UI and covered by required presentation tests.',
    'dashboard',
    true,
    'not_applicable'
  )
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

-- Split the broad Web UI primitives component into design-system responsibility
-- leaves. These shadcn-style files are active primitive implementation assets;
-- old or nonfunctional primitives require explicit deprecation evidence before
-- they can be marked deprecated.

drop table if exists pg_temp.web_ui_primitive_leaf_map;
drop table if exists pg_temp.web_ui_primitive_dependency_map;

create temporary table web_ui_primitive_leaf_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  invariant text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  owns text[] not null,
  test_paths text[] not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null,
  port_name text not null,
  port_kind text not null,
  negative_tests text[] not null,
  maturity_score numeric not null,
  criticality text not null,
  relation_suffix text not null
);

create temporary table web_ui_primitive_dependency_map (
  source_component_id text not null,
  target_component_id text not null,
  relation_id text primary key,
  contract_id text not null,
  failure_mode text not null
);

insert into web_ui_primitive_leaf_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  invariant,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  owns,
  test_paths,
  test_kind,
  coverage_level,
  validation_command,
  port_name,
  port_kind,
  negative_tests,
  maturity_score,
  criticality,
  relation_suffix
)
values
  (
    'SYS-WEB-UI-PRIMITIVES-FOUNDATION',
    'Web UI primitive foundation',
    'WebUiPrimitiveFoundation',
    'ReadWebUiPrimitiveFoundation',
    'Owns UI primitive config, class composition helpers, and viewport helper state shared by all primitive families.',
    'Provide the shared primitive settings and helper APIs without owning any product-specific surface.',
    'Primitive helper, responsive helper, settings, or class composition changes.',
    'Foundation helpers must not import page, route, canvas, shell, or API behavior.',
    'apps/web/src/app/components/ui/utils.ts',
    'Web UI primitive foundation helper contract.',
    'shared_kernel',
    array['cn', 'useIsMobile', 'ui settings']::text[],
    array[
      'apps/web/src/app/components/ui/settings.json',
      'apps/web/src/app/components/ui/use-mobile.ts',
      'apps/web/src/app/components/ui/utils.ts'
    ]::text[],
    array['scripts/planning-db-migrate.test.cjs']::text[],
    'architecture',
    'boundary',
    'node --test --test-name-pattern "Web UI primitives" scripts/planning-db-migrate.test.cjs',
    'ReadWebUiPrimitiveFoundation',
    'query',
    array['route import attempted', 'product state import attempted']::text[],
    80,
    'medium',
    'FOUNDATION'
  ),
  (
    'SYS-WEB-UI-PRIMITIVES-FORM-CONTROLS',
    'Web UI form control primitives',
    'WebUiFormControlPrimitives',
    'RenderWebUiFormControlPrimitive',
    'Owns form, input, selection, switch, slider, and date-picker primitives used by product forms.',
    'Provide accessible control primitives while keeping submission, validation policy, and product commands in consumers.',
    'Control primitive styling, accessibility, disabled state, date picker, or field composition changes.',
    'Form controls must not own product submit commands or backend mutation semantics.',
    'apps/web/src/app/components/ui/form.tsx',
    'Web UI form control primitive render contract.',
    'presentation_model',
    array['Button', 'Calendar', 'Checkbox', 'Form', 'Input', 'Select', 'Switch', 'Textarea']::text[],
    array[
      'apps/web/src/app/components/ui/button.tsx',
      'apps/web/src/app/components/ui/calendar.test.tsx',
      'apps/web/src/app/components/ui/calendar.tsx',
      'apps/web/src/app/components/ui/checkbox.tsx',
      'apps/web/src/app/components/ui/form.tsx',
      'apps/web/src/app/components/ui/input-otp.tsx',
      'apps/web/src/app/components/ui/input.tsx',
      'apps/web/src/app/components/ui/label.tsx',
      'apps/web/src/app/components/ui/radio-group.tsx',
      'apps/web/src/app/components/ui/select.tsx',
      'apps/web/src/app/components/ui/slider.tsx',
      'apps/web/src/app/components/ui/switch.tsx',
      'apps/web/src/app/components/ui/textarea.tsx'
    ]::text[],
    array[
      'apps/web/src/app/components/ui/calendar.test.tsx',
      'scripts/planning-db-migrate.test.cjs'
    ]::text[],
    'unit',
    'behavior',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/components/ui/calendar.test.tsx && node --test --test-name-pattern "Web UI primitives" scripts/planning-db-migrate.test.cjs',
    'RenderWebUiFormControlPrimitive',
    'query',
    array['invalid date state', 'disabled control state', 'missing aria label']::text[],
    82,
    'medium',
    'FORM-CONTROLS'
  ),
  (
    'SYS-WEB-UI-PRIMITIVES-OVERLAYS',
    'Web UI overlay primitives',
    'WebUiOverlayPrimitives',
    'RenderWebUiOverlayPrimitive',
    'Owns dialog, drawer, sheet, menu, popover, tooltip, hover card, command palette, and context menu primitives.',
    'Provide overlay interaction primitives without owning page-specific command semantics or authorization.',
    'Overlay primitive focus management, portal behavior, menu structure, or tooltip interaction changes.',
    'Overlays must not define product command names; consumers bind domain rails to primitive callbacks.',
    'apps/web/src/app/components/ui/dialog.tsx',
    'Web UI overlay primitive render contract.',
    'gateway',
    array['Dialog', 'Drawer', 'DropdownMenu', 'Popover', 'Sheet', 'Tooltip']::text[],
    array[
      'apps/web/src/app/components/ui/alert-dialog.tsx',
      'apps/web/src/app/components/ui/command.tsx',
      'apps/web/src/app/components/ui/context-menu.tsx',
      'apps/web/src/app/components/ui/dialog.tsx',
      'apps/web/src/app/components/ui/drawer.tsx',
      'apps/web/src/app/components/ui/dropdown-menu.tsx',
      'apps/web/src/app/components/ui/hover-card.tsx',
      'apps/web/src/app/components/ui/popover.tsx',
      'apps/web/src/app/components/ui/sheet.tsx',
      'apps/web/src/app/components/ui/tooltip.tsx'
    ]::text[],
    array['scripts/planning-db-migrate.test.cjs']::text[],
    'architecture',
    'boundary',
    'node --test --test-name-pattern "Web UI primitives" scripts/planning-db-migrate.test.cjs',
    'RenderWebUiOverlayPrimitive',
    'query',
    array['focus trap missing', 'unscoped command callback', 'dismissal path unavailable']::text[],
    80,
    'medium',
    'OVERLAYS'
  ),
  (
    'SYS-WEB-UI-PRIMITIVES-NAVIGATION',
    'Web UI navigation primitives',
    'WebUiNavigationPrimitives',
    'RenderWebUiNavigationPrimitive',
    'Owns breadcrumb, menu bar, navigation menu, pagination, and tab primitives.',
    'Provide navigation presentation primitives while route selection and authorization remain in shell or route owners.',
    'Navigation primitive structure, roving focus, pagination chrome, or tab presentation changes.',
    'Navigation primitives must not own route guards or product navigation decisions.',
    'apps/web/src/app/components/ui/navigation-menu.tsx',
    'Web UI navigation primitive render contract.',
    'presentation_model',
    array['Breadcrumb', 'Menubar', 'NavigationMenu', 'Pagination', 'Tabs']::text[],
    array[
      'apps/web/src/app/components/ui/breadcrumb.tsx',
      'apps/web/src/app/components/ui/menubar.tsx',
      'apps/web/src/app/components/ui/navigation-menu.tsx',
      'apps/web/src/app/components/ui/pagination.tsx',
      'apps/web/src/app/components/ui/tabs.tsx'
    ]::text[],
    array['scripts/planning-db-migrate.test.cjs']::text[],
    'architecture',
    'boundary',
    'node --test --test-name-pattern "Web UI primitives" scripts/planning-db-migrate.test.cjs',
    'RenderWebUiNavigationPrimitive',
    'query',
    array['route guard embedded', 'tab value not controlled by caller']::text[],
    80,
    'medium',
    'NAVIGATION'
  ),
  (
    'SYS-WEB-UI-PRIMITIVES-FEEDBACK',
    'Web UI feedback primitives',
    'WebUiFeedbackPrimitives',
    'RenderWebUiFeedbackPrimitive',
    'Owns alert, badge, progress, skeleton, and toast feedback primitives.',
    'Provide feedback affordances while status sources, error semantics, and notifications remain in domain consumers.',
    'Feedback primitive styling, toast wrapper, progress chrome, or loading placeholder changes.',
    'Feedback primitives must not decide product status, retry, or notification policy.',
    'apps/web/src/app/components/ui/alert.tsx',
    'Web UI feedback primitive render contract.',
    'presentation_model',
    array['Alert', 'Badge', 'Progress', 'Skeleton', 'Sonner']::text[],
    array[
      'apps/web/src/app/components/ui/alert.tsx',
      'apps/web/src/app/components/ui/badge.tsx',
      'apps/web/src/app/components/ui/progress.tsx',
      'apps/web/src/app/components/ui/skeleton.tsx',
      'apps/web/src/app/components/ui/sonner.tsx'
    ]::text[],
    array['scripts/planning-db-migrate.test.cjs']::text[],
    'architecture',
    'boundary',
    'node --test --test-name-pattern "Web UI primitives" scripts/planning-db-migrate.test.cjs',
    'RenderWebUiFeedbackPrimitive',
    'query',
    array['status source embedded', 'retry command embedded']::text[],
    80,
    'medium',
    'FEEDBACK'
  ),
  (
    'SYS-WEB-UI-PRIMITIVES-DATA-DISPLAY',
    'Web UI data display primitives',
    'WebUiDataDisplayPrimitives',
    'RenderWebUiDataDisplayPrimitive',
    'Owns avatar, aspect ratio, card, chart, and table display primitives.',
    'Provide data display containers while read models and projections remain in consuming bounded contexts.',
    'Display primitive layout, chart shell, table primitive, avatar, or media ratio changes.',
    'Data display primitives must not own product read models or projection freshness semantics.',
    'apps/web/src/app/components/ui/table.tsx',
    'Web UI data display primitive render contract.',
    'presentation_model',
    array['Avatar', 'AspectRatio', 'Card', 'Chart', 'Table']::text[],
    array[
      'apps/web/src/app/components/ui/aspect-ratio.tsx',
      'apps/web/src/app/components/ui/avatar.tsx',
      'apps/web/src/app/components/ui/card.tsx',
      'apps/web/src/app/components/ui/chart.tsx',
      'apps/web/src/app/components/ui/table.tsx'
    ]::text[],
    array['scripts/planning-db-migrate.test.cjs']::text[],
    'architecture',
    'boundary',
    'node --test --test-name-pattern "Web UI primitives" scripts/planning-db-migrate.test.cjs',
    'RenderWebUiDataDisplayPrimitive',
    'query',
    array['read model embedded', 'projection freshness embedded']::text[],
    80,
    'medium',
    'DATA-DISPLAY'
  ),
  (
    'SYS-WEB-UI-PRIMITIVES-COMPOSITION-LAYOUT',
    'Web UI composition and layout primitives',
    'WebUiCompositionLayoutPrimitives',
    'RenderWebUiCompositionLayoutPrimitive',
    'Owns accordion, carousel, collapsible, resizable, scroll area, separator, sidebar, toggle, and toggle group primitives.',
    'Provide layout and composition primitives while domain state machines remain in consumers.',
    'Layout primitive composition, scroll area, resize shell, toggle presentation, or sidebar primitive changes.',
    'Composition primitives must not own product state machines, permissions, or persistence.',
    'apps/web/src/app/components/ui/sidebar.tsx',
    'Web UI composition and layout primitive render contract.',
    'composite_view',
    array['Accordion', 'Carousel', 'Collapsible', 'Resizable', 'ScrollArea', 'Sidebar', 'Toggle']::text[],
    array[
      'apps/web/src/app/components/ui/accordion.tsx',
      'apps/web/src/app/components/ui/carousel.tsx',
      'apps/web/src/app/components/ui/collapsible.tsx',
      'apps/web/src/app/components/ui/resizable.tsx',
      'apps/web/src/app/components/ui/scroll-area.tsx',
      'apps/web/src/app/components/ui/separator.tsx',
      'apps/web/src/app/components/ui/sidebar.tsx',
      'apps/web/src/app/components/ui/toggle-group.tsx',
      'apps/web/src/app/components/ui/toggle.tsx'
    ]::text[],
    array['scripts/planning-db-migrate.test.cjs']::text[],
    'architecture',
    'boundary',
    'node --test --test-name-pattern "Web UI primitives" scripts/planning-db-migrate.test.cjs',
    'RenderWebUiCompositionLayoutPrimitive',
    'query',
    array['product state embedded', 'permission state embedded']::text[],
    80,
    'medium',
    'COMPOSITION-LAYOUT'
  );

insert into web_ui_primitive_dependency_map (
  source_component_id,
  target_component_id,
  relation_id,
  contract_id,
  failure_mode
)
select
  component_id,
  'SYS-WEB-UI-PRIMITIVES-FOUNDATION',
  'REL-' || component_id || '-DEPENDS-ON-FOUNDATION',
  'CONTRACT-SYS-WEB-UI-PRIMITIVES-FOUNDATION-SURFACE',
  'Primitive family loses shared class composition, responsive helper, or settings behavior if the foundation boundary changes without a governed dependency update.'
from web_ui_primitive_leaf_map
where component_id <> 'SYS-WEB-UI-PRIMITIVES-FOUNDATION';

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'PLANNING-DB-WEB-UI-PRIMITIVE-LEAF-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Web UI primitive leaf component mapping',
  'Architecture / Planning DB / Frontend',
  'review',
  'SYS-WEB-APP-COMPONENTS-UI owned 50 active shadcn-style primitives directly under apps/web/src/app/components/ui. This migration keeps the existing component as the aggregate design-system primitive boundary and maps concrete files into foundation, form controls, overlays, navigation, feedback, data display, and composition/layout leaves with component graph relations, internal render ports, contracts, tests, observability, and Fowler basis.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;RenderWebUiPrimitive',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select distinct
  'PLANNING-DB-WEB-UI-PRIMITIVE-LEAF-COMPONENTS-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-WEB-APP-COMPONENTS-UI'::text, 'may_update'::text
  union all
  select 'component', 'SYS-WEB-APP-COMPONENTS', 'may_reference'
  union all
  select 'path', 'apps/web/src/app/components/ui/**', 'may_update'
  union all
  select 'component', component_id, 'may_create'
  from web_ui_primitive_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from web_ui_primitive_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_components component
set
  children_required = true,
  cq_rails = 'RenderWebUiPrimitive;RenderWebUiFormControlPrimitive;RenderWebUiOverlayPrimitive;RenderWebUiNavigationPrimitive;RenderWebUiFeedbackPrimitive;RenderWebUiDataDisplayPrimitive;RenderWebUiCompositionLayoutPrimitive;ReadWebUiPrimitiveFoundation',
  fowler_signals = jsonb_build_array('responsibility_overload', 'component_split', 'design_system_boundary'),
  raw_component = component.raw_component || jsonb_build_object(
    'childrenRequired',
    true,
    'cqRails',
    'RenderWebUiPrimitive;RenderWebUiFormControlPrimitive;RenderWebUiOverlayPrimitive;RenderWebUiNavigationPrimitive;RenderWebUiFeedbackPrimitive;RenderWebUiDataDisplayPrimitive;RenderWebUiCompositionLayoutPrimitive;ReadWebUiPrimitiveFoundation',
    'reconciledBy',
    '212_web_ui_primitive_leaf_components',
    'ownedConcern',
    'Owns the aggregate Web UI primitive boundary; concrete primitives resolve to responsibility-owned child components.'
  )
where component.component_id = 'SYS-WEB-APP-COMPONENTS-UI';

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'SYS-WEB-APP-COMPONENTS-UI',
  'tools/planning-db/migrations/212_web_ui_primitive_leaf_components.sql',
  md5('SYS-WEB-APP-COMPONENTS-UI:212') || md5('web-ui-primitive-parent:212'),
  0,
  'Web UI primitives',
  'component',
  'SYS-WEB-APP-COMPONENTS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the aggregate Web UI primitive boundary; concrete primitives resolve to responsibility-owned child components.',
  'WebUiPrimitives',
  'RenderWebUiPrimitive;RenderWebUiFormControlPrimitive;RenderWebUiOverlayPrimitive;RenderWebUiNavigationPrimitive;RenderWebUiFeedbackPrimitive;RenderWebUiDataDisplayPrimitive;RenderWebUiCompositionLayoutPrimitive;ReadWebUiPrimitiveFoundation',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
select
  component_id,
  'tools/planning-db/migrations/212_web_ui_primitive_leaf_components.sql',
  md5(component_id || ':212') || md5(repo_path || cq_rails || ':web-ui-primitive-leaf'),
  0,
  name,
  'component',
  'SYS-WEB-APP-COMPONENTS-UI',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from web_ui_primitive_leaf_map
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  component_id,
  'owns',
  own.pattern,
  own.pattern_order - 1
from web_ui_primitive_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  values
    (
      'SYS-WEB-APP-COMPONENTS-UI',
      'responsibility',
      'Own the aggregate Web UI primitive boundary and delegate concrete shadcn-style primitive files to foundation, form controls, overlays, navigation, feedback, data display, and composition/layout leaves.',
      0
    ),
    (
      'SYS-WEB-APP-COMPONENTS-UI',
      'reason_to_change',
      'Design-system primitive taxonomy, shared primitive API grouping, primitive ownership, or component hierarchy changes.',
      0
    ),
    (
      'SYS-WEB-APP-COMPONENTS-UI',
      'invariant',
      'The aggregate must own no concrete apps/web/src/app/components/ui primitive files directly once UI primitive leaves are applied.',
      0
    ),
    (
      'SYS-WEB-APP-COMPONENTS-UI',
      'non_goal',
      'Do not deprecate active UI primitive files merely to reduce direct-file count; nonfunctional primitives require explicit deprecation evidence.',
      0
    ),
    (
      'SYS-WEB-APP-COMPONENTS-UI',
      'governance_ref',
      'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
      0
    )
) item(component_id, item_kind, item_value, item_order)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from web_ui_primitive_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from web_ui_primitive_leaf_map
  union all
  select component_id, 'invariant', invariant, 0
  from web_ui_primitive_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented after component-quality shows SYS-WEB-APP-COMPONENTS-UI owns no direct files and leaf validation commands pass.', 0
  from web_ui_primitive_leaf_map
  union all
  select component_id, 'consumer', 'Frontend maintainers, design-system consumers, Planning DB component-profile readers, component-integrity, and changed-slice checks', 0
  from web_ui_primitive_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 0
  from web_ui_primitive_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from web_ui_primitive_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from web_ui_primitive_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  kind = 'module',
  layer = 'ui',
  owner = 'WebUiPrimitives',
  repo_path = 'apps/web/src/app/components/ui',
  public_contract = 'Aggregate Web UI primitive boundary; concrete primitives are owned by design-system child components.',
  runtime = 'browser',
  criticality = 'medium',
  status = 'review',
  maturity_score = greatest(coalesce(maturity_score, 0), 82),
  parent_component_id = 'SYS-WEB-APP-COMPONENTS',
  updated_at = now()
where component_id = 'SYS-WEB-APP-COMPONENTS-UI';

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  maturity_score,
  parent_component_id
)
select
  component_id,
  name,
  'module',
  'ui',
  ddd_owner,
  repo_path,
  public_contract,
  'browser',
  criticality,
  'review',
  maturity_score,
  'SYS-WEB-APP-COMPONENTS-UI'
from web_ui_primitive_leaf_map
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
select
  'RESP-' || component_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  'implemented'
from web_ui_primitive_leaf_map
union all
select
  'RESP-SYS-WEB-APP-COMPONENTS-UI',
  'SYS-WEB-APP-COMPONENTS-UI',
  'Own the aggregate Web UI primitive boundary and delegate concrete primitive files to design-system responsibility leaves.',
  'Design-system primitive taxonomy, primitive ownership, or component hierarchy changes.',
  'WebUiPrimitives',
  'implemented'
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
select
  'CONTRACT-' || component_id || '-SURFACE',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from web_ui_primitive_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  'REL-WEB-APP-COMPONENTS-UI-CONTAINS-' || relation_suffix,
  'SYS-WEB-APP-COMPONENTS-UI',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this UI primitive leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local Web UI governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from web_ui_primitive_leaf_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  relation_id,
  source_component_id,
  target_component_id,
  'depends_on',
  'outbound',
  'sync',
  contract_id,
  failure_mode,
  'browser-local Web UI primitive API',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'tools/planning-db/migrations/212_web_ui_primitive_leaf_components.sql'
  ),
  'implemented'
from web_ui_primitive_dependency_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(regexp_replace(port_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  port_name,
  port_kind,
  'inbound',
  'CONTRACT-' || component_id || '-SURFACE',
  'CONTRACT-' || component_id || '-SURFACE',
  negative_tests,
  'implemented'
from web_ui_primitive_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
select
  'TEST-' || component_id || '-' || test_path.test_order,
  component_id,
  test_path.path,
  test_kind,
  coverage_level,
  true,
  validation_command
from web_ui_primitive_leaf_map
cross join lateral unnest(test_paths) with ordinality as test_path(path, test_order)
union all
select
  'TEST-SYS-WEB-APP-COMPONENTS-UI-COMPONENT-PROFILE',
  'SYS-WEB-APP-COMPONENTS-UI',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-quality --component SYS-WEB-APP-COMPONENTS-UI --no-refresh --limit 20 && pnpm planning:db:query files --component SYS-WEB-APP-COMPONENTS-UI --no-refresh --limit 20'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-COMPONENT-PROFILE',
  component_id,
  name || ' is observable through component-profile, component-quality, component-integrity, and focused UI primitive tests where present.',
  'dashboard',
  true,
  'implemented'
from web_ui_primitive_leaf_map
union all
select
  'OBS-SYS-WEB-APP-COMPONENTS-UI-COMPONENT-QUALITY',
  'SYS-WEB-APP-COMPONENTS-UI',
  'The aggregate Web UI primitives component is observable through component-quality direct-file count and child coverage.',
  'dashboard',
  true,
  'implemented'
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

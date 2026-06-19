-- Repair the relation-status drift introduced while restoring closeout cohort
-- leaves. component_relation has no deprecated status; the canonical repair is
-- to keep the historical relation IDs, repoint them to the closeout aggregate,
-- and remove the parallel relation rows created by migration 198.

drop table if exists pg_temp.docs_planning_closeout_relation_repair_map;

create temporary table docs_planning_closeout_relation_repair_map (
  historical_relation_id text primary key,
  duplicate_relation_id text not null,
  target_component_id text not null,
  relation_suffix text not null
);

insert into docs_planning_closeout_relation_repair_map (
  historical_relation_id,
  duplicate_relation_id,
  target_component_id,
  relation_suffix
)
values
  (
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202603',
    'REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-202603',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202603',
    '202603'
  ),
  (
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202604',
    'REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-202604',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202604',
    '202604'
  ),
  (
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202605',
    'REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-202605',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202605',
    '202605'
  ),
  (
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202606',
    'REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-202606',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202606',
    '202606'
  ),
  (
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-LEGACY',
    'REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-LEGACY',
    'SYS-DOCS-PLANNING-CLOSEOUTS-LEGACY',
    'LEGACY'
  );

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
  'PLANNING-DB-DOCS-CLOSEOUT-RELATION-DRIFT-REPAIR-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning closeout cohort relation drift repair',
  'Architecture / Planning DB / Documentation',
  'review',
  'Migration 198 used relation status drift to signal obsolete planning-catalog-to-closeout-cohort relations, but component_relation has no deprecated state and architecture-drift treats drift as an error. The coherent model keeps the historical relation IDs for compatibility, repoints their source to SYS-DOCS-PLANNING-CLOSEOUTS, and removes the duplicate relation IDs created in 198.',
  'boundary_drift',
  'ReadPlanningCloseoutRecords;ValidateComponentIntegrity;ReadArchitectureDrift',
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
select
  'PLANNING-DB-DOCS-CLOSEOUT-RELATION-DRIFT-REPAIR-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-DOCS-PLANNING-CLOSEOUTS'::text, 'may_update'::text
  union all
  select 'relation', historical_relation_id, 'may_update'
  from docs_planning_closeout_relation_repair_map
  union all
  select 'relation', duplicate_relation_id, 'may_delete'
  from docs_planning_closeout_relation_repair_map
) scope(subject_kind, subject_id, scope_kind)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component_relation relation
set
  source_component_id = 'SYS-DOCS-PLANNING-CLOSEOUTS',
  target_component_id = repair.target_component_id,
  relation_type = 'contains',
  direction = 'outbound',
  sync_async = 'build_time',
  contract_id = null,
  failure_mode = 'Component profile becomes incomplete if this closeout cohort relation is removed or remapped without a governed Planning DB component update.',
  authorization_scope = 'repo-local docs governance',
  source_refs = jsonb_build_array(
    'tools/planning-db/migrations/199_docs_planning_closeout_relation_drift_repair.sql',
    'docs/planning/closeouts'
  ),
  status = 'implemented',
  updated_at = now()
from docs_planning_closeout_relation_repair_map repair
where relation.relation_id = repair.historical_relation_id;

delete from architecture.component_relation relation
using docs_planning_closeout_relation_repair_map repair
where relation.relation_id = repair.duplicate_relation_id;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  repair.target_component_id,
  'transition',
  'Closeout cohort containment now uses the historical REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-* relation IDs repointed to SYS-DOCS-PLANNING-CLOSEOUTS; duplicate relation IDs from migration 198 were removed.',
  1
from docs_planning_closeout_relation_repair_map repair
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

drop table if exists pg_temp.docs_planning_closeout_relation_repair_map;

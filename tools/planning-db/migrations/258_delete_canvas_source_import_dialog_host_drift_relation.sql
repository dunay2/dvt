-- Remove the stale relation to the retired Canvas source import dialog host.
-- architecture.component_relation has no deprecated status; drift is an active
-- error state, so explicit deletion is the clean retirement path.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  supersedes_id,
  approved_at
)
values (
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-RELATION-RETIREMENT-20260625',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Delete stale Canvas source import dialog host relation',
  'Architecture / Planning DB / Frontend',
  'implemented',
  'The prior migration retired SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST but left REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-DIALOG-HOST in status drift. Relation drift is an active architecture error, not a retired state. The real shell dependency is REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-WIZARD, so the stale relation is deleted while the retirement design keeps the audit trail.',
  'boundary_drift',
  'ValidateComponentIntegrity;ValidateArchitectureDrift',
  'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT-20260625',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  supersedes_id = excluded.supersedes_id,
  approved_at = excluded.approved_at,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-RELATION-RETIREMENT-20260625',
    'relation',
    'REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-DIALOG-HOST',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-RELATION-RETIREMENT-20260625',
    'relation',
    'REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-WIZARD',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-RELATION-RETIREMENT-20260625',
    'component',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

delete from architecture.component_relation
where relation_id = 'REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-DIALOG-HOST';

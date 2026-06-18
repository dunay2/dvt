-- Follow-up for the API HTTP entrypoint split.
-- Keep the authentication component path on an already-imported source file so
-- progressive integrity can pass before the next governance import sees the new
-- canonical bearer helper file.

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
  'PLANNING-DB-API-HTTP-ENTRYPOINT-INTEGRITY-FOLLOWUP-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB API HTTP entrypoint integrity follow-up',
  'Architecture / API / Planning DB',
  'review',
  'After the API HTTP leaf split, the authentication leaf pointed its architecture repo_path at the newly added canonical bearer helper. A recovered or not-yet-refreshed Planning DB can see the component before the new file import, so this follow-up anchors the component on the existing authHeaders barrel while keeping the helper as owned source and public API evidence.',
  'evolutionary_architecture',
  'CheckPlanningDbComponentIntegrity;ReadComponentProfile;code-symbol-duplicates',
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
values
  (
    'PLANNING-DB-API-HTTP-ENTRYPOINT-INTEGRITY-FOLLOWUP-20260618',
    'component',
    'SYS-API-HTTP-AUTHENTICATION',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-API-HTTP-ENTRYPOINT-INTEGRITY-FOLLOWUP-20260618',
    'path',
    'apps/api/src/entrypoints/http/authHeaders.ts',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-API-HTTP-ENTRYPOINT-INTEGRITY-FOLLOWUP-20260618',
    'path',
    'apps/api/src/entrypoints/http/httpBearerAuthentication.ts',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = 'apps/api/src/entrypoints/http/authHeaders.ts',
  public_contract = 'Canonical API HTTP bearer authentication and execution-scope authorization surface. The authHeaders barrel anchors the component before imports see the new httpBearerAuthentication helper.',
  updated_at = now()
where component_id = 'SYS-API-HTTP-AUTHENTICATION';

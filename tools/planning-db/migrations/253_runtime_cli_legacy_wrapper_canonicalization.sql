-- Canonicalize the loose packages/cli contract validator as a deprecated
-- compatibility wrapper over the governed @dvt/cli validator.

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
  'PLANNING-DB-RUNTIME-CLI-LEGACY-WRAPPER-CANONICALIZATION-20260619',
  'WEB-PHYSICAL-MODULE-DECOMPOSITION-DEBT-20260508',
  'Runtime CLI legacy wrapper canonicalization',
  'Architecture / Runtime / Planning DB',
  'implemented',
  'The loose packages/cli validator duplicated the active @dvt/cli contract validator. The old path remains only as a deprecated compatibility entrypoint that delegates to packages/@dvt/cli/validate-contracts.cjs; the active component owns validation behavior and contract fixture IO.',
  'boundary_drift',
  'RunRuntimeCliValidation;ReadComponentProfile;DetectCodeSymbolDuplicates;CheckPlanningDbComponentIntegrity',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
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
    'PLANNING-DB-RUNTIME-CLI-LEGACY-WRAPPER-CANONICALIZATION-20260619',
    'component',
    'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-WRAPPER-CANONICALIZATION-20260619',
    'component',
    'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-WRAPPER-CANONICALIZATION-20260619',
    'path',
    'packages/cli/validate-contracts.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-WRAPPER-CANONICALIZATION-20260619',
    'path',
    'packages/@dvt/cli/validate-contracts.cjs',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-WRAPPER-CANONICALIZATION-20260619',
    'path',
    'docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-WRAPPER-CANONICALIZATION-20260619',
    'relation',
    'REL-RUNTIME-CLI-VALIDATION-LEGACY-CALLS-DVT-CLI-PACKAGE',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-WRAPPER-CANONICALIZATION-20260619',
    'evidence',
    'STORAGE-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-OLD-PLAN-FIXTURE-READ',
    'may_delete',
    true
  ),
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-WRAPPER-CANONICALIZATION-20260619',
    'test',
    'scripts/planning-db-migrate.test.cjs',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-WRAPPER-CANONICALIZATION-20260619',
    'query',
    'DetectCodeSymbolDuplicates',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-WRAPPER-CANONICALIZATION-20260619',
    'query',
    'ReadComponentProfile',
    'must_prove',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  source_content_sha256 =
    md5('SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE:253')
    || md5('runtime cli legacy wrapper canonicalization:253'),
  name = 'Legacy runtime CLI validation compatibility wrapper',
  status = 'legacy',
  owned_concern = 'Owns the deprecated packages/cli/validate-contracts.cjs compatibility entrypoint; validation behavior delegates to packages/@dvt/cli/validate-contracts.cjs and must not be implemented locally.',
  ddd_owner = 'RuntimeCliValidationLegacyCompatibilityPath',
  cq_rails = 'RunRuntimeCliValidation;ReadComponentProfile;DetectCodeSymbolDuplicates;CheckPlanningDbComponentIntegrity'
where component_id = 'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE';

update planning_query_store.governance_component_local_semantic_items
set item_value = 'Keep packages/cli/validate-contracts.cjs as a deprecated compatibility wrapper that delegates to the canonical @dvt/cli validator until reference proof allows deletion.'
where component_id = 'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE'
  and item_kind = 'responsibility'
  and item_value = 'Keep the loose packages/cli validator visible as deprecated duplicate evidence until a deletion or compatibility-wrapper slice proves consumers.';

update planning_query_store.governance_component_local_semantic_items
set item_value = 'Compatibility-wrapper proof, reference removal, or physical deletion of packages/cli/validate-contracts.cjs.'
where component_id = 'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE'
  and item_kind = 'reason_to_change'
  and item_value = 'Historical reference discovery, compatibility-wrapper proof, or physical deletion of packages/cli/validate-contracts.cjs.';

update planning_query_store.governance_component_local_semantic_items
set item_value = 'The legacy loose path must remain a thin wrapper; active validation behavior belongs to packages/@dvt/cli.'
where component_id = 'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE'
  and item_kind = 'invariant'
  and item_value = 'The legacy loose path must not receive new behavior; active validation behavior belongs to packages/@dvt/cli.';

update planning_query_store.governance_component_local_semantic_items
set item_value = 'active duplicate implementation -> deprecated wrapper delegation covered by wrapper static test, component-profile, and code-symbol duplicate query.'
where component_id = 'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE'
  and item_kind = 'transition'
  and item_value = 'active duplicate path -> deprecated legacy component, pending consumer proof before physical removal.';

update planning_query_store.governance_component_local_semantic_items
set item_value = 'Legacy CLI path consumers that still invoke node packages/cli/validate-contracts.cjs.'
where component_id = 'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE'
  and item_kind = 'consumer'
  and item_value = 'Planning DB component-profile, code-symbol duplicate queries, and future CLI physical-layout cleanup';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
    'public_api',
    'node packages/cli/validate-contracts.cjs -> packages/@dvt/cli/validate-contracts.cjs',
    0
  ),
  (
    'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
    'governance_ref',
    'docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md',
    1
  ),
  (
    'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
    'fowler_signal',
    'duplicate_semantics',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set
  name = 'Legacy runtime CLI validation compatibility wrapper',
  owner = 'RuntimeCliValidationLegacyCompatibilityPath',
  public_contract = 'node packages/cli/validate-contracts.cjs delegates to packages/@dvt/cli/validate-contracts.cjs',
  status = 'deprecated',
  maturity_score = 36,
  updated_at = now()
where component_id = 'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE';

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
  'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
  'Preserve the deprecated packages/cli validation command as a thin compatibility wrapper over @dvt/cli.',
  'Compatibility reference proof, wrapper removal, or physical deletion of packages/cli/validate-contracts.cjs.',
  'RuntimeCliValidationLegacyCompatibilityPath',
  'implemented'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

update architecture.contract
set
  status = 'implemented',
  contract_ref = 'packages/cli/validate-contracts.cjs deprecated compatibility wrapper for packages/@dvt/cli/validate-contracts.cjs',
  validation_command = 'pnpm --filter @dvt/contracts run build && node packages/cli/validate-contracts.cjs',
  updated_at = now()
where contract_id = 'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-PATH';

update architecture.component_port
set
  input_contract_id = 'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-PATH',
  negative_tests = array[
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:query code-symbol-duplicates --path packages/cli/validate-contracts.cjs --no-refresh --limit 80',
    'pnpm --filter @dvt/contracts run build && node packages/cli/validate-contracts.cjs'
  ]::text[],
  status = 'implemented'
where port_id = 'PORT-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-RUN-RUNTIME-CLI-VALIDATION-LEGACY';

delete from architecture.component_storage_io
where storage_io_id = 'STORAGE-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-OLD-PLAN-FIXTURE-READ'
  and component_id = 'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE';

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
values (
  'REL-RUNTIME-CLI-VALIDATION-LEGACY-CALLS-DVT-CLI-PACKAGE',
  'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
  'SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE',
  'calls',
  'outbound',
  'sync',
  'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE-CONTRACT-FIXTURES',
  'legacy compatibility command fails if the canonical @dvt/cli validator entrypoint is removed or renamed without retiring packages/cli',
  'repo-local deprecated compatibility command',
  jsonb_build_array(
    'packages/cli/validate-contracts.cjs',
    'packages/@dvt/cli/validate-contracts.cjs',
    'docs/planning/proposals/mandatory/frontend-and-ux/web-physical-module-decomposition-debt-plan-20260508.md'
  ),
  'implemented'
)
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

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-WRAPPER-DELEGATION',
  'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
  'scripts/planning-db-migrate.test.cjs',
  'unit',
  'behavior',
  true,
  'node --test scripts/planning-db-migrate.test.cjs'
)
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
values (
  'OBS-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-WRAPPER-QUERY-EVIDENCE',
  'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
  'Wrapper correctness is observable through the static wrapper test, component-profile output, and code-symbol duplicate query output; runtime telemetry is not applicable.',
  'log',
  true,
  'not_applicable'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

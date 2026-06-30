-- Extend the Planning DB query filter helper component to cover the next
-- active duplicate families: boolean predicates and component-pair predicates.

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
  'PLANNING-DB-QUERY-FILTER-HELPER-EXTENDED-FILTERS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Extended Planning DB query filter helper component',
  'Architecture / Planning DB',
  'implemented',
  'After appendFilter was centralized, the next active duplicate families were boolean predicate builders and component-pair predicates across Planning DB query read models. Extend the existing query-filter helper instead of creating another utility component or leaving query-local duplicate functions.',
  'hidden_authority',
  'DetectCodeSymbolDuplicates;CheckPlanningDbComponentIntegrity;ReadComponentProfile',
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
    'PLANNING-DB-QUERY-FILTER-HELPER-EXTENDED-FILTERS-20260619',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-QUERY-FILTER-HELPER-EXTENDED-FILTERS-20260619',
    'path',
    'scripts/planning-db/query-filter.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-QUERY-FILTER-HELPER-EXTENDED-FILTERS-20260619',
    'test',
    'scripts/planning-db-query.test.cjs',
    'must_prove',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  public_contract = 'Canonical Planning DB query predicate helper for equality, boolean, and component-pair filters.',
  maturity_score = greatest(maturity_score, 88),
  updated_at = now()
where component_id = 'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'responsibility',
    'Normalize Planning DB query boolean and component-pair predicate construction through shared helpers.',
    2
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'reason_to_change',
    'Planning DB predicate binding semantics, boolean SQL literal semantics, or component-pair filter semantics change.',
    1
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'public_api',
    'appendBooleanFilter(predicates, column, value): void',
    1
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'public_api',
    'appendBooleanParamFilter(predicates, params, column, value): void',
    2
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'public_api',
    'appendComponentPairFilter(predicates, params, value, leftColumn, rightColumn): void',
    3
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'invariant',
    'Component-pair filters bind one parameter and reuse its ordinal for both component columns.',
    1
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'fowler_signal',
    'Duplicate predicate helpers',
    2
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
values
  (
    'PORT-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER-BOOLEAN-LITERAL',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'AppendPlanningDbBooleanLiteralFilter',
    'query',
    'inbound',
    null,
    null,
    array['scripts/planning-db-query.test.cjs ignores undefined boolean filters and preserves true/false SQL literal output']::text[],
    'implemented'
  ),
  (
    'PORT-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER-BOOLEAN-PARAM',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'AppendPlanningDbBooleanParamFilter',
    'query',
    'inbound',
    null,
    null,
    array['scripts/planning-db-query.test.cjs ignores empty boolean parameter filters and binds Boolean(value) once']::text[],
    'implemented'
  ),
  (
    'PORT-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER-COMPONENT-PAIR',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER',
    'AppendPlanningDbComponentPairFilter',
    'query',
    'inbound',
    null,
    null,
    array['scripts/planning-db-query.test.cjs verifies one bound component id reused across both pair columns']::text[],
    'implemented'
  )
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

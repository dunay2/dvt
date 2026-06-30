-- Split the duplicated policy-validation Markdown file walk into one queryable
-- Planning DB component leaf.

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
  'PLANNING-DB-POLICY-VALIDATION-MARKDOWN-FILE-CATALOG-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Policy validation Markdown file catalog component split',
  'Architecture / Planning DB / CI Governance',
  'implemented',
  'validate-references and validate-rfc2119 repeated equivalent recursive Markdown file walking inside the policy-validation bounded context. This split records one shared file catalog leaf so component-profile can answer files, query rail, contract, storage read, tests, and duplicate remediation evidence.',
  'hidden_authority',
  'ListPolicyValidationMarkdownFiles;DetectCodeSymbolDuplicates;ReadComponentProfile',
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
    'PLANNING-DB-POLICY-VALIDATION-MARKDOWN-FILE-CATALOG-20260619',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-MARKDOWN-FILE-CATALOG-20260619',
    'path',
    'scripts/policy-validation-files.cjs',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-MARKDOWN-FILE-CATALOG-20260619',
    'test',
    'scripts/policy-validation-files.test.cjs',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-MARKDOWN-FILE-CATALOG-20260619',
    'relation',
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES-CALLS-FILES',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-MARKDOWN-FILE-CATALOG-20260619',
    'relation',
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119-CALLS-FILES',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-MARKDOWN-FILE-CATALOG-20260619',
    'query',
    'ListPolicyValidationMarkdownFiles',
    'must_prove',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
  'scripts/policy-validation-files.cjs',
  md5('SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES:255')
    || md5('policy validation Markdown file catalog component:255'),
  0,
  'Policy validation Markdown file catalog',
  'component',
  'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
  'SYS-DVT',
  'SYS-DVT',
  'canonical',
  false,
  'Owns recursive Markdown file discovery used by policy validators before document analysis.',
  'RepositoryPolicyValidationMarkdownFileCatalog',
  'ListPolicyValidationMarkdownFiles;DetectCodeSymbolDuplicates;ReadComponentProfile',
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

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'owns',
    'scripts/policy-validation-files.cjs',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'owns',
    'scripts/policy-validation-files.test.cjs',
    1
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'responsibility',
    'Provide one canonical recursive Markdown file catalog for policy validators.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'public_api',
    'listMarkdownFiles(dir) -> string[]',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'invariant',
    'Policy validators must import listMarkdownFiles instead of defining local walkMarkdown functions.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'transition',
    'duplicated walkMarkdown helpers -> canonical Markdown file catalog covered by unit test, component-profile, and code-symbol duplicate query.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'consumer',
    'validate-references, validate-rfc2119, component-profile, and code-symbol duplicate review.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'fowler_signal',
    'duplicate_semantics',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
  'Policy validation Markdown file catalog',
  'module',
  'infra',
  'RepositoryPolicyValidationMarkdownFileCatalog',
  'scripts/policy-validation-files.cjs',
  'listMarkdownFiles',
  'node',
  'medium',
  'implemented',
  82,
  'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION'
)
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
values (
  'RESP-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
  'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
  'List Markdown files recursively for policy validators while excluding non-Markdown files.',
  'Policy validator filesystem discovery semantics change.',
  'RepositoryPolicyValidationMarkdownFileCatalog',
  'implemented'
)
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
values (
  'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES-CATALOG',
  'port',
  'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
  'listMarkdownFiles(dir) -> recursive Markdown file paths',
  'internal',
  'implemented',
  'node --test scripts/policy-validation-files.test.cjs'
)
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
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
values
  (
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-CONTAINS-FILES',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'contains',
    'outbound',
    'sync',
    null,
    'Markdown file discovery remains hidden under broad policy validation if this relation is absent',
    'repository_governance',
    jsonb_build_array('scripts/policy-validation-files.cjs'),
    'implemented'
  ),
  (
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES-CALLS-FILES',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'calls',
    'outbound',
    'sync',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES-CATALOG',
    'reference validation may miss contract docs if Markdown file discovery drifts',
    'repository_governance',
    jsonb_build_array('scripts/validate-references.cjs', 'scripts/policy-validation-files.cjs'),
    'implemented'
  ),
  (
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119-CALLS-FILES',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
    'calls',
    'outbound',
    'sync',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES-CATALOG',
    'RFC2119 validation may miss contract docs if Markdown file discovery drifts',
    'repository_governance',
    jsonb_build_array('scripts/validate-rfc2119.cjs', 'scripts/policy-validation-files.cjs'),
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

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  negative_tests,
  status
)
values (
  'PORT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES-LIST',
  'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
  'ListPolicyValidationMarkdownFiles',
  'query',
  'inbound',
  'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES-CATALOG',
  array['non-Markdown files are excluded by scripts/policy-validation-files.test.cjs']::text[],
  'implemented'
)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_storage_io (
  storage_io_id,
  component_id,
  storage_object,
  direction,
  access_pattern,
  contract_id
)
values (
  'STORAGE-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES-MARKDOWN-DIR-READ',
  'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
  'caller-provided Markdown directory; docs/architecture/engine/contracts/**/*.md for policy validators',
  'reads',
  'read_only',
  'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES-CATALOG'
)
on conflict (storage_io_id) do update set
  component_id = excluded.component_id,
  storage_object = excluded.storage_object,
  direction = excluded.direction,
  access_pattern = excluded.access_pattern,
  contract_id = excluded.contract_id;

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
  'TEST-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
  'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
  'scripts/policy-validation-files.test.cjs',
  'unit',
  'behavior',
  true,
  'node --test scripts/policy-validation-files.test.cjs'
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
  'OBS-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES-TEST-EVIDENCE',
  'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES',
  'Markdown file catalog behavior is observable through policy-validation-files unit tests and code-symbol duplicate query output.',
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

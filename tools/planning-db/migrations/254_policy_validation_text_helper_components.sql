-- Split policy validation reference/RFC2119 scripts and their shared inline-code
-- stripping helper into queryable Planning DB component leaves.

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
  'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Policy validation text helper component split',
  'Architecture / Planning DB / CI Governance',
  'implemented',
  'validate-references and validate-rfc2119 repeated equivalent inline-code stripping logic inside the broad policy-validation component. This split records each validator and the shared text normalizer as component leaves so component-profile can answer files, commands, storage reads, tests, and duplicate remediation evidence.',
  'hidden_authority',
  'ValidateContractReferences;ValidateRfc2119Language;NormalizePolicyValidationMarkdownText;DetectCodeSymbolDuplicates;ReadComponentProfile',
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
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'path',
    'scripts/validate-references.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'path',
    'scripts/validate-rfc2119.cjs',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'path',
    'scripts/policy-validation-text.cjs',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'test',
    'scripts/policy-validation-text.test.cjs',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'test',
    'scripts/planning-db-migrate.test.cjs',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'relation',
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-CONTAINS-REFERENCES',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'relation',
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-CONTAINS-RFC2119',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'relation',
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-CONTAINS-TEXT',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'query',
    'DetectCodeSymbolDuplicates',
    'must_prove',
    true
  ),
  (
    'PLANNING-DB-POLICY-VALIDATION-TEXT-HELPER-COMPONENTS-20260619',
    'query',
    'ReadComponentProfile',
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
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'scripts/validate-references.cjs',
    md5('SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES:254')
      || md5('policy validation references component:254'),
    0,
    'Policy validation contract reference validator',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Owns the contract Markdown reference validation command and its contract-doc filesystem reads.',
    'ContractReferenceValidationCommand',
    'ValidateContractReferences;DetectCodeSymbolDuplicates;ReadComponentProfile',
    'codex'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'scripts/validate-rfc2119.cjs',
    md5('SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119:254')
      || md5('policy validation rfc2119 component:254'),
    0,
    'Policy validation RFC2119 validator',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Owns the RFC2119 Markdown language validation command and its contract-doc filesystem reads.',
    'Rfc2119LanguageValidationCommand',
    'ValidateRfc2119Language;DetectCodeSymbolDuplicates;ReadComponentProfile',
    'codex'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'scripts/policy-validation-text.cjs',
    md5('SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT:254')
      || md5('policy validation text normalizer component:254'),
    0,
    'Policy validation Markdown text normalizer',
    'component',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
    'SYS-DVT',
    'SYS-DVT',
    'canonical',
    false,
    'Owns shared Markdown inline-code stripping used by policy validators before text analysis.',
    'RepositoryPolicyValidationTextNormalizer',
    'NormalizePolicyValidationMarkdownText;DetectCodeSymbolDuplicates;ReadComponentProfile',
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
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'owns',
    'scripts/validate-references.cjs',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'owns',
    'scripts/validate-rfc2119.cjs',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'owns',
    'scripts/policy-validation-text.cjs',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'owns',
    'scripts/policy-validation-text.test.cjs',
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
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'responsibility',
    'Validate local Markdown links, version labels, and deprecated-reference heuristics under contract architecture docs.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'public_api',
    'node scripts/validate-references.cjs; package script contracts:references:validate',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'invariant',
    'Reference validation owns link and version-reference findings, while inline-code stripping is consumed from the policy validation text normalizer.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'transition',
    'broad policy-validation ownership -> dedicated reference validator leaf with explicit command, port, storage read, test, and text-normalizer call relation.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'consumer',
    'Contract documentation quality gates, component-profile, code-symbol duplicate review, and contracts:references:validate.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'responsibility',
    'Validate RFC2119 normative keyword casing under contract architecture docs.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'public_api',
    'node scripts/validate-rfc2119.cjs; package script contracts:rfc2119:validate',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'invariant',
    'RFC2119 validation owns normative keyword casing findings, while inline-code stripping is consumed from the policy validation text normalizer.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'transition',
    'broad policy-validation ownership -> dedicated RFC2119 validator leaf with explicit command, port, storage read, test, and text-normalizer call relation.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'consumer',
    'Contract documentation quality gates, component-profile, code-symbol duplicate review, and contracts:rfc2119:validate.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'responsibility',
    'Provide one canonical inline-code stripping helper for policy validation Markdown line analysis.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'public_api',
    'stripInlineCodeFragments',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'invariant',
    'Policy validators must import stripInlineCodeFragments instead of defining local stripInlineCode or sanitizeLine functions.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'transition',
    'duplicate inline-code stripping helpers -> canonical text normalizer helper covered by unit test, component-profile, and code-symbol duplicate query.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'consumer',
    'validate-references, validate-rfc2119, component-profile, and code-symbol duplicate review.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'fowler_signal',
    'duplicate_semantics',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
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
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'Policy validation contract reference validator',
    'module',
    'infra',
    'ContractReferenceValidationCommand',
    'scripts/validate-references.cjs',
    'node scripts/validate-references.cjs',
    'node',
    'medium',
    'implemented',
    74,
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'Policy validation RFC2119 validator',
    'module',
    'infra',
    'Rfc2119LanguageValidationCommand',
    'scripts/validate-rfc2119.cjs',
    'node scripts/validate-rfc2119.cjs',
    'node',
    'medium',
    'implemented',
    74,
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'Policy validation Markdown text normalizer',
    'module',
    'infra',
    'RepositoryPolicyValidationTextNormalizer',
    'scripts/policy-validation-text.cjs',
    'stripInlineCodeFragments',
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
values
  (
    'RESP-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'Validate local Markdown references and version/deprecation heuristics in contract architecture docs.',
    'Contract architecture reference policy or reference validation output changes.',
    'ContractReferenceValidationCommand',
    'implemented'
  ),
  (
    'RESP-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'Validate RFC2119 normative keyword casing in contract architecture docs.',
    'Normative keyword policy or RFC2119 validation output changes.',
    'Rfc2119LanguageValidationCommand',
    'implemented'
  ),
  (
    'RESP-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'Normalize Markdown lines for policy validators by removing inline code fragments before prose analysis.',
    'Markdown policy validator text-normalization semantics change.',
    'RepositoryPolicyValidationTextNormalizer',
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
values
  (
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES-CLI',
    'port',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'contracts:references:validate / node scripts/validate-references.cjs',
    'internal',
    'implemented',
    'node scripts/validate-references.cjs'
  ),
  (
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119-CLI',
    'port',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'contracts:rfc2119:validate / node scripts/validate-rfc2119.cjs',
    'internal',
    'implemented',
    'node scripts/validate-rfc2119.cjs'
  ),
  (
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT-NORMALIZER',
    'port',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'stripInlineCodeFragments(line) -> line without inline Markdown code fragments',
    'internal',
    'implemented',
    'node --test scripts/policy-validation-text.test.cjs'
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
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-CONTAINS-REFERENCES',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'contains',
    'outbound',
    'sync',
    null,
    'reference validation files become hidden under the broad policy component if this relation is absent',
    'repository_governance',
    jsonb_build_array('scripts/validate-references.cjs'),
    'implemented'
  ),
  (
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-CONTAINS-RFC2119',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'contains',
    'outbound',
    'sync',
    null,
    'RFC2119 validation files become hidden under the broad policy component if this relation is absent',
    'repository_governance',
    jsonb_build_array('scripts/validate-rfc2119.cjs'),
    'implemented'
  ),
  (
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-CONTAINS-TEXT',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'contains',
    'outbound',
    'sync',
    null,
    'shared text normalization becomes hidden authority if this relation is absent',
    'repository_governance',
    jsonb_build_array('scripts/policy-validation-text.cjs'),
    'implemented'
  ),
  (
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES-CALLS-TEXT',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'calls',
    'outbound',
    'sync',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT-NORMALIZER',
    'reference validation may report false positives if inline-code stripping drifts',
    'repository_governance',
    jsonb_build_array('scripts/validate-references.cjs', 'scripts/policy-validation-text.cjs'),
    'implemented'
  ),
  (
    'REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119-CALLS-TEXT',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'calls',
    'outbound',
    'sync',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT-NORMALIZER',
    'RFC2119 validation may report false positives if inline-code stripping drifts',
    'repository_governance',
    jsonb_build_array('scripts/validate-rfc2119.cjs', 'scripts/policy-validation-text.cjs'),
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
values
  (
    'PORT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES-VALIDATE',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'ValidateContractReferences',
    'command',
    'inbound',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES-CLI',
    array['node scripts/validate-references.cjs']::text[],
    'implemented'
  ),
  (
    'PORT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119-VALIDATE',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'ValidateRfc2119Language',
    'command',
    'inbound',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119-CLI',
    array['node scripts/validate-rfc2119.cjs']::text[],
    'implemented'
  ),
  (
    'PORT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT-NORMALIZE',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'NormalizePolicyValidationMarkdownText',
    'query',
    'inbound',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT-NORMALIZER',
    array['inline code containing lowercase normative words is removed before RFC2119 matching']::text[],
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
values
  (
    'STORAGE-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES-CONTRACT-DOCS-READ',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'docs/architecture/engine/contracts/**/*.md',
    'reads',
    'read_only',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES-CLI'
  ),
  (
    'STORAGE-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119-CONTRACT-DOCS-READ',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'docs/architecture/engine/contracts/**/*.md',
    'reads',
    'read_only',
    'CONTRACT-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119-CLI'
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
values
  (
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'scripts/validate-references.cjs',
    'integration',
    'behavior',
    true,
    'node scripts/validate-references.cjs'
  ),
  (
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'scripts/validate-rfc2119.cjs',
    'integration',
    'behavior',
    true,
    'node scripts/validate-rfc2119.cjs'
  ),
  (
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'scripts/policy-validation-text.test.cjs',
    'unit',
    'behavior',
    true,
    'node --test scripts/policy-validation-text.test.cjs'
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
values
  (
    'OBS-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES-CLI-OUTPUT',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'Reference validator prints REFS status line with files and finding counts.',
    'log',
    true,
    'implemented'
  ),
  (
    'OBS-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119-CLI-OUTPUT',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'RFC2119 validator prints RFC2119 status line with files and finding counts.',
    'log',
    true,
    'implemented'
  ),
  (
    'OBS-SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT-TEST-EVIDENCE',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
    'Text normalizer behavior is observable through policy-validation-text unit tests and code-symbol duplicate query output.',
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

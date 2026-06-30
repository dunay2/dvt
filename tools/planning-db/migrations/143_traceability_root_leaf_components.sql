-- Split SYS-TRACEABILITY-ROOT into traceability service, manifest, adapter,
-- lineage, runtime, and governance configuration leaf components.

drop table if exists pg_temp.traceability_root_leaf_map;

create temporary table traceability_root_leaf_map (
  component_id text primary key,
  name text not null,
  kind text not null,
  layer text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  port_name text not null,
  port_kind text not null,
  port_direction text not null,
  negative_tests text[] not null,
  public_api text[] not null,
  owns text[] not null,
  test_id text not null,
  test_path text not null,
  validation_command text not null
);

insert into traceability_root_leaf_map (
  component_id,
  name,
  kind,
  layer,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  repo_path,
  public_contract,
  fowler_signal,
  port_name,
  port_kind,
  port_direction,
  negative_tests,
  public_api,
  owns,
  test_id,
  test_path,
  validation_command
)
values
  (
    'SYS-TRACEABILITY-SERVICE-ENTRYPOINTS',
    'Traceability service package and CLI entrypoints',
    'package',
    'application',
    'TraceabilityService',
    'RunTraceabilityValidation;ReadTraceabilityServiceApi',
    'Owns the traceability package shell, CLI, service facade, exports, contracts, and local package test harness.',
    'Expose traceability validation as a package and CLI without owning manifest parsing internals or lineage runtime behavior.',
    'Traceability package exports, CLI invocation, service facade, package config, or package-level tests change.',
    'packages/@dvt/traceability-service/src/service.ts',
    'Traceability service facade and CLI boundary',
    'hidden_authority',
    'RunTraceabilityValidation',
    'command',
    'inbound',
    array['packages/@dvt/traceability-service/test/TraceabilityService.test.ts']::text[],
    array[
      'packages/@dvt/traceability-service/src/service.ts',
      'packages/@dvt/traceability-service/src/cli.ts',
      'packages/@dvt/traceability-service/src/index.ts'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/package.json',
      'packages/@dvt/traceability-service/pnpm-workspace.yaml',
      'packages/@dvt/traceability-service/tsconfig.json',
      'packages/@dvt/traceability-service/vitest.config.ts',
      'packages/@dvt/traceability-service/src/index.ts',
      'packages/@dvt/traceability-service/src/service.ts',
      'packages/@dvt/traceability-service/src/cli.ts',
      'packages/@dvt/traceability-service/src/contracts.ts',
      'packages/@dvt/traceability-service/src/types.ts',
      'packages/@dvt/traceability-service/test/TraceabilityService.test.ts'
    ]::text[],
    'TEST-SYS-TRACEABILITY-SERVICE-ENTRYPOINTS',
    'packages/@dvt/traceability-service/test/TraceabilityService.test.ts',
    'pnpm --filter @dvt/traceability-service test -- TraceabilityService.test.ts'
  ),
  (
    'SYS-TRACEABILITY-CORE-MANIFEST',
    'Traceability manifest validation core',
    'module',
    'domain',
    'TraceabilityManifest',
    'ValidateTraceabilityManifest;ReadTraceabilityIssueBaseline',
    'Owns manifest parsing, header parsing, issue baseline semantics, manifest JSON serialization, and validation core rules.',
    'Validate traceability manifests and issue baselines as deterministic domain rules independent of filesystem adapters.',
    'Manifest schema, header parser, issue baseline, validation result, or manifest JSON behavior changes.',
    'packages/@dvt/traceability-service/src/core/validator.ts',
    'Traceability manifest validation contract',
    'published_language',
    'ValidateTraceabilityManifest',
    'query',
    'inbound',
    array['packages/@dvt/traceability-service/test/manifestJson.test.ts']::text[],
    array[
      'packages/@dvt/traceability-service/src/core/manifest.ts',
      'packages/@dvt/traceability-service/src/core/validator.ts'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/src/core/**',
      'packages/@dvt/traceability-service/test/manifestJson.test.ts'
    ]::text[],
    'TEST-SYS-TRACEABILITY-CORE-MANIFEST',
    'packages/@dvt/traceability-service/test/manifestJson.test.ts',
    'pnpm --filter @dvt/traceability-service test -- manifestJson.test.ts'
  ),
  (
    'SYS-TRACEABILITY-FILESYSTEM-ADAPTERS',
    'Traceability filesystem scanners and ADR catalog adapters',
    'adapter',
    'adapter',
    'TraceabilityFilesystemAdapters',
    'ScanTraceabilityHeaders;ReadAdrCatalogFiles',
    'Owns filesystem-backed header scanning and ADR catalog file discovery adapters.',
    'Translate repository files into traceability inputs without changing manifest validation rules.',
    'Glob scanning, ADR catalog filesystem traversal, adapter IO failure behavior, or adapter integration changes.',
    'packages/@dvt/traceability-service/src/adapters/header-scanner-glob.ts',
    'Filesystem scanner and ADR catalog adapter boundary',
    'boundary_drift',
    'ScanTraceabilityHeaders',
    'query',
    'outbound',
    array['packages/@dvt/traceability-service/test/TraceabilityService.test.ts']::text[],
    array[
      'packages/@dvt/traceability-service/src/adapters/header-scanner-glob.ts',
      'packages/@dvt/traceability-service/src/adapters/adr-catalog-filesystem.ts'
    ]::text[],
    array['packages/@dvt/traceability-service/src/adapters/**']::text[],
    'TEST-SYS-TRACEABILITY-FILESYSTEM-ADAPTERS',
    'packages/@dvt/traceability-service/test/TraceabilityService.test.ts',
    'pnpm --filter @dvt/traceability-service test -- TraceabilityService.test.ts'
  ),
  (
    'SYS-TRACEABILITY-LINEAGE-CONTRACTS',
    'Traceability lineage contracts and error vocabulary',
    'module',
    'contracts',
    'LineageContracts',
    'ValidateLineageEventContract;ReadLineageErrorVocabulary',
    'Owns lineage type contracts, error and warning contracts, OpenLineage schema helpers, shared error support, and lineage exports.',
    'Keep lineage published language, failure vocabulary, and OpenLineage schema validation explicit and reusable.',
    'Lineage contract, warning/error vocabulary, schema validation, logging vocabulary, or exported lineage type changes.',
    'packages/@dvt/traceability-service/src/lineage/contracts.ts',
    'Lineage published language and OpenLineage schema contract',
    'published_language',
    'ValidateLineageEventContract',
    'query',
    'inbound',
    array[
      'packages/@dvt/traceability-service/test/lineage/errorSupport.test.ts',
      'packages/@dvt/traceability-service/test/lineage/facetSchema.validation.test.ts'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/src/lineage/contracts.ts',
      'packages/@dvt/traceability-service/src/lineage/openlineageSchema.ts'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/src/lineage/contracts.ts',
      'packages/@dvt/traceability-service/src/lineage/errorContract.ts',
      'packages/@dvt/traceability-service/src/lineage/errorPersistenceSupport.ts',
      'packages/@dvt/traceability-service/src/lineage/errors.ts',
      'packages/@dvt/traceability-service/src/lineage/errorSupport.ts',
      'packages/@dvt/traceability-service/src/lineage/index.ts',
      'packages/@dvt/traceability-service/src/lineage/logMessages.ts',
      'packages/@dvt/traceability-service/src/lineage/openlineageSchema.ts',
      'packages/@dvt/traceability-service/src/lineage/types.ts',
      'packages/@dvt/traceability-service/src/lineage/warningContract.ts',
      'packages/@dvt/traceability-service/test/lineage/errorSupport.test.ts',
      'packages/@dvt/traceability-service/test/lineage/facetSchema.validation.test.ts'
    ]::text[],
    'TEST-SYS-TRACEABILITY-LINEAGE-CONTRACTS',
    'packages/@dvt/traceability-service/test/lineage/facetSchema.validation.test.ts',
    'pnpm --filter @dvt/traceability-service test -- lineage/errorSupport.test.ts lineage/facetSchema.validation.test.ts'
  ),
  (
    'SYS-TRACEABILITY-LINEAGE-COMPILED-CODE',
    'Traceability compiled-code resolution',
    'module',
    'application',
    'CompiledCodeResolution',
    'ResolveCompiledCodeRef;ReadCompiledCodeArtifact',
    'Owns compiled-code references, reader composition, in-memory cache, URI readers, and retrying cached resolver behavior.',
    'Resolve compiled-code references for lineage mapping through explicit reader, cache, and retry policies.',
    'Compiled-code ref parsing, reader fallback, URI support, cache policy, retry policy, or resolver tests change.',
    'packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts',
    'Compiled-code resolution policy and reader boundary',
    'hidden_authority',
    'ResolveCompiledCodeRef',
    'query',
    'outbound',
    array[
      'packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts',
      'packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/src/lineage/compiledCodeRef.ts',
      'packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/src/lineage/compiledCodeRef.ts',
      'packages/@dvt/traceability-service/src/lineage/cache/**',
      'packages/@dvt/traceability-service/src/lineage/readers/**',
      'packages/@dvt/traceability-service/src/lineage/resolver/**',
      'packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts',
      'packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts'
    ]::text[],
    'TEST-SYS-TRACEABILITY-LINEAGE-COMPILED-CODE',
    'packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts',
    'pnpm --filter @dvt/traceability-service test -- lineage/CachedRetryCompiledCodeResolver.test.ts lineage/compiledCodeRef.test.ts'
  ),
  (
    'SYS-TRACEABILITY-LINEAGE-MAPPER',
    'Traceability OpenLineage mapper and facets',
    'module',
    'application',
    'StepStartedLineageMapper',
    'MapStepStartedLineageEvent;MapCompiledCodeResolutionWarning',
    'Owns StepStarted to OpenLineage mapping, SQL job facets, warning mapping, mapper fixtures, and golden mapper evidence.',
    'Build deterministic OpenLineage events from DVT step-started records and compiled-code resolution context.',
    'Mapper output shape, facet construction, warning mapping, fixture, golden event, or mapper test changes.',
    'packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts',
    'StepStarted OpenLineage mapping boundary',
    'evolutionary_architecture',
    'MapStepStartedLineageEvent',
    'query',
    'inbound',
    array[
      'packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts',
      'packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.golden.test.ts'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts',
      'packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/src/lineage/facets/**',
      'packages/@dvt/traceability-service/src/lineage/mapper/**',
      'packages/@dvt/traceability-service/test/fixtures/lineage/**',
      'packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.golden.test.ts',
      'packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts'
    ]::text[],
    'TEST-SYS-TRACEABILITY-LINEAGE-MAPPER',
    'packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.golden.test.ts',
    'pnpm --filter @dvt/traceability-service test -- lineage/StepStartedLineageMapper.test.ts lineage/StepStartedLineageMapper.golden.test.ts'
  ),
  (
    'SYS-TRACEABILITY-LINEAGE-SINK-OBSERVER',
    'Traceability OpenLineage sink and outbox observer',
    'adapter',
    'adapter',
    'LineageEventSink',
    'PublishOpenLineageEvent;ObserveOutboxLineageEvent',
    'Owns HTTP OpenLineage sink delivery and outbox observer translation from runtime records to lineage publication.',
    'Publish lineage events to an outbound OpenLineage sink without owning worker polling or mapper construction.',
    'HTTP sink behavior, outbox observer translation, event publication errors, or observer tests change.',
    'packages/@dvt/traceability-service/src/lineage/HttpOpenLineageSink.ts',
    'OpenLineage outbound sink and outbox observer boundary',
    'published_language',
    'PublishOpenLineageEvent',
    'event',
    'outbound',
    array['packages/@dvt/traceability-service/test/lineage/LineageOutboxObserver.test.ts']::text[],
    array[
      'packages/@dvt/traceability-service/src/lineage/HttpOpenLineageSink.ts',
      'packages/@dvt/traceability-service/src/lineage/LineageOutboxObserver.ts'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/src/lineage/HttpOpenLineageSink.ts',
      'packages/@dvt/traceability-service/src/lineage/LineageOutboxObserver.ts',
      'packages/@dvt/traceability-service/test/lineage/LineageOutboxObserver.test.ts'
    ]::text[],
    'TEST-SYS-TRACEABILITY-LINEAGE-SINK-OBSERVER',
    'packages/@dvt/traceability-service/test/lineage/LineageOutboxObserver.test.ts',
    'pnpm --filter @dvt/traceability-service test -- lineage/LineageOutboxObserver.test.ts'
  ),
  (
    'SYS-TRACEABILITY-LINEAGE-WORKER-RUNTIME',
    'Traceability lineage worker runtime',
    'service',
    'application',
    'LineageWorkerRuntime',
    'RunLineageWorkerRuntime;ProcessLineageOutboxRecord',
    'Owns the lineage worker runtime loop, record processor, dead-letter support, runtime config, tick behavior, and runtime test support.',
    'Run lineage worker polling and processing while delegating mapping, sink delivery, and compiled-code resolution to explicit ports.',
    'Lineage runtime loop, tick behavior, dead-letter support, runtime config, record processor, or lifecycle tests change.',
    'packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts',
    'Lineage worker runtime command boundary',
    'responsibility_overload',
    'RunLineageWorkerRuntime',
    'command',
    'inbound',
    array[
      'packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.lifecycle.test.ts',
      'packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.runOnce.test.ts'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts',
      'packages/@dvt/traceability-service/src/lineage/runtime/lineageWorkerTick.ts'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/src/lineage/LineageWorkerRuntime.ts',
      'packages/@dvt/traceability-service/src/lineage/runtime/**',
      'packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.*.test.ts',
      'packages/@dvt/traceability-service/test/lineage/lineageWorkerTick.test.ts',
      'packages/@dvt/traceability-service/test/lineage/support/**'
    ]::text[],
    'TEST-SYS-TRACEABILITY-LINEAGE-WORKER-RUNTIME',
    'packages/@dvt/traceability-service/test/lineage/LineageWorkerRuntime.lifecycle.test.ts',
    'pnpm --filter @dvt/traceability-service test -- lineage/LineageWorkerRuntime.lifecycle.test.ts lineage/LineageWorkerRuntime.runOnce.test.ts lineage/lineageWorkerTick.test.ts'
  ),
  (
    'SYS-TRACEABILITY-DOCS-CONFIG',
    'Traceability docs config and manifests',
    'module',
    'infra',
    'TraceabilityGovernanceDocs',
    'ReadTraceabilityGovernanceConfig;ReadTraceabilityManifestBaseline',
    'Owns traceability package docs, example config, root traceability config, manifest, and issue-baseline governance files.',
    'Keep traceability governance docs and repository-level manifests mapped without treating docs or manifests as service implementation files.',
    'Traceability docs, example config, root manifest, issue baseline, or package documentation changes.',
    'packages/@dvt/traceability-service/docs/README.md',
    'Traceability documentation and repository manifest boundary',
    'none',
    'ReadTraceabilityGovernanceConfig',
    'query',
    'inbound',
    array['scripts/planning-db-query.test.cjs']::text[],
    array[
      'traceability.config.json',
      'traceability.manifest.json',
      'traceability.issue-baseline.json'
    ]::text[],
    array[
      'packages/@dvt/traceability-service/README.md',
      'packages/@dvt/traceability-service/docs/**',
      'packages/@dvt/traceability-service/traceability.config.example.json',
      'traceability.config.json',
      'traceability.issue-baseline.json',
      'traceability.manifest.json'
    ]::text[],
    'TEST-SYS-TRACEABILITY-DOCS-CONFIG',
    'scripts/planning-db-query.test.cjs',
    'pnpm planning:db:query component-profile --component SYS-TRACEABILITY-DOCS-CONFIG --no-refresh --limit 80'
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
  'PLANNING-DB-TRACEABILITY-ROOT-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Traceability root leaf component mapping',
  'Architecture / Planning DB / Traceability',
  'review',
  'SYS-TRACEABILITY-ROOT directly owned service, manifest validation, adapters, lineage runtime, mapper, sink, docs, config, and test files. This design maps those responsibilities to explicit child components with command/query/event ports.',
  'responsibility_overload',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitecturePort;RecordArchitectureTestEvidence;ValidateComponentIntegrity',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

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
  'planning_query_store.governance_component_local_definitions',
  '1431431431431431431431431431431431431431431431431431431431431431',
  0,
  name,
  'component',
  'SYS-TRACEABILITY-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from traceability_root_leaf_map
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
from traceability_root_leaf_map
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
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from traceability_root_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from traceability_root_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Traceability files claimed by this leaf must not fall through to SYS-TRACEABILITY-ROOT.',
    0
  from traceability_root_leaf_map
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-quality shows no direct files owned by SYS-TRACEABILITY-ROOT and package tests remain green.',
    0
  from traceability_root_leaf_map
  union all
  select
    component_id,
    'consumer',
    'Traceability package consumers, planning governance reports, lineage workers, and ADR-0000 validation gates',
    0
  from traceability_root_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/architecture/command-query-rail-governance.md',
    0
  from traceability_root_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    1
  from traceability_root_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from traceability_root_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from traceability_root_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
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
  parent_component_id
)
values (
  'SYS-TRACEABILITY-ROOT',
  'Traceability root component',
  'service',
  'application',
  'Architecture / Traceability',
  'packages/@dvt/traceability-service/src/service.ts',
  'Composite traceability package, manifest validation, and lineage boundary with leaf-owned implementation files.',
  'node',
  'high',
  'review',
  null
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
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

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
  parent_component_id
)
select
  component_id,
  name,
  kind,
  layer,
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  case when component_id like 'SYS-TRACEABILITY-LINEAGE-%' then 'high' else 'medium' end,
  'review',
  'SYS-TRACEABILITY-ROOT'
from traceability_root_leaf_map
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
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || upper(port_kind),
  component_id,
  port_name,
  port_kind,
  port_direction,
  negative_tests,
  'implemented'
from traceability_root_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

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
from traceability_root_leaf_map
union all
select
  'RESP-SYS-TRACEABILITY-ROOT',
  'SYS-TRACEABILITY-ROOT',
  'Own the composite traceability package boundary and delegate service, manifest, adapter, lineage, runtime, docs, config, and test files to child components.',
  'Traceability package topology, lineage ownership, manifest validation ownership, or Planning DB component-map changes.',
  'TraceabilityRoot',
  'implemented'
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

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
  'REL-TRACEABILITY-ROOT-CONTAINS-' || replace(component_id, 'SYS-TRACEABILITY-', ''),
  'SYS-TRACEABILITY-ROOT',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this traceability leaf is remapped without a governed Planning DB component update.',
  'repo-local traceability governance',
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from traceability_root_leaf_map
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
select
  test_id,
  component_id,
  test_path,
  'unit',
  'behavior',
  true,
  validation_command
from traceability_root_leaf_map
union all
select
  'TEST-SYS-TRACEABILITY-ROOT-COMPONENT-PROFILE',
  'SYS-TRACEABILITY-ROOT',
  'scripts/planning-db-query.test.cjs',
  'architecture',
  'boundary',
  true,
  'pnpm planning:db:query component-profile --component SYS-TRACEABILITY-ROOT --no-refresh --limit 120 && pnpm planning:db:query component-drift --component SYS-TRACEABILITY-ROOT --no-refresh --limit 80'
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.traceability_root_leaf_map;

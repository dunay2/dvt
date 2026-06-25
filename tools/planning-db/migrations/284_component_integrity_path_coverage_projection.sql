-- Keep component path coverage checks on indexed materialized ownership
-- facts instead of scanning the materialized file_ownership CTE for every
-- architecture component. component_integrity_query is a priority Planning DB
-- guard used by prepush and operator triage, so path existence must use the
-- DB-owned component_engineering_file_ownership_projection indexes directly.

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
  'PLANNING-DB-COMPONENT-INTEGRITY-PATH-COVERAGE-PERF-20260625',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB component integrity path coverage projection',
  'Architecture / Planning DB',
  'review',
  'component_integrity_query spent most of its time checking component repo paths against a materialized CTE, which prevented existing file_path indexes from being used. The path coverage branch must query component_engineering_file_ownership_projection directly with split existence predicates.',
  'evolutionary_architecture',
  'CheckPlanningDbComponentIntegrity',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

create or replace view planning_query_store.component_integrity_query as
 WITH architecture_components AS MATERIALIZED (
         SELECT component_query.component_id,
            component_query.name,
            component_query.status,
            component_query.repo_path
           FROM architecture.component_query
        ), component_tree AS MATERIALIZED (
         SELECT component_engineering_component_tree_query.component_id,
            component_engineering_component_tree_query.name,
            component_engineering_component_tree_query.component_level,
            component_engineering_component_tree_query.status,
            component_engineering_component_tree_query.ddd_owner,
            component_engineering_component_tree_query.cq_rails,
            component_engineering_component_tree_query.direct_file_count,
            component_engineering_component_tree_query.descendant_file_count
           FROM planning_query_store.component_engineering_component_tree_query
        ), component_definitions AS MATERIALIZED (
         SELECT governance_component_definition_query.component_id,
            governance_component_definition_query.owned_concern,
            governance_component_definition_query.public_api AS declared_public_api,
            governance_component_definition_query.invariants,
            governance_component_definition_query.transitions,
            governance_component_definition_query.consumers
           FROM planning_query_store.governance_component_definition_query
        ), file_ownership AS MATERIALIZED (
         SELECT component_engineering_file_ownership_projection.file_path,
            component_engineering_file_ownership_projection.leaf_component_id,
            component_engineering_file_ownership_projection.owning_unit,
            component_engineering_file_ownership_projection.file_role,
            component_engineering_file_ownership_projection.governance_state
           FROM planning_query_store.component_engineering_file_ownership_projection
        ), component_test_file_counts AS MATERIALIZED (
         SELECT file_ownership.leaf_component_id AS component_id,
            count(*) FILTER (WHERE file_ownership.file_role = 'test'::text)::integer AS test_file_count
           FROM file_ownership
          WHERE file_ownership.leaf_component_id IS NOT NULL
          GROUP BY file_ownership.leaf_component_id
        ), engineering_projection AS MATERIALIZED (
         SELECT tree.component_id,
            tree.name,
            tree.component_level,
            tree.status,
            tree.ddd_owner,
            tree.direct_file_count,
            tree.descendant_file_count,
            COALESCE(test_counts.test_file_count, 0) AS test_file_count,
                CASE
                    WHEN COALESCE(test_counts.test_file_count, 0) > 0 THEN 'has_tests'::text
                    ELSE 'no_tests'::text
                END AS quality_state,
            definition.owned_concern,
                CASE
                    WHEN jsonb_array_length(COALESCE(definition.declared_public_api, '[]'::jsonb)) > 0 THEN definition.declared_public_api
                    WHEN NULLIF(btrim(COALESCE(tree.cq_rails, ''::text)), ''::text) IS NOT NULL AND tree.cq_rails !~* '^none(\s|$|-)'::text THEN jsonb_build_array(tree.cq_rails)
                    ELSE '[]'::jsonb
                END AS public_api,
            COALESCE(definition.invariants, '[]'::jsonb) AS invariants,
            COALESCE(definition.transitions, '[]'::jsonb) AS transitions,
            COALESCE(definition.consumers, '[]'::jsonb) AS consumers
           FROM component_tree tree
             LEFT JOIN component_definitions definition ON definition.component_id = tree.component_id
             LEFT JOIN component_test_file_counts test_counts ON test_counts.component_id = tree.component_id
        ), engineering_components AS MATERIALIZED (
         SELECT engineering_projection.component_id,
            engineering_projection.name,
            engineering_projection.component_level,
            engineering_projection.status,
            engineering_projection.ddd_owner,
            engineering_projection.direct_file_count,
            engineering_projection.descendant_file_count,
            engineering_projection.test_file_count,
            engineering_projection.quality_state,
                CASE
                    WHEN engineering_projection.owned_concern IS NOT NULL AND jsonb_array_length(engineering_projection.public_api) > 0 AND jsonb_array_length(engineering_projection.invariants) > 0 AND jsonb_array_length(engineering_projection.transitions) > 0 AND jsonb_array_length(engineering_projection.consumers) > 0 THEN 'declared'::text
                    ELSE 'incomplete'::text
                END AS metadata_state
           FROM engineering_projection
        ), architecture_test_evidence AS MATERIALIZED (
         SELECT component_test.component_id,
            count(*)::integer AS architecture_test_count
           FROM architecture.component_test
          WHERE component_test.required
          GROUP BY component_test.component_id
        ), architecture_maturity_evidence AS MATERIALIZED (
         SELECT component_maturity_query.component_id,
            component_maturity_query.name,
            component_maturity_query.maturity_score,
            component_maturity_query.missing_reasons
           FROM architecture.component_maturity_query
        ), fitness_gaps AS (
         SELECT 'fitness_gap'::text AS finding_kind,
            gap.severity,
            COALESCE(gap.source_component_id, gap.target_component_id, '-'::text) AS component_id,
            COALESCE(component.name, '-'::text) AS component_name,
            gap.fitness_state AS finding_state,
            gap.sample_source_path AS path,
                CASE
                    WHEN gap.source_component_id IS NOT NULL THEN gap.target_component_id
                    ELSE gap.source_component_id
                END AS related_component_id,
            NULL::text AS relation_id,
            gap.observation_count AS evidence_count,
            gap.action_hint,
            'architecture.component_fitness_gap_summary_query'::text AS source_view,
            jsonb_build_object('designId', gap.design_id, 'scanId', gap.scan_id, 'gapKind', gap.gap_kind, 'sourcePrefix', gap.source_prefix, 'targetPrefix', gap.target_prefix, 'relationType', gap.relation_type, 'testObservationCount', gap.test_observation_count, 'sampleImportLiteral', gap.sample_import_literal) AS metadata
           FROM architecture.component_fitness_gap_summary_query gap
             LEFT JOIN architecture_components component ON component.component_id = COALESCE(gap.source_component_id, gap.target_component_id)
        ), architecture_drift AS (
         SELECT 'architecture_drift'::text AS finding_kind,
            drift.severity,
                CASE
                    WHEN drift.subject_kind = 'component'::text THEN drift.subject_id
                    WHEN drift.subject_kind = 'relation'::text THEN relation.source_component_id
                    ELSE COALESCE(contract.component_id, '-'::text)
                END AS component_id,
            COALESCE(component.name, contract.component_name, '-'::text) AS component_name,
            'fail'::text AS finding_state,
            NULL::text AS path,
                CASE
                    WHEN drift.subject_kind = 'relation'::text THEN relation.target_component_id
                    ELSE NULL::text
                END AS related_component_id,
                CASE
                    WHEN drift.subject_kind = 'relation'::text THEN drift.subject_id
                    ELSE NULL::text
                END AS relation_id,
            1 AS evidence_count,
            'Resolve architecture drift or retire the affected subject explicitly.'::text AS action_hint,
            'architecture.component_drift_query'::text AS source_view,
            drift.metadata
           FROM architecture.component_drift_query drift
             LEFT JOIN architecture.component_relation_query relation ON relation.relation_id = drift.subject_id
             LEFT JOIN architecture.component_contract_query contract ON contract.contract_id = drift.subject_id
             LEFT JOIN architecture_components component ON component.component_id =
                CASE
                    WHEN drift.subject_kind = 'component'::text THEN drift.subject_id
                    WHEN drift.subject_kind = 'relation'::text THEN relation.source_component_id
                    ELSE contract.component_id
                END
        ), maturity_gaps AS (
         SELECT 'missing_maturity_evidence'::text AS finding_kind,
                CASE
                    WHEN ('missing_required_test'::text = ANY (maturity.missing_reasons)) OR ('missing_relation'::text = ANY (maturity.missing_reasons)) THEN 'error'::text
                    ELSE 'warning'::text
                END AS severity,
            maturity.component_id,
            maturity.name AS component_name,
            'warning'::text AS finding_state,
            component.repo_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            COALESCE(array_length(maturity.missing_reasons, 1), 0) AS evidence_count,
            'Complete component responsibility, relation, test, observability, and contract evidence.'::text AS action_hint,
            'architecture.component_maturity_query'::text AS source_view,
            jsonb_build_object('maturityScore', maturity.maturity_score, 'missingReasons', to_jsonb(maturity.missing_reasons)) AS metadata
           FROM architecture_maturity_evidence maturity
             JOIN architecture_components component ON component.component_id = maturity.component_id
          WHERE COALESCE(array_length(maturity.missing_reasons, 1), 0) > 0
        ), duplicate_repo_paths AS (
         SELECT 'duplicate_repo_path'::text AS finding_kind,
            'warning'::text AS severity,
            component.component_id,
            component.name AS component_name,
            'warning'::text AS finding_state,
            component.repo_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            rollup.component_count AS evidence_count,
            'Split overlapping component ownership or choose one canonical component for the repo path.'::text AS action_hint,
            'architecture.component_query'::text AS source_view,
            jsonb_build_object('repoPath', component.repo_path, 'componentIds', rollup.component_ids) AS metadata
           FROM architecture_components component
             JOIN ( SELECT architecture_components.repo_path,
                    count(*)::integer AS component_count,
                    jsonb_agg(architecture_components.component_id ORDER BY architecture_components.component_id) AS component_ids
                   FROM architecture_components
                  WHERE (architecture_components.status <> ALL (ARRAY['deprecated'::text, 'drift'::text])) AND NULLIF(btrim(architecture_components.repo_path), ''::text) IS NOT NULL AND architecture_components.repo_path <> '.'::text
                  GROUP BY architecture_components.repo_path
                 HAVING count(*) > 1) rollup ON rollup.repo_path = component.repo_path
        ), component_paths_without_files AS (
         SELECT 'component_path_without_files'::text AS finding_kind,
            'warning'::text AS severity,
            component.component_id,
            component.name AS component_name,
            'warning'::text AS finding_state,
            component.repo_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            0 AS evidence_count,
            'Remap the component path, retire the phantom component, or justify the virtual boundary explicitly.'::text AS action_hint,
            'architecture.component_query'::text AS source_view,
            jsonb_build_object('repoPath', component.repo_path, 'status', component.status) AS metadata
           FROM architecture_components component
          WHERE (component.status <> ALL (ARRAY['deprecated'::text, 'drift'::text])) AND NULLIF(btrim(component.repo_path), ''::text) IS NOT NULL AND component.repo_path <> '.'::text AND NOT EXISTS (
                 SELECT 1
                   FROM planning_query_store.component_engineering_file_ownership_projection ownership
                  WHERE ownership.file_path = component.repo_path
                ) AND NOT EXISTS (
                 SELECT 1
                   FROM planning_query_store.component_engineering_file_ownership_projection ownership
                  WHERE ownership.file_path like component.repo_path || '/%'
                )
        ), filesystem_coverage AS (
         SELECT 'filesystem_coverage'::text AS finding_kind,
            'blocker'::text AS severity,
            COALESCE(ownership.leaf_component_id, ownership.owning_unit, '-'::text) AS component_id,
            COALESCE(engineering.name, '-'::text) AS component_name,
            'fail'::text AS finding_state,
            ownership.file_path AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            1 AS evidence_count,
            'Assign the tracked file to one canonical component owner through Planning DB component ownership.'::text AS action_hint,
            'planning_query_store.component_engineering_file_ownership_query'::text AS source_view,
            jsonb_build_object('owningUnit', ownership.owning_unit, 'leafComponentId', ownership.leaf_component_id, 'fileRole', ownership.file_role, 'governanceState', ownership.governance_state) AS metadata
           FROM file_ownership ownership
             LEFT JOIN engineering_components engineering ON engineering.component_id = COALESCE(ownership.leaf_component_id, ownership.owning_unit)
          WHERE ownership.leaf_component_id IS NULL OR ownership.owning_unit IS NULL
        ), missing_architecture_components AS (
         SELECT 'component_missing_architecture_authority'::text AS finding_kind,
                CASE
                    WHEN engineering.component_level = ANY (ARRAY['system'::text, 'domain'::text]) THEN 'error'::text
                    ELSE 'warning'::text
                END AS severity,
            engineering.component_id,
            engineering.name AS component_name,
            'warning'::text AS finding_state,
            NULL::text AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            COALESCE(engineering.descendant_file_count, engineering.direct_file_count, 0) AS evidence_count,
            'Create, merge, or retire the architecture.component authority row for this governed component.'::text AS action_hint,
            'planning_query_store.component_engineering_component_tree_query'::text AS source_view,
            jsonb_build_object('componentLevel', engineering.component_level, 'dddOwner', engineering.ddd_owner, 'metadataState', engineering.metadata_state, 'qualityState', engineering.quality_state) AS metadata
           FROM engineering_components engineering
             LEFT JOIN architecture_components component ON component.component_id = engineering.component_id
          WHERE component.component_id IS NULL AND (engineering.status <> ALL (ARRAY['superseded'::text, 'legacy'::text]))
        ), component_evidence_gaps AS (
         SELECT 'component_evidence_gap'::text AS finding_kind,
            'warning'::text AS severity,
            engineering.component_id,
            engineering.name AS component_name,
            engineering.metadata_state AS finding_state,
            NULL::text AS path,
            NULL::text AS related_component_id,
            NULL::text AS relation_id,
            COALESCE(engineering.test_file_count, 0) + COALESCE(architecture_test_evidence.architecture_test_count, 0) AS evidence_count,
            'Connect tests, docs, public API, invariants, transitions, and consumers to the component profile.'::text AS action_hint,
            'planning_query_store.component_engineering_component_tree_query'::text AS source_view,
            jsonb_build_object('metadataState', engineering.metadata_state, 'testFileCount', engineering.test_file_count, 'architectureTestCount', COALESCE(architecture_test_evidence.architecture_test_count, 0), 'architectureMaturityScore', architecture_maturity_evidence.maturity_score, 'architectureMissingReasons', to_jsonb(architecture_maturity_evidence.missing_reasons), 'sourceSummary', jsonb_build_object('directFileCount', engineering.direct_file_count, 'descendantFileCount', engineering.descendant_file_count)) AS metadata
           FROM engineering_components engineering
             LEFT JOIN architecture_test_evidence ON architecture_test_evidence.component_id = engineering.component_id
             LEFT JOIN architecture_maturity_evidence ON architecture_maturity_evidence.component_id = engineering.component_id
          WHERE (engineering.status <> ALL (ARRAY['superseded'::text, 'legacy'::text])) AND NOT (architecture_maturity_evidence.component_id IS NOT NULL AND COALESCE(array_length(architecture_maturity_evidence.missing_reasons, 1), 0) = 0) AND (engineering.metadata_state <> 'declared'::text OR (COALESCE(engineering.test_file_count, 0) + COALESCE(architecture_test_evidence.architecture_test_count, 0)) = 0)
        )
 SELECT fitness_gaps.finding_kind,
    fitness_gaps.severity,
    fitness_gaps.component_id,
    fitness_gaps.component_name,
    fitness_gaps.finding_state,
    fitness_gaps.path,
    fitness_gaps.related_component_id,
    fitness_gaps.relation_id,
    fitness_gaps.evidence_count,
    fitness_gaps.action_hint,
    fitness_gaps.source_view,
    fitness_gaps.metadata
   FROM fitness_gaps
UNION ALL
 SELECT architecture_drift.finding_kind,
    architecture_drift.severity,
    architecture_drift.component_id,
    architecture_drift.component_name,
    architecture_drift.finding_state,
    architecture_drift.path,
    architecture_drift.related_component_id,
    architecture_drift.relation_id,
    architecture_drift.evidence_count,
    architecture_drift.action_hint,
    architecture_drift.source_view,
    architecture_drift.metadata
   FROM architecture_drift
UNION ALL
 SELECT maturity_gaps.finding_kind,
    maturity_gaps.severity,
    maturity_gaps.component_id,
    maturity_gaps.component_name,
    maturity_gaps.finding_state,
    maturity_gaps.path,
    maturity_gaps.related_component_id,
    maturity_gaps.relation_id,
    maturity_gaps.evidence_count,
    maturity_gaps.action_hint,
    maturity_gaps.source_view,
    maturity_gaps.metadata
   FROM maturity_gaps
UNION ALL
 SELECT duplicate_repo_paths.finding_kind,
    duplicate_repo_paths.severity,
    duplicate_repo_paths.component_id,
    duplicate_repo_paths.component_name,
    duplicate_repo_paths.finding_state,
    duplicate_repo_paths.path,
    duplicate_repo_paths.related_component_id,
    duplicate_repo_paths.relation_id,
    duplicate_repo_paths.evidence_count,
    duplicate_repo_paths.action_hint,
    duplicate_repo_paths.source_view,
    duplicate_repo_paths.metadata
   FROM duplicate_repo_paths
UNION ALL
 SELECT component_paths_without_files.finding_kind,
    component_paths_without_files.severity,
    component_paths_without_files.component_id,
    component_paths_without_files.component_name,
    component_paths_without_files.finding_state,
    component_paths_without_files.path,
    component_paths_without_files.related_component_id,
    component_paths_without_files.relation_id,
    component_paths_without_files.evidence_count,
    component_paths_without_files.action_hint,
    component_paths_without_files.source_view,
    component_paths_without_files.metadata
   FROM component_paths_without_files
UNION ALL
 SELECT filesystem_coverage.finding_kind,
    filesystem_coverage.severity,
    filesystem_coverage.component_id,
    filesystem_coverage.component_name,
    filesystem_coverage.finding_state,
    filesystem_coverage.path,
    filesystem_coverage.related_component_id,
    filesystem_coverage.relation_id,
    filesystem_coverage.evidence_count,
    filesystem_coverage.action_hint,
    filesystem_coverage.source_view,
    filesystem_coverage.metadata
   FROM filesystem_coverage
UNION ALL
 SELECT missing_architecture_components.finding_kind,
    missing_architecture_components.severity,
    missing_architecture_components.component_id,
    missing_architecture_components.component_name,
    missing_architecture_components.finding_state,
    missing_architecture_components.path,
    missing_architecture_components.related_component_id,
    missing_architecture_components.relation_id,
    missing_architecture_components.evidence_count,
    missing_architecture_components.action_hint,
    missing_architecture_components.source_view,
    missing_architecture_components.metadata
   FROM missing_architecture_components
UNION ALL
 SELECT component_evidence_gaps.finding_kind,
    component_evidence_gaps.severity,
    component_evidence_gaps.component_id,
    component_evidence_gaps.component_name,
    component_evidence_gaps.finding_state,
    component_evidence_gaps.path,
    component_evidence_gaps.related_component_id,
    component_evidence_gaps.relation_id,
    component_evidence_gaps.evidence_count,
    component_evidence_gaps.action_hint,
    component_evidence_gaps.source_view,
    component_evidence_gaps.metadata
   FROM component_evidence_gaps;;

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
values (
  'local#PLANNING-DB-COMPONENT-INTEGRITY-PATH-COVERAGE-PERF-20260625#query#checkcomponentintegrity',
  'PLANNING-DB-COMPONENT-INTEGRITY-PATH-COVERAGE-PERF-20260625',
  'implemented',
  'CheckComponentIntegrity',
  'checkcomponentintegrity',
  'query',
  'PlanningDbComponentIntegrityReadModel',
  'implemented',
  jsonb_build_array(
    'tools/planning-db/migrations/284_component_integrity_path_coverage_projection.sql#component_integrity_query',
    'scripts/planning-db-migrate.test.cjs#tracked migrations keep component path coverage on indexed ownership projection'
  ),
  jsonb_build_array(
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/284_component_integrity_path_coverage_projection.sql'
  ),
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    'scripts/planning-db-migrate.test.cjs',
    'tools/planning-db/migrations/284_component_integrity_path_coverage_projection.sql'
  ),
  jsonb_build_array(
    'node --test --test-name-pattern "tracked migrations keep component path coverage on indexed ownership projection" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test --test-name-pattern "tracked migrations keep component path coverage on indexed ownership projection" scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:integrity:check',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/284_component_integrity_path_coverage_projection.sql',
  coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path =
        'tools/planning-db/migrations/284_component_integrity_path_coverage_projection.sql'
    ),
    repeat('0', 64)
  ),
  jsonb_build_object(
    'name', 'CheckComponentIntegrity',
    'type', 'query',
    'dddOwner', 'PlanningDbComponentIntegrityReadModel',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'PLANNING-DB-COMPONENT-INTEGRITY-PATH-COVERAGE-PERF-20260625',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan',
    'Planning DB component integrity keeps component repo path coverage checks on the indexed component_engineering_file_ownership_projection instead of scanning the materialized file_ownership CTE for every component.',
    'componentGuides', jsonb_build_array(
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'userStories', jsonb_build_array(
      'As an operator running prepush, component integrity should not spend most of its time scanning path coverage for every architecture component.',
      'As a maintainer, component path coverage should use the DB-owned file ownership projection indexes instead of recomputing ownership facts at read time.',
      'As a Planning DB reviewer, the performance optimization should remain visible as a query rail with migration and test evidence.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/guides/ai-work-protocol.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      'scripts/planning-db-migrate.test.cjs',
      'tools/planning-db/migrations/284_component_integrity_path_coverage_projection.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/**',
      'packages/**',
      'docs/planning/state/agent-lane-a.yaml',
      'docs/planning/state/agent-lane-b.yaml',
      'docs/planning/state/agent-lane-c.yaml',
      'docs/planning/state/agent-lane-d.yaml',
      'docs/planning/state/agent-lane-e.yaml'
    ),
    'domainObjects', jsonb_build_array(
      'PlanningDbComponentIntegrityReadModel',
      'ComponentEngineeringFileOwnershipProjection'
    ),
    'fowlerSignals', jsonb_build_array(
      'slow_query_projection',
      'materialized_view_boundary',
      'priority_guard_performance'
    ),
    'architectureGuards', jsonb_build_array(
      'node --test --test-name-pattern "tracked migrations keep component path coverage on indexed ownership projection" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:integrity:check',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(
      'not_applicable:planning_db_read_model_performance'
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test --test-name-pattern "tracked migrations keep component path coverage on indexed ownership projection" scripts/planning-db-migrate.test.cjs',
      'pnpm planning:db:integrity:check',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'CheckComponentIntegrity',
        'type', 'query',
        'dddOwner', 'PlanningDbComponentIntegrityReadModel',
        'status', 'implemented'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'component-integrity-path-coverage-indexed-projection',
        'redTest',
        'node --test --test-name-pattern "tracked migrations keep component path coverage on indexed ownership projection" scripts/planning-db-migrate.test.cjs',
        'expectedFailure',
        'component_integrity_query path coverage reads from the file_ownership CTE with an OR predicate, preventing indexed ownership projection lookups.',
        'patchSurfaces', jsonb_build_array(
          'scripts/planning-db-migrate.test.cjs',
          'tools/planning-db/migrations/284_component_integrity_path_coverage_projection.sql'
        ),
        'greenTest',
        'node --test --test-name-pattern "tracked migrations keep component path coverage on indexed ownership projection" scripts/planning-db-migrate.test.cjs'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'component_integrity_query',
        'path', 'tools/planning-db/migrations/284_component_integrity_path_coverage_projection.sql',
        'dddOwner', 'PlanningDbComponentIntegrityReadModel',
        'cqRails', jsonb_build_array('CheckComponentIntegrity'),
        'fowlerSignals', jsonb_build_array('slow_query_projection', 'priority_guard_performance'),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'not_applicable:planning_db_read_model_performance',
        'unitTests', jsonb_build_array(
          'node --test --test-name-pattern "tracked migrations keep component path coverage on indexed ownership projection" scripts/planning-db-migrate.test.cjs'
        )
      )
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();

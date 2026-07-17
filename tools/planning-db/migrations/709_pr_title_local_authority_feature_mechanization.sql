-- Mechanize the existing ValidatePrMetadata query through the repository-owned
-- title validator so GitHub CI does not depend on a second REST-backed policy.

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
  'local#A-CI-PR-TITLE-LOCAL-AUTHORITY-1#query#validateprmetadata',
  'A-CI-PR-TITLE-LOCAL-AUTHORITY-1',
  'implemented',
  'ValidatePrMetadata',
  'validateprmetadata',
  'query',
  'PrQualityGatePolicy',
  'implemented',
  jsonb_build_array('scripts/validate-pr-title.cjs#validate'),
  jsonb_build_array(
    '.github/workflows/pr-quality-gate.yml',
    'scripts/validate-pr-title.cjs',
    'tools/ci/github-collaboration-governance.test.mjs',
    'AGENTS.md',
    'tools/planning-db/migrations/709_pr_title_local_authority_feature_mechanization.sql'
  ),
  jsonb_build_array('AGENTS.md'),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  jsonb_build_array(
    '.github/workflows/pr-quality-gate.yml',
    'scripts/validate-pr-title.cjs',
    'tools/ci/github-collaboration-governance.test.mjs',
    'AGENTS.md',
    'tools/planning-db/migrations/709_pr_title_local_authority_feature_mechanization.sql'
  ),
  jsonb_build_array(
    'node --test tools/ci/github-collaboration-governance.test.mjs',
    'pnpm pr:validate-title "fix(ci): Use canonical PR title validator"'
  ),
  jsonb_build_array(
    'pnpm test:ci-tools:static',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/709_pr_title_local_authority_feature_mechanization.sql',
  md5('A-CI-PR-TITLE-LOCAL-AUTHORITY-1:ValidatePrMetadata:709'),
  jsonb_build_object(
    'name', 'ValidatePrMetadata',
    'type', 'query',
    'status', 'implemented',
    'dddOwner', 'PrQualityGatePolicy'
  ),
  jsonb_build_object(
    'version', 1,
    'featureId', 'A-CI-PR-TITLE-LOCAL-AUTHORITY-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Use the canonical repository title validator in the existing PR quality workflow and prove the workflow delegates to that single policy authority.',
    'componentGuides', jsonb_build_array(
      'SYS-CI-GOVERNANCE-GITHUB',
      'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
      'SYS-CI-GOVERNANCE-TOOLS-CI-PR-QUALITY'
    ),
    'userStories', jsonb_build_array(
      'A contributor receives the same Conventional Commits title decision locally and in GitHub CI.',
      'A pull request title can be validated while the GitHub REST API is degraded.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md'
    ),
    'allowedImplementationSurfaces', jsonb_build_array(
      '.github/workflows/pr-quality-gate.yml',
      'scripts/validate-pr-title.cjs',
      'tools/ci/github-collaboration-governance.test.mjs',
      'AGENTS.md',
      'tools/planning-db/migrations/709_pr_title_local_authority_feature_mechanization.sql'
    ),
    'forbiddenImplementationSurfaces', jsonb_build_array(
      '.github/workflows/**#parallel_pr_title_policy',
      'tools/ci/**#second_pr_title_validator'
    ),
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', 'ValidatePrMetadata',
        'type', 'query',
        'dddOwner', 'PrQualityGatePolicy',
        'status', 'implemented'
      )
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object(
        'name', 'PullRequestMetadata',
        'type', 'validation input',
        'owner', 'PrQualityGatePolicy'
      ),
      jsonb_build_object(
        'name', 'PullRequestTitleValidation',
        'type', 'validation result',
        'owner', 'PrQualityGatePolicy'
      )
    ),
    'fowlerSignals', jsonb_build_array(
      'single_source_of_truth',
      'service_layer',
      'duplicate_authority_removed'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object(
        'name', 'GitHub collaboration governance',
        'command', 'node --test tools/ci/github-collaboration-governance.test.mjs'
      ),
      jsonb_build_object(
        'name', 'Static CI tool suite',
        'command', 'pnpm test:ci-tools:static'
      )
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'not_applicable:repository_metadata_policy',
        'command', 'pnpm pr:validate-title "fix(ci): Use canonical PR title validator"'
      )
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'id', 'pr-title-local-authority',
        'redTest', 'node --test tools/ci/github-collaboration-governance.test.mjs',
        'expectedFailure', 'The PR quality workflow delegates title validation to the REST-backed third-party action instead of the canonical local validator.',
        'patchSurfaces', jsonb_build_array(
          '.github/workflows/pr-quality-gate.yml',
          'scripts/validate-pr-title.cjs',
          'tools/ci/github-collaboration-governance.test.mjs',
          'AGENTS.md'
        ),
        'greenTest', 'pnpm test:ci-tools:static'
      )
    ),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'validate',
        'path', 'scripts/validate-pr-title.cjs',
        'dddOwner', 'PrQualityGatePolicy',
        'cqRails', jsonb_build_array('ValidatePrMetadata'),
        'fowlerSignals', jsonb_build_array('single_source_of_truth', 'pure_function'),
        'architectureGuard', 'tools/ci/github-collaboration-governance.test.mjs',
        'cypressCoverage', 'not_applicable:repository_metadata_policy',
        'unitTests', jsonb_build_array(
          'tools/ci/github-collaboration-governance.test.mjs'
        )
      )
    ),
    'completionGate', jsonb_build_array(
      'pnpm test:ci-tools:static',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
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
  revision = planning_query_store.feature_mechanization_local_rails.revision + 1,
  updated_at = now();

-- Reconcile rails whose governing plans already declare implemented/closed
-- mechanization but whose catalog rows lacked implementation_refs. This keeps
-- the vocabulary query focused on real unimplemented product rails.

with implemented_rails(
  rail_name,
  rail_type,
  ddd_owner,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  implementation_note
) as (
  values
    (
      'ApplyArchitectureDependencyBoundaryGate',
      'command',
      'Repository CI governance baseline',
      jsonb_build_array(
        '.github/workflows/pr-quality-gate.yml#Validate architecture dependency boundaries',
        'package.json#arch:deps',
        'tools/ci/check-architecture-dependencies.mjs',
        'tools/ci/architecture-dependency-guard.test.mjs'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/architecture-dependency-boundary-guard-implementation-plan-20260502.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/guides/testing-and-ci-capabilities.md'
      ),
      jsonb_build_array(
        'pnpm arch:deps',
        'PR Quality Gate'
      ),
      jsonb_build_array(
        'PR quality gate and local scripts must both run pnpm arch:deps.'
      ),
      jsonb_build_array(
        'node --test tools/ci/architecture-dependency-guard.test.mjs',
        'pnpm arch:deps'
      ),
      'The architecture dependency guard is wired through package.json and the PR Quality Gate.'
    ),
    (
      'ApplyPrQualityGovernanceParity',
      'command',
      'Repository CI governance baseline',
      jsonb_build_array(
        '.github/workflows/pr-quality-gate.yml',
        'tools/ci/workflow-pattern-parity.test.mjs'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/guides/testing-and-ci-capabilities.md'
      ),
      jsonb_build_array(
        'PR Quality Gate',
        'pnpm verify:prepush governance subset'
      ),
      jsonb_build_array(
        'Remote PR quality workflow must cover the governed prepush subset.'
      ),
      jsonb_build_array(
        'node --test tools/ci/workflow-pattern-parity.test.mjs'
      ),
      'CI governance parity is enforced by the PR quality workflow and parity test.'
    ),
    (
      'ApplyWorkflowDependencyPins',
      'command',
      'Workflow dependency policy',
      jsonb_build_array(
        '.github/workflows/create-labels.yml',
        '.github/workflows/docs-deploy.yml',
        'tools/ci/workflow-pattern-parity.test.mjs'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/guides/testing-and-ci-capabilities.md'
      ),
      jsonb_build_array(
        'GitHub workflow action pins',
        'docs builder dependency pin'
      ),
      jsonb_build_array(
        'Workflow action and docs builder references must stay pinned.'
      ),
      jsonb_build_array(
        'node --test tools/ci/workflow-pattern-parity.test.mjs'
      ),
      'Workflow dependency pins are applied in tracked GitHub workflow files and guarded by parity tests.'
    ),
    (
      'CheckWorkflowDependencyPins',
      'query',
      'Workflow dependency policy',
      jsonb_build_array(
        'tools/ci/workflow-pattern-parity.test.mjs#workflow dependency pins'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/guides/testing-and-ci-capabilities.md'
      ),
      jsonb_build_array(
        'node --test tools/ci/workflow-pattern-parity.test.mjs'
      ),
      jsonb_build_array(
        'Unpinned governed workflow dependencies must fail the parity test.'
      ),
      jsonb_build_array(
        'node --test tools/ci/workflow-pattern-parity.test.mjs'
      ),
      'The workflow-pattern parity test implements the dependency pin query.'
    ),
    (
      'ApplyContractsWorkflowCredentialPosture',
      'command',
      'Contracts workflow runtime credential posture',
      jsonb_build_array(
        '.github/workflows/contracts.yml',
        'tools/ci/workflow-pattern-parity.test.mjs'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/guides/testing-and-ci-capabilities.md'
      ),
      jsonb_build_array(
        'Contracts workflow runtime credential derivation'
      ),
      jsonb_build_array(
        'Contracts workflow must not reintroduce reusable PostgreSQL password literals.'
      ),
      jsonb_build_array(
        'node --test tools/ci/workflow-pattern-parity.test.mjs'
      ),
      'Contracts workflow credential posture is applied in contracts.yml and guarded by parity tests.'
    ),
    (
      'CheckContractsWorkflowCredentialPosture',
      'query',
      'Contracts workflow runtime credential posture',
      jsonb_build_array(
        'tools/ci/workflow-pattern-parity.test.mjs#contracts workflow credential posture'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/guides/testing-and-ci-capabilities.md'
      ),
      jsonb_build_array(
        'node --test tools/ci/workflow-pattern-parity.test.mjs'
      ),
      jsonb_build_array(
        'Reusable workflow database credentials must be absent.'
      ),
      jsonb_build_array(
        'node --test tools/ci/workflow-pattern-parity.test.mjs'
      ),
      'The workflow-pattern parity test implements the contracts credential posture query.'
    ),
    (
      'ApplyPrecommitHookLifecycleDedupe',
      'command',
      'Repository Git hook lifecycle',
      jsonb_build_array(
        'package.json#hooks:precommit',
        '.husky/pre-commit',
        'tools/ci/precommit-hook-wiring.test.mjs'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/precommit-hook-lifecycle-dedupe-plan-20260508.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/guides/testing-and-ci-capabilities.md'
      ),
      jsonb_build_array(
        'pnpm run hooks:precommit',
        '.husky/pre-commit'
      ),
      jsonb_build_array(
        'Root package must not define a lifecycle precommit script.'
      ),
      jsonb_build_array(
        'node --test tools/ci/precommit-hook-wiring.test.mjs'
      ),
      'The precommit lifecycle dedupe command is implemented by hooks:precommit wiring.'
    ),
    (
      'DocumentPrecommitHookLifecycleState',
      'command',
      'Repository CI process guidance',
      jsonb_build_array(
        'docs/guides/testing-and-ci-capabilities.md#hooks:precommit',
        'docs/planning/proposals/mandatory/governance-and-docs/precommit-hook-lifecycle-dedupe-plan-20260508.md'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/precommit-hook-lifecycle-dedupe-plan-20260508.md',
        'docs/guides/testing-and-ci-capabilities.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/guides/testing-and-ci-capabilities.md'
      ),
      jsonb_build_array(
        'Testing and CI capabilities guide'
      ),
      jsonb_build_array(
        'Contributor docs must name hooks:precommit, not the obsolete precommit lifecycle path.'
      ),
      jsonb_build_array(
        'node --test tools/ci/precommit-hook-wiring.test.mjs'
      ),
      'The current hook lifecycle is documented in the canonical testing and CI guide.'
    ),
    (
      'QueryGovernedFeatureWork',
      'query',
      'DocsDispositionQueue',
      jsonb_build_array(
        'tools/planning-db/migrations/019_planning_work_intake_query.sql#planning_work_intake_query',
        'scripts/planning-db-query.cjs#feature-work',
        'scripts/planning-db-query.test.cjs#readFeatureWorkRows'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/planning/status/governance-document-rule-inventory.md'
      ),
      jsonb_build_array(
        'pnpm planning:db:query feature-work',
        'planning_query_store.planning_work_intake_query'
      ),
      jsonb_build_array(
        'Governed feature work must come from DB views, not ad hoc document scans.'
      ),
      jsonb_build_array(
        'node --test scripts/planning-db-query.test.cjs'
      ),
      'The Planning DB work-intake query and feature-work CLI implement QueryGovernedFeatureWork.'
    ),
    (
      'TemporalWorkerScalingStrategy',
      'query',
      'Runtime / SRE worker topology policy',
      jsonb_build_array(
        'packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts',
        'docs/architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md',
        'docs/runbooks/temporal-worker-scaling-operations.md'
      ),
      jsonb_build_array(
        'docs/planning/proposals/mandatory/runtime-and-contracts/ar-d3-worker-scaling-strategy-plan-20260514.md'
      ),
      jsonb_build_array(
        'docs/architecture/command-query-rail-governance.md',
        'docs/adr/ADR-0001-temporal-integration-test-policy.md',
        'docs/adr/ADR-0003-execution-model.md'
      ),
      jsonb_build_array(
        'Temporal worker scaling strategy docs',
        'Temporal adapter architecture test'
      ),
      jsonb_build_array(
        'Worker scaling docs must not imply a global shared worker pool unsupported by the adapter.'
      ),
      jsonb_build_array(
        'pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts'
      ),
      'The AR-D3 strategy is implemented as an operator policy query guarded by an architecture test.'
    )
)
update planning_query_store.command_query_rails rail
set
  ddd_owner = implemented.ddd_owner,
  mechanization_status = 'implemented',
  rail_status = 'implemented',
  implementation_refs = implemented.implementation_refs,
  documentation_refs = implemented.documentation_refs,
  governing_sources = implemented.governing_sources,
  allowed_implementation_surfaces = implemented.allowed_implementation_surfaces,
  architecture_guards = implemented.architecture_guards,
  completion_gate = implemented.completion_gate,
  raw_rail = rail.raw_rail || jsonb_build_object(
    'status',
    'implemented',
    'dddOwner',
    implemented.ddd_owner,
    'implementationRefs',
    implemented.implementation_refs,
    'implementationNote',
    implemented.implementation_note,
    'reconciledBy',
    '153_reconcile_ci_and_policy_gap_rails'
  ),
  raw_manifest = rail.raw_manifest || jsonb_build_object(
    'mechanizationStatus',
    'implemented',
    'implementationRefs',
    implemented.implementation_refs,
    'governingSources',
    implemented.governing_sources
  )
from implemented_rails implemented
where rail.rail_name = implemented.rail_name
  and rail.rail_type = implemented.rail_type;

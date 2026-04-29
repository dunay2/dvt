/**
 * Owned concern: guard semantic architecture rules for the plan admission
 * matrix component.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../../..');
const CONTRACTS_SRC_ROOT = join(import.meta.dirname, '../src');
const PLAN_ADMISSION_SOURCE = join(CONTRACTS_SRC_ROOT, 'contracts/planner/PlanAdmission.v1.ts');
const PLAN_VERSION_SOURCE = join(CONTRACTS_SRC_ROOT, 'contracts/planner/PlanVersion.v1.ts');
const PLAN_ADMISSION_CONTRACT_TEST = join(
  import.meta.dirname,
  'plan-admission-matrix.contract.test.ts'
);
const PLAN_VERSION_CONTRACT_TEST = join(import.meta.dirname, 'plan-version.contract.test.ts');
const ENGINE_POLICY_SOURCE = join(
  REPO_ROOT,
  'packages/@dvt/engine/src/contracts/PlanAdmissionPolicy.ts'
);
const ENGINE_PLAN_VERSION_POLICY_SOURCE = join(
  REPO_ROOT,
  'packages/@dvt/engine/src/contracts/PlanVersionPolicy.ts'
);
const ENGINE_START_RUN_VALIDATION_POLICY_SOURCE = join(
  REPO_ROOT,
  'packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts'
);
const ENGINE_PUBLIC_INDEX = join(REPO_ROOT, 'packages/@dvt/engine/src/index.ts');
const ENGINE_WORKFLOW_TEST = join(
  REPO_ROOT,
  'packages/@dvt/engine/test/core/WorkflowEngine.test.ts'
);
const COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/contracts/plan-admission-matrix.md'
);
const ADR_0036 = join(
  REPO_ROOT,
  'docs/adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md'
);
const USER_STORIES_DOC = join(
  REPO_ROOT,
  'docs/architecture/components/engine/contracts/plan-admission-user-stories.md'
);
const MAILBOX_REVIEW = join(
  REPO_ROOT,
  'buzon/20260429-codex-fowler-plan-admission-hard-cut-analysis-and-remediation.md'
);

const ACTIVE_SURFACES = [
  PLAN_ADMISSION_SOURCE,
  PLAN_VERSION_SOURCE,
  PLAN_ADMISSION_CONTRACT_TEST,
  PLAN_VERSION_CONTRACT_TEST,
  ENGINE_POLICY_SOURCE,
  ENGINE_WORKFLOW_TEST,
  COMPONENT_GUIDE,
  USER_STORIES_DOC,
  ADR_0036,
  MAILBOX_REVIEW,
] as const;
const RETIRED_NAME_FRAGMENTS = [
  'Plan' + 'Compatibility',
  'plan-' + 'compatibility',
  'EXECUTION_PLAN_' + 'COMPATIBILITY',
  'SUPPORTED_EXECUTION_PLAN_' + 'COMPATIBILITY',
  'assertSupportedPlan' + 'Compatibility',
  'isSupportedExecutionPlan' + 'Compatibility',
] as const;
const NON_CURRENT_PLAN_VERSION_LITERALS = [
  '2' + '.3',
  '9' + '.0',
  '9' + '.9',
  '3' + '.0',
  '2' + '.30',
  '1' + '.0.0',
] as const;

describe('ExecutionPlan admission matrix architecture', () => {
  it('documents the component with API, invariants, transitions, consumers, user stories, diagrams, and drift guards', () => {
    expect(existsSync(COMPONENT_GUIDE)).toBe(true);

    const guide = readFileSync(COMPONENT_GUIDE, 'utf8');
    for (const section of [
      '## Public API',
      '## Invariants',
      '## Component Map',
      '## Transitions',
      '## Consumers',
      '## User Stories',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(guide).toContain(section);
    }

    expect(guide).toContain('PlanAdmission.v1.ts');
    expect(guide).toContain('PlanAdmissionPolicy.ts');
    expect(guide).toContain('isAdmittedExecutionPlanPair');
    expect(guide).toContain('assertAdmittedPlanPair');
    expect(guide).toContain('```mermaid');
  });

  it('declares semantic owned concern docblocks on active code and test modules', () => {
    expect(readFileSync(PLAN_ADMISSION_SOURCE, 'utf8')).toContain(
      'Owned concern: publish the executable admission truth'
    );
    expect(readFileSync(ENGINE_POLICY_SOURCE, 'utf8')).toContain(
      'Owned concern: fail closed at engine ingress'
    );
    expect(readFileSync(PLAN_ADMISSION_CONTRACT_TEST, 'utf8')).toContain(
      'Owned concern: verify executable plan admission pairs and negative cases.'
    );
  });

  it('ships scenario-driven user stories for every admission branch', () => {
    expect(existsSync(USER_STORIES_DOC)).toBe(true);

    const stories = readFileSync(USER_STORIES_DOC, 'utf8');
    for (const scenario of [
      'US-PA-1',
      'US-PA-2',
      'US-PA-3',
      'US-PA-4',
      'US-PA-5',
      'US-PA-6',
      'US-PA-7',
      'US-PA-8',
      'US-PA-9',
      'Given the current pair',
      'Given an unsupported future schema',
      'Given an older schema',
      'Given an unknown plan version',
      'Given blank admission inputs',
      'Given a renamed admission surface',
      'Given a plan verifier call',
      'Given a verifier call',
    ]) {
      expect(stories).toContain(scenario);
    }
  });

  it('saves the Fowler review in the branch mailbox with findings and remediation rationale', () => {
    expect(existsSync(MAILBOX_REVIEW)).toBe(true);

    const review = readFileSync(MAILBOX_REVIEW, 'utf8');
    for (const section of [
      '## Fowler Architecture Analysis',
      '## Mature-System Comparison',
      '## Improved Patterns',
      '## Antipatterns Removed Or Prevented',
      '## Component Grouping',
      '## Repetitions And Drift Fixed',
      '## Future Lessons',
      '## Opportunities',
    ]) {
      expect(review).toContain(section);
    }
    expect(review).toContain('```mermaid');
  });

  it('keeps active admission surfaces free of retired compatibility naming', () => {
    for (const path of ACTIVE_SURFACES) {
      if (!existsSync(path)) continue;

      const source = readFileSync(path, 'utf8');
      for (const retiredName of RETIRED_NAME_FRAGMENTS) {
        expect(source, path).not.toContain(retiredName);
      }
    }
  });

  it('keeps active planVersion examples on the development-only 1.0 line', () => {
    for (const path of ACTIVE_SURFACES) {
      if (!existsSync(path)) continue;

      const source = readFileSync(path, 'utf8');
      for (const retiredVersion of NON_CURRENT_PLAN_VERSION_LITERALS) {
        expect(source, path).not.toMatch(planVersionLinePattern(retiredVersion));
      }
    }
  });

  it('keeps start-run plan admission behind one semantic policy boundary', () => {
    expect(existsSync(ENGINE_PLAN_VERSION_POLICY_SOURCE)).toBe(false);

    for (const path of [
      ENGINE_START_RUN_VALIDATION_POLICY_SOURCE,
      ENGINE_PUBLIC_INDEX,
      ENGINE_WORKFLOW_TEST,
    ]) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toContain('PlanVersionPolicy');
      expect(source, path).not.toContain('assertSupportedPlanVersion');
    }

    expect(readFileSync(ADR_0036, 'utf8')).toContain(
      'ExecutionPlan planVersion registry and runtime admission matrix'
    );
  });
});

function planVersionLinePattern(version: string): RegExp {
  return new RegExp(`planVersion[^\\r\\n]*${escapeRegExp(version)}`, 'u');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

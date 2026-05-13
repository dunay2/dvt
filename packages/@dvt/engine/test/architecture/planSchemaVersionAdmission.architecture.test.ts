/**
 * @ownedConcern Guard semantic encapsulation for start-run schema-version admission.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import {
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { InvalidSchemaVersionError } from '../../src/contracts/errors.js';
import { assertSupportedPlanSchemaVersion } from '../../src/contracts/PlanSchemaVersionPolicy.js';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const ENGINE_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../../..');
const POLICY_SOURCE = join(ENGINE_ROOT, 'contracts/PlanSchemaVersionPolicy.ts');
const START_RUN_VALIDATION_SOURCE = join(
  ENGINE_ROOT,
  'services/startRun/StartRunValidationPolicy.ts'
);
const COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/contracts/plan-schema-version-admission-component.md'
);
const USER_STORIES = join(
  REPO_ROOT,
  'docs/architecture/components/engine/contracts/plan-schema-version-admission-user-stories.md'
);
const MAILBOX_ANALYSIS = join(
  REPO_ROOT,
  'buzon/20260513-codex-fowler-ea-20260429-01-schema-version-admission-analysis.md'
);
const PROPOSAL = join(
  REPO_ROOT,
  'docs/planning/proposals/mandatory/runtime-and-contracts/ea-20260429-01-plan-schema-version-admission-plan-20260513.md'
);

describe('Plan schema-version admission architecture', () => {
  it('encapsulates schema-version language behind one semantic engine policy', () => {
    expect(existsSync(POLICY_SOURCE)).toBe(true);

    const policy = readFileSync(POLICY_SOURCE, 'utf8');
    const validation = readFileSync(START_RUN_VALIDATION_SOURCE, 'utf8');

    expect(policy.slice(0, 320)).toContain('@ownedConcern');
    expect(policy).toContain('assertSupportedPlanSchemaVersion');
    expect(policy).toContain('assertAdmittedPlanPair');
    expect(validation).toContain('assertSupportedPlanSchemaVersion');
    expect(validation).not.toContain('assertAdmittedPlanPair({');
  });

  it('proves admission semantics instead of only checking barrel shape', () => {
    expect(() =>
      assertSupportedPlanSchemaVersion({
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      })
    ).not.toThrow();

    expect(() =>
      assertSupportedPlanSchemaVersion({
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        schemaVersion: 'v1.future',
      })
    ).toThrow(InvalidSchemaVersionError);
  });

  it('documents API, invariants, transitions, consumers, diagrams, stories, and Fowler analysis', () => {
    for (const path of [COMPONENT_GUIDE, USER_STORIES, MAILBOX_ANALYSIS, PROPOSAL]) {
      expect(existsSync(path)).toBe(true);
    }

    const guide = readFileSync(COMPONENT_GUIDE, 'utf8');
    for (const heading of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(guide).toContain(heading);
    }
    expect(guide).toContain('PlanSchemaVersionPolicy.ts');
    expect(guide).toContain('assertSupportedPlanSchemaVersion');
    expect(guide).toContain('```mermaid');

    const stories = readFileSync(USER_STORIES, 'utf8');
    for (const storyId of [
      'US-EA-20260429-01-001',
      'US-EA-20260429-01-002',
      'US-EA-20260429-01-003',
      'US-EA-20260429-01-004',
      'US-EA-20260429-01-005',
      'US-EA-20260429-01-006',
    ]) {
      expect(stories).toContain(storyId);
    }

    const analysis = readFileSync(MAILBOX_ANALYSIS, 'utf8');
    for (const section of [
      '## Fowler Architecture Analysis',
      '## Mature-System Comparison',
      '## Antipatterns',
      '## Repetitions Fixed',
      '## Drift Fixed',
      '## Future Lessons',
      '## Opportunities',
    ]) {
      expect(analysis).toContain(section);
    }
  });
});

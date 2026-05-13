import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const ENGINE_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../../..');
const START_RUN_SOURCE = join(ENGINE_ROOT, 'services/startRun');
const COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/start-run-application-decomposition-component.md'
);
const USER_STORIES = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/start-run-application-decomposition-user-stories.md'
);
const FOWLER_MAILBOX = join(
  REPO_ROOT,
  'buzon/20260512-codex-fowler-we-hx-3-start-run-decomposition-analysis-and-remediation.md'
);
const CLOSEOUT = join(
  REPO_ROOT,
  'docs/planning/closeouts/20260512-we-hx-3-start-run-application-decomposition-closeout.md'
);

describe('StartRun application decomposition architecture', () => {
  it('keeps StartRunApplicationService as phase orchestration rather than phase implementation', () => {
    const source = readEngineSource('application/StartRunApplicationService.ts');

    for (const expected of [
      'StartRunAdmissionService',
      'StartRunIntentService',
      'admissionService.admit',
      'intentService.createIntent',
      'executionService.executeStartRun',
      'failurePolicy.handleStartRunError',
    ]) {
      expect(source).toContain(expected);
    }

    for (const forbidden of [
      'private async createStartRunIntent',
      'planIntegrityValidator.fetchAndValidate',
      'toScopedPlanRef(',
      'intentStore.createIntent',
      'idempotency.startRunIntentId',
      'guard.resolveAdapter',
      'guard.assertExecutionPolicyAllowed',
    ]) {
      expect(source).not.toContain(forbidden);
    }

    expect(source.slice(0, 260)).toContain('@ownedConcern');
  });

  it('hosts each start-run phase in a module with an owned concern', () => {
    for (const moduleName of [
      'StartRunAdmissionService.ts',
      'StartRunIntentService.ts',
      'StartRunExecutionService.ts',
      'StartRunFailurePolicy.ts',
      'StartRunValidationPolicy.ts',
      'StartRunEventFactory.ts',
      'RunExecutionContextAdmissionPolicy.ts',
      'StartRunDomainConstants.ts',
      'StartRunTypes.ts',
    ]) {
      const moduleSource = readFileSync(join(START_RUN_SOURCE, moduleName), 'utf8');
      expect(moduleSource.slice(0, 260)).toContain('@ownedConcern');
    }

    const phaseSources = readStartRunPhaseSources();
    for (const expected of [
      'export class StartRunAdmissionService',
      'export interface StartRunAdmissionResult',
      'export class StartRunIntentService',
      'export interface StartRunIntentServiceDeps',
      'export class StartRunExecutionService',
      'export class StartRunFailurePolicy',
    ]) {
      expect(phaseSources).toContain(expected);
    }
  });

  it('documents WE-HX-3 with API, invariants, transitions, consumers, stories, analysis, and diagrams', () => {
    for (const path of [COMPONENT_GUIDE, USER_STORIES, FOWLER_MAILBOX, CLOSEOUT]) {
      expect(existsSync(path)).toBe(true);
    }

    const guide = readFileSync(COMPONENT_GUIDE, 'utf8');
    for (const heading of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## User Stories',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(guide).toContain(heading);
    }
    expect(guide).toContain('StartRunAdmissionService');
    expect(guide).toContain('StartRunIntentService');
    expect(guide).toContain('StartRunExecutionService');
    expect(guide).toContain('StartRunFailurePolicy');
    expect(guide).toContain('```mermaid');

    const stories = readFileSync(USER_STORIES, 'utf8');
    for (const storyId of [
      'US-WE-HX-3-001',
      'US-WE-HX-3-002',
      'US-WE-HX-3-003',
      'US-WE-HX-3-004',
      'US-WE-HX-3-005',
    ]) {
      expect(stories).toContain(storyId);
    }
    expect(stories).toContain('## Negative Scenarios');
    expect(stories).toContain('## Scenario Coverage Matrix');

    const mailbox = readFileSync(FOWLER_MAILBOX, 'utf8');
    for (const section of [
      '## Fowler Architecture Analysis',
      '## Mature-System Comparison',
      '## Improved Patterns',
      '## Antipatterns Detected',
      '## Repetitions Fixed',
      '## Drift Fixed',
      '## Future Lessons',
    ]) {
      expect(mailbox).toContain(section);
    }
  });
});

function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_ROOT, relativePath), 'utf8');
}

function readStartRunPhaseSources(): string {
  return [
    'StartRunAdmissionService.ts',
    'StartRunIntentService.ts',
    'StartRunExecutionService.ts',
    'StartRunFailurePolicy.ts',
  ]
    .map((moduleName) => readFileSync(join(START_RUN_SOURCE, moduleName), 'utf8'))
    .join('\n');
}

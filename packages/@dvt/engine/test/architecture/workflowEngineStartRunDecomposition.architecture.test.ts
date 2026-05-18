import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const ENGINE_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../../..');
const START_RUN_COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-start-run-decomposition-component.md'
);
const START_RUN_USER_STORIES = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-start-run-decomposition-user-stories.md'
);
const DHM_WS3_CLOSEOUT = join(
  REPO_ROOT,
  'docs/planning/closeouts/20260512-dhm-ws3-start-run-application-decomposition-closeout.md'
);

describe('WorkflowEngine start-run decomposition architecture', () => {
  it('keeps StartRunApplicationService focused on orchestration through injected seams', () => {
    const source = readEngineSource('application/StartRunApplicationService.ts');
    const classBody = source.slice(
      source.indexOf('export class StartRunApplicationService'),
      source.indexOf('export function buildStartRunApplicationService')
    );

    for (const forbidden of [
      'new StartRunExecutionService',
      'new StartRunFailurePolicy',
      'new StartRunEventFactory',
      'new PlanIntegrityValidator',
    ]) {
      expect(classBody).not.toContain(forbidden);
    }

    for (const expected of [
      'admissionService: IStartRunAdmissionService;',
      'executionService: IStartRunExecutionService;',
      'failurePolicy: IStartRunFailurePolicy;',
      'export function buildStartRunApplicationService',
    ]) {
      expect(source).toContain(expected);
    }
    expect(source).not.toContain('policy: IRunAccessPolicy;');

    const builderBody = source.slice(
      source.indexOf('export function buildStartRunApplicationService')
    );
    expect(builderBody).toContain('new StartRunAdmissionService');
    expect(builderBody).toContain('planIntegrityValidator:');
  });

  it('declares start-run admission, execution, and failure seams separately from concrete services', () => {
    const types = readEngineSource('services/startRun/StartRunTypes.ts');
    const admissionService = readEngineSource('services/startRun/StartRunAdmissionService.ts');
    const executionService = readEngineSource('services/startRun/StartRunExecutionService.ts');
    const failurePolicy = readEngineSource('services/startRun/StartRunFailurePolicy.ts');

    expect(types).toContain('export interface IStartRunAdmissionService');
    expect(types).toContain('export interface StartRunAdmissionRequest');
    expect(types).toContain('export interface StartRunAdmissionResult');
    expect(types).toContain('export interface StartRunExecutionPolicyAdmission');
    expect(types).toContain('export interface IStartRunExecutionService');
    expect(types).toContain('export interface IStartRunFailurePolicy');
    expect(types).toContain('export interface StartRunExecutionInput');
    expect(admissionService).toContain('implements IStartRunAdmissionService');
    expect(executionService).toContain('implements IStartRunExecutionService');
    expect(failurePolicy).toContain('implements IStartRunFailurePolicy');
  });

  it('documents the start-run decomposition component and DHM-WS3 closeout', () => {
    expect(existsSync(START_RUN_COMPONENT_GUIDE)).toBe(true);
    expect(existsSync(START_RUN_USER_STORIES)).toBe(true);
    expect(existsSync(DHM_WS3_CLOSEOUT)).toBe(true);

    const guide = readFileSync(START_RUN_COMPONENT_GUIDE, 'utf8');
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
    expect(guide).toContain('buildStartRunApplicationService');
    expect(guide).toContain('IStartRunExecutionService');
    expect(guide).toContain('IStartRunFailurePolicy');
    expect(guide).toContain('```mermaid');

    const stories = readFileSync(START_RUN_USER_STORIES, 'utf8');
    for (const expectedStory of [
      'US-DHM-WS3-001',
      'US-DHM-WS3-002',
      'US-DHM-WS3-003',
      '## Negative Scenarios',
      '## Scenario Coverage Matrix',
    ]) {
      expect(stories).toContain(expectedStory);
    }

    const admissionGuide = readFileSync(
      join(
        REPO_ROOT,
        'docs/architecture/components/engine/architecture/start-run-admission-component.md'
      ),
      'utf8'
    );
    expect(admissionGuide).toContain(
      '`StartRunApplicationService` consumes `IStartRunAdmissionService`'
    );
    expect(admissionGuide).toContain('`StartRunAdmissionService` uses the guard');
    expect(admissionGuide).not.toContain('`StartRunApplicationService` uses the guard');
    expect(admissionGuide).toContain('IPlanIntegrityValidator');
    expect(admissionGuide).toContain('IStoredPlanArtifactReader');
  });
});

function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_ROOT, relativePath), 'utf8');
}

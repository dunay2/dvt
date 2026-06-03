import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { getClassConstructorParameterPropertyTypes } from './engineArchitectureTestSupport.js';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const ENGINE_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../../..');
const FACADE_USE_CASES_SOURCE = join(ENGINE_ROOT, 'application/workflow-engine-use-cases');
const FACADE_COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-facade-use-cases-component.md'
);
const FACADE_USER_STORIES = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-facade-use-cases-user-stories.md'
);
const FACADE_FOWLER_MAILBOX = join(
  REPO_ROOT,
  'buzon/20260430-codex-fowler-we-hx-2-facade-use-cases-analysis-and-remediation.md'
);
const WE_HX_2_CLOSEOUT = join(
  REPO_ROOT,
  'docs/planning/closeouts/20260430-we-hx-2-facade-use-cases-closeout.md'
);

describe('WorkflowEngine facade use-case architecture', () => {
  it('keeps WorkflowEngine as a normalization-and-delegation facade', () => {
    const source = readEngineSource('core/WorkflowEngine.ts');

    expect(getClassConstructorParameterPropertyTypes(source, 'WorkflowEngine')).toEqual({
      deps: 'WorkflowEngineDeps',
    });

    for (const forbidden of [
      'IStartRunApplicationService',
      'IRunRecoveryService',
      'IRunControlService',
      'IRunStatusQueryService',
      'IObservability',
      'buildTraceContext',
      'withContext(',
      'withSpan(',
      'recordException(',
      'setStatus(',
      'StartRunTraceContext',
      'logicalAttemptId: 1',
      'originRunId: ctx.runId',
    ]) {
      expect(source).not.toContain(forbidden);
    }

    expect(source.slice(0, 320)).toContain('@ownedConcern');
  });

  it('hosts facade adaptation and cross-cutting tracing in explicit use-case services', () => {
    expect(existsSync(FACADE_USE_CASES_SOURCE)).toBe(true);

    for (const moduleName of [
      'types.ts',
      'WorkflowStartRunUseCase.ts',
      'WorkflowRecoverRunUseCase.ts',
      'WorkflowCancelRunUseCase.ts',
      'WorkflowRunStatusUseCase.ts',
      'WorkflowSignalRunUseCase.ts',
      'buildWorkflowEngineUseCases.ts',
      'index.ts',
    ]) {
      const moduleSource = readFileSync(join(FACADE_USE_CASES_SOURCE, moduleName), 'utf8');
      expect(moduleSource.slice(0, 260)).toContain('@ownedConcern');
    }

    const source = readFacadeUseCaseSources();
    for (const expectedExport of [
      'export interface IWorkflowStartRunUseCase',
      'export interface IWorkflowRecoverRunUseCase',
      'export interface IWorkflowCancelRunUseCase',
      'export interface IWorkflowRunStatusUseCase',
      'export interface IWorkflowSignalRunUseCase',
      'export class WorkflowStartRunUseCase',
      'export class WorkflowRecoverRunUseCase',
      'export class WorkflowCancelRunUseCase',
      'export class WorkflowRunStatusUseCase',
      'export class WorkflowSignalRunUseCase',
      'export function buildWorkflowEngineUseCases',
    ]) {
      expect(source).toContain(expectedExport);
    }

    expect(source).toContain('buildTraceContext');
    expect(source).toContain('withSpan(');
    expect(source).toContain('startRunApplicationService.startRun');
    expect(existsSync(join(ENGINE_ROOT, 'application/WorkflowEngineUseCases.ts'))).toBe(false);
  });

  it('documents the facade use-case component with API, invariants, transitions, consumers, stories, mailbox review, and diagrams', () => {
    expect(existsSync(FACADE_COMPONENT_GUIDE)).toBe(true);
    expect(existsSync(FACADE_USER_STORIES)).toBe(true);
    expect(existsSync(FACADE_FOWLER_MAILBOX)).toBe(true);
    expect(existsSync(WE_HX_2_CLOSEOUT)).toBe(true);

    const guide = readFileSync(FACADE_COMPONENT_GUIDE, 'utf8');
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
    expect(guide).toContain('IWorkflowStartRunUseCase');
    expect(guide).toContain('WorkflowStartRunUseCase');
    expect(guide).toContain('```mermaid');
    expect(guide).toContain('workflow-engine-facade-use-cases-user-stories.md');
    expect(guide).toContain(
      '20260430-codex-fowler-we-hx-2-facade-use-cases-analysis-and-remediation.md'
    );

    const stories = readFileSync(FACADE_USER_STORIES, 'utf8');
    for (const expectedStory of [
      'US-WE-HX-2-001',
      'US-WE-HX-2-002',
      'US-WE-HX-2-003',
      'US-WE-HX-2-004',
      'US-WE-HX-2-005',
      '## Negative Scenarios',
      '## Scenario Coverage Matrix',
    ]) {
      expect(stories).toContain(expectedStory);
    }

    const closeout = readFileSync(WE_HX_2_CLOSEOUT, 'utf8');
    expect(closeout).toContain('## Think-First Analysis');
    expect(closeout).toContain('## Pre-Implementation Brief');
    expect(closeout).toContain('## Normative Baseline');
  });
});

function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_ROOT, relativePath), 'utf8');
}

function readFacadeUseCaseSources(): string {
  return [
    'types.ts',
    'WorkflowStartRunUseCase.ts',
    'WorkflowRecoverRunUseCase.ts',
    'WorkflowCancelRunUseCase.ts',
    'WorkflowRunStatusUseCase.ts',
    'WorkflowSignalRunUseCase.ts',
    'buildWorkflowEngineUseCases.ts',
    'index.ts',
  ]
    .map((moduleName) => readFileSync(join(FACADE_USE_CASES_SOURCE, moduleName), 'utf8'))
    .join('\n');
}

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const ENGINE_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../../..');
const FACADE_USE_CASES_SOURCE = join(ENGINE_ROOT, 'application/WorkflowEngineUseCases.ts');
const FACADE_COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-facade-use-cases-component.md'
);
const WE_HX_2_CLOSEOUT = join(
  REPO_ROOT,
  'docs/planning/closeouts/20260430-we-hx-2-facade-use-cases-closeout.md'
);

describe('WorkflowEngine facade use-case architecture', () => {
  it('keeps WorkflowEngine as a normalization-and-delegation facade', () => {
    const source = readEngineSource('core/WorkflowEngine.ts');

    for (const expectedUseCase of [
      'startRunUseCase: IWorkflowStartRunUseCase;',
      'recoverRunUseCase: IWorkflowRecoverRunUseCase;',
      'cancelRunUseCase: IWorkflowCancelRunUseCase;',
      'runStatusUseCase: IWorkflowRunStatusUseCase;',
      'signalRunUseCase: IWorkflowSignalRunUseCase;',
    ]) {
      expect(source).toContain(expectedUseCase);
    }

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
  });

  it('hosts facade adaptation and cross-cutting tracing in explicit use-case services', () => {
    expect(existsSync(FACADE_USE_CASES_SOURCE)).toBe(true);

    const source = readFileSync(FACADE_USE_CASES_SOURCE, 'utf8');
    expect(source.slice(0, 240)).toContain('@ownedConcern');

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
  });

  it('documents the facade use-case component with API, invariants, transitions, consumers, and diagrams', () => {
    expect(existsSync(FACADE_COMPONENT_GUIDE)).toBe(true);
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

    const closeout = readFileSync(WE_HX_2_CLOSEOUT, 'utf8');
    expect(closeout).toContain('## Think-First Analysis');
    expect(closeout).toContain('## Pre-Implementation Brief');
    expect(closeout).toContain('## Normative Baseline');
  });
});

function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_ROOT, relativePath), 'utf8');
}

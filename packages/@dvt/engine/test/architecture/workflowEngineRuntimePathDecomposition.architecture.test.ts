import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const ENGINE_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../../..');
const RUNTIME_PATH_COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-runtime-path-decomposition-component.md'
);
const RUNTIME_PATH_USER_STORIES = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-runtime-path-decomposition-user-stories.md'
);

describe('WorkflowEngine runtime path decomposition', () => {
  it('declares dedicated command and signal runtime ports', () => {
    const commandPort = readEngineSource('domain/IRunCommandService.ts');
    const signalPort = readEngineSource('domain/IRunSignalService.ts');

    expect(commandPort).toContain('export interface IRunCommandService');
    expect(commandPort).toContain('cancel(ref: EngineRunRef): Promise<void>;');
    expect(commandPort).not.toContain('signal(');

    expect(signalPort).toContain('export interface IRunSignalService');
    expect(signalPort).toContain('signal(ref: EngineRunRef, req: SignalRequest): Promise<void>;');
    expect(signalPort).not.toContain('cancel(');
  });

  it('moves cancel command behavior out of the combined run-control delegator', () => {
    const commandService = readEngineSource('services/runControl/RunCommandService.ts');
    const signalService = readEngineSource('services/runControl/RunSignalService.ts');
    const coreService = readEngineSource('core/WorkflowEngineCoreService.ts');

    expect(commandService).toContain(
      'export class RunCommandService implements IRunCommandService'
    );
    expect(commandService).toContain('adapter.cancelRun(validatedRunRef)');
    expect(commandService).not.toContain('adapter.signal(');
    expect(commandService).not.toContain('SignalTransitionGuard');

    expect(signalService).toContain('export class RunSignalService implements IRunSignalService');
    expect(signalService).toContain('SignalTransitionGuard');
    expect(signalService).toContain('adapter.signal(validatedRunRef, validatedRequest)');
    expect(signalService).toContain('emitSignalDerivedRunEvent');
    expect(signalService).not.toContain('adapter.cancelRun(');

    for (const forbiddenCoreBehavior of [
      'adapter.cancelRun(',
      'adapter.signal(',
      'SignalTransitionGuard',
      'emitSignalDerivedRunEvent',
      'mapSignalToRunEventType',
      'mapSignalToValidationEventType',
    ]) {
      expect(coreService).not.toContain(forbiddenCoreBehavior);
    }

    expect(coreService).toContain('this.runCommandService.cancel(ref)');
    expect(coreService).toContain('this.runSignalService.signal(ref, req)');
  });

  it('wires facade use cases through separate command and signal dependencies', () => {
    const builder = readEngineSource(
      'application/workflow-engine-use-cases/buildWorkflowEngineUseCases.ts'
    );
    const cancelUseCase = readEngineSource(
      'application/workflow-engine-use-cases/WorkflowCancelRunUseCase.ts'
    );
    const signalUseCase = readEngineSource(
      'application/workflow-engine-use-cases/WorkflowSignalRunUseCase.ts'
    );

    expect(builder).toContain('runCommandService: IRunCommandService;');
    expect(builder).toContain('runSignalService: IRunSignalService;');
    expect(builder).not.toContain('runControlService: IRunControlService;');
    expect(cancelUseCase).toContain('runCommandService: IRunCommandService;');
    expect(cancelUseCase).toContain('this.deps.runCommandService.cancel(engineRunRef)');
    expect(signalUseCase).toContain('runSignalService: IRunSignalService;');
    expect(signalUseCase).toContain('this.deps.runSignalService.signal(engineRunRef, request)');
  });

  it('documents the runtime path decomposition component and user stories', () => {
    expect(existsSync(RUNTIME_PATH_COMPONENT_GUIDE)).toBe(true);
    expect(existsSync(RUNTIME_PATH_USER_STORIES)).toBe(true);

    const guide = readFileSync(RUNTIME_PATH_COMPONENT_GUIDE, 'utf8');
    for (const expected of [
      'RunCommandService',
      'RunSignalService',
      'WorkflowEngineCoreService',
      'combined run-control delegator',
      'IRunCommandService',
      'IRunSignalService',
      '```mermaid',
    ]) {
      expect(guide).toContain(expected);
    }

    const stories = readFileSync(RUNTIME_PATH_USER_STORIES, 'utf8');
    for (const expectedStory of [
      'US-DHM-WS4-001',
      'US-DHM-WS4-002',
      'US-DHM-WS4-003',
      '## Negative Scenarios',
      '## Scenario Coverage Matrix',
    ]) {
      expect(stories).toContain(expectedStory);
    }
  });
});

function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_ROOT, relativePath), 'utf8');
}

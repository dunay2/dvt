import { describe, expect, it } from 'vitest';

import { buildWorkflowEngineUseCases } from '../../src/application/workflow-engine-use-cases/index.js';
import type { WorkflowEngineUseCaseDeps } from '../../src/application/workflow-engine-use-cases/index.js';

describe('buildWorkflowEngineUseCases', () => {
  it.each([
    'observability',
    'startRunApplicationService',
    'runRecoveryService',
    'runControlService',
    'runStatusQueryService',
  ] as const)('fails fast when %s is missing', (depName) => {
    const deps = makeDeps();
    delete deps[depName];

    expect(() => buildWorkflowEngineUseCases(deps as WorkflowEngineUseCaseDeps)).toThrow(
      new RegExp(`${depName} is required`)
    );
  });
});

function makeDeps(): Partial<Record<keyof WorkflowEngineUseCaseDeps, unknown>> {
  return {
    observability: {},
    startRunApplicationService: {},
    runRecoveryService: {},
    runControlService: {},
    runStatusQueryService: {},
  };
}

import { GENERIC_GRAPH_SOURCE_KIND, type PlannerInputEnvelopeV1 } from '@dvt/contracts';
import {
  EXECUTE_PYTHON_CODE_REQUIRED_CAPABILITY,
  EXECUTE_PYTHON_CODE_STEP_KIND,
  type PythonCodeStepTypeConfig,
} from '@dvt/contracts/python-code';
import { describe, expect, it } from 'vitest';

import { Planner } from '../../src/domain/Planner.js';

const OWNERSHIP = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

function config(
  scope: PythonCodeStepTypeConfig['scope'] = OWNERSHIP
): PythonCodeStepTypeConfig {
  return {
    scope,
    runtimeRef: 'python-runtime:cpython-3-13',
    protocolVersion: 'python-json-v1',
    source: 'result = {"total": inputs["left"] + inputs["right"]}',
    inputs: { left: 2, right: 3 },
    limits: {
      timeoutMs: 10_000,
      terminationGraceMs: 500,
      maxStdoutBytes: 4_096,
      maxStderrBytes: 4_096,
      maxResultBytes: 8_192,
    },
  };
}

function input(
  stepConfig: PythonCodeStepTypeConfig = config()
): PlannerInputEnvelopeV1 {
  return {
    graphSource: {
      kind: GENERIC_GRAPH_SOURCE_KIND,
      sourceFamily: 'python-code',
      sourceVersion: '1.0',
      nodes: [
        {
          nodeId: 'python-calculate',
          stepKind: EXECUTE_PYTHON_CODE_STEP_KIND,
          dependsOn: [],
          stepTypeConfig: stepConfig,
        },
      ],
    },
    selection: { selectedNodeIds: ['python-calculate'] },
    ownership: OWNERSHIP,
  };
}

describe('Planner Python code-node admission', () => {
  it('admits the canonical step and derives its independently composed capability', async () => {
    const result = await new Planner().buildPlan(input());

    expect(result.plan.steps).toEqual([
      expect.objectContaining({
        stepId: 'python-calculate',
        kind: EXECUTE_PYTHON_CODE_STEP_KIND,
        dependsOn: [],
        stepTypeConfig: config(),
      }),
    ]);
    expect(result.executionPolicy.requiresCapabilities).toEqual([
      EXECUTE_PYTHON_CODE_REQUIRED_CAPABILITY,
    ]);
  });

  it('rejects a code step whose scope diverges from immutable plan ownership', async () => {
    await expect(
      new Planner().buildPlan(
        input(config({ ...OWNERSHIP, environmentId: 'prod' }))
      )
    ).rejects.toMatchObject({
      code: 'INVALID_STEP_CONFIG',
      message: expect.stringContaining('scope.environmentId'),
    });
  });

  it('rejects arbitrary executable paths before plan creation', async () => {
    await expect(
      new Planner().buildPlan(
        input({ ...config(), runtimeRef: '/usr/bin/python3' } as PythonCodeStepTypeConfig)
      )
    ).rejects.toMatchObject({
      code: 'INVALID_STEP_CONFIG',
    });
  });
});

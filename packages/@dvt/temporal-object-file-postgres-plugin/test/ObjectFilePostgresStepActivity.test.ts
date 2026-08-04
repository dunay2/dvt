import type { StepDefinition, StepExecutionContext } from '@dvt/adapter-temporal';
import { describe, expect, it, vi } from 'vitest';

import {
  createObjectFilePostgresPluginProfile,
  OBJECT_FILE_POSTGRES_PLUGIN_ID,
} from '../src/index.js';

import { RUN_CONTEXT, STEP_CONFIG } from './objectFilePostgresTestFixtures.js';

describe('object-file PostgreSQL Temporal profile', () => {
  it('registers only the canonical load step kind', () => {
    const profile = createObjectFilePostgresPluginProfile({ execute: vi.fn() });

    expect(profile.pluginId).toBe(OBJECT_FILE_POSTGRES_PLUGIN_ID);
    expect([...profile.stepActivitiesByKind.keys()]).toEqual(['LOAD_OBJECT_FILE_TO_POSTGRES']);
  });

  it('passes canonical config and execution scope to the runner', async () => {
    const execute = vi.fn(async () => ({ stepId: 'load.orders', status: 'COMPLETED' as const }));
    const profile = createObjectFilePostgresPluginProfile({ execute });
    const activity = profile.stepActivitiesByKind.get('LOAD_OBJECT_FILE_TO_POSTGRES');

    await expect(activity?.execute(buildStep(STEP_CONFIG), buildContext())).resolves.toMatchObject({
      status: 'COMPLETED',
    });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ config: STEP_CONFIG, runContext: RUN_CONTEXT })
    );
  });

  it('fails malformed config permanently before invoking the runner', async () => {
    const execute = vi.fn();
    const profile = createObjectFilePostgresPluginProfile({ execute });
    const activity = profile.stepActivitiesByKind.get('LOAD_OBJECT_FILE_TO_POSTGRES');

    await expect(activity?.execute(buildStep({}), buildContext())).rejects.toMatchObject({
      nonRetryable: true,
    });
    expect(execute).not.toHaveBeenCalled();
  });
});

function buildStep(config: unknown): StepDefinition {
  return {
    stepId: 'load.orders',
    kind: 'LOAD_OBJECT_FILE_TO_POSTGRES',
    dependsOn: [],
    stepTypeConfig: config,
  } as StepDefinition;
}

function buildContext(): StepExecutionContext {
  return {
    executionIdentity: {
      tenantId: 'tenant-a',
      runId: 'run-a',
      environmentId: 'dev',
    },
    runContext: RUN_CONTEXT,
  };
}

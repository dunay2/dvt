import { DvtOperationalPreviewWorkloadV1Schema } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  DVT_POSTGRES_PLUGIN_ID,
  DvtPostgresStepActivity,
  createDvtPostgresPluginProfile,
} from '../src/index.js';

import {
  buildDvtWorkload,
  buildRunExecutionContext,
  buildStep,
  buildStepContext,
} from './dvtPostgresPluginFixture.js';

describe('DvtPostgresStepActivity', () => {
  it('registers only the governed DVT PostgreSQL step kind', () => {
    const profile = createDvtPostgresPluginProfile({
      runExecutionContextReader: { resolve: vi.fn() },
      runner: { execute: vi.fn() },
    });

    expect(profile.pluginId).toBe(DVT_POSTGRES_PLUGIN_ID);
    expect([...profile.stepActivitiesByKind.keys()]).toEqual(['DVT_POSTGRES_OPERATIONAL_WORKLOAD']);
  });

  it('resolves the frozen context and delegates one valid Run workload', async () => {
    const runExecutionContext = buildRunExecutionContext();
    const resolve = vi.fn(async () => runExecutionContext);
    const execute = vi.fn(async () => ({ stepId: 'transform-a', status: 'COMPLETED' as const }));
    const activity = new DvtPostgresStepActivity({
      runExecutionContextReader: { resolve },
      runner: { execute },
    });
    const step = buildStep();
    const context = buildStepContext();

    await expect(activity.execute(step, context)).resolves.toEqual({
      stepId: 'transform-a',
      status: 'COMPLETED',
    });
    expect(resolve).toHaveBeenCalledWith(context.runContext.runExecutionContextRef);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        step,
        runExecutionContext,
        pluginContext: runExecutionContext.pluginContexts['dvt-postgres'],
      })
    );
  });

  it.each(['preview', 'retired-v2', 'retired-inner-profile'] as const)(
    'rejects %s before context reads or provider effects',
    async (invalid) => {
      const resolve = vi.fn();
      const execute = vi.fn();
      const activity = new DvtPostgresStepActivity({
        runExecutionContextReader: { resolve },
        runner: { execute },
      });
      const run = buildDvtWorkload();
      const { schemaDigestSha256: _digest, ...targetProjection } = run.targetProjection;
      const preview = DvtOperationalPreviewWorkloadV1Schema.parse({
        schemaVersion: run.schemaVersion,
        executionIntent: 'preview',
        scope: run.scope,
        graph: run.graph,
        semantics: run.semantics,
        connectionRef: run.connectionRef,
        targetProjection,
        output: { kind: 'ephemeral-preview', nodeId: run.output.nodeId },
      });
      const rejected = {
        preview,
        'retired-v2': { ...run, schemaVersion: 'dvt-operational-workload.v2' },
        'retired-inner-profile': {
          ...run,
          targetProjection: {
            ...run.targetProjection,
            profileId: 'dvt.vtx2.postgres.inner-join.v1',
          },
        },
      };

      await expect(
        activity.execute(buildStep(rejected[invalid]), buildStepContext())
      ).rejects.toMatchObject({
        nonRetryable: true,
        message: 'DVT_RUN_WORKLOAD_V1_REQUIRED:transform-a',
      });
      expect(resolve).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
    }
  );

  it('rejects a missing server-owned context before provider effects', async () => {
    const resolve = vi.fn();
    const execute = vi.fn();
    const activity = new DvtPostgresStepActivity({
      runExecutionContextReader: { resolve },
      runner: { execute },
    });
    const context = buildStepContext();
    const contextWithoutRef = {
      ...context,
      runContext: { ...context.runContext, runExecutionContextRef: undefined },
    };

    await expect(activity.execute(buildStep(), contextWithoutRef)).rejects.toMatchObject({
      nonRetryable: true,
      message: 'RUN_EXECUTION_CONTEXT_REQUIRED:transform-a',
    });
    expect(resolve).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});

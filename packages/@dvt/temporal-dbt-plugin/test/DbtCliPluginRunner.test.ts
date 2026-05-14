import { describe, expect, it, vi } from 'vitest';

import {
  DbtCliPluginRunner,
  TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS,
  assertDbtCliAvailable,
} from '../src/index.js';

const INPUT = {
  step: { stepId: 'model.analytics.orders', kind: 'DBT_MODEL', dependsOn: [] },
  executionIdentity: {
    tenantId: 'tenant-1',
    runId: 'run-1',
    environmentId: 'env-1',
  },
  runContext: {
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    runId: 'run-1',
    targetAdapter: 'temporal' as const,
    logicalAttemptId: 1,
    originRunId: 'run-1',
  },
  runExecutionContext: {
    schemaVersion: 'v1.0',
    planId: 'plan-1',
    planVersion: '1.0',
    planSha256: 'a'.repeat(64),
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    targetAdapter: 'temporal' as const,
    createdAtIso: '2026-04-14T00:00:00.000Z',
    createdBy: 'test',
    pluginContexts: {
      dbt: {
        projectBundleRef: {
          uri: `s3://bundle/tenants/tenant-1/${'b'.repeat(64)}`,
          kind: 'dbt-project-bundle',
          sha256: 'b'.repeat(64),
          tenantId: 'tenant-1',
        },
        targetProfile: 'analytics',
      },
    },
  },
  pluginContext: {
    projectBundleRef: {
      uri: `s3://bundle/tenants/tenant-1/${'b'.repeat(64)}`,
      kind: 'dbt-project-bundle',
      sha256: 'b'.repeat(64),
      tenantId: 'tenant-1',
    },
    targetProfile: 'analytics',
  },
} as const;

describe('DbtCliPluginRunner', () => {
  it('maps DBT_MODEL to dbt run and returns COMPLETED on exit code 0', async () => {
    const cleanup = vi.fn(async () => undefined);
    const materializeProject = vi.fn(async () => ({
      projectDir: '/tmp/dbt-project',
      cleanup,
    }));
    const runCommand = vi.fn(async () => ({
      stdout: 'ok',
      stderr: '',
    }));
    const runner = new DbtCliPluginRunner({
      bundleReader: {
        read: vi.fn(async (_ref, _options) => new Uint8Array()),
      },
      materializeProject,
      runCommand,
      dbtBin: 'dbt',
    });

    const result = await runner.execute(INPUT);

    expect(result).toEqual({
      stepId: 'model.analytics.orders',
      status: 'COMPLETED',
    });
    expect(runCommand).toHaveBeenCalledWith(
      'dbt',
      ['run', '--select', 'model.analytics.orders', '--target', 'analytics'],
      { cwd: '/tmp/dbt-project' }
    );
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('maps DBT_TEST to dbt test', async () => {
    const runCommand = vi.fn(async () => ({
      stdout: 'ok',
      stderr: '',
    }));
    const runner = new DbtCliPluginRunner({
      bundleReader: {
        read: vi.fn(async (_ref, _options) => new Uint8Array()),
      },
      materializeProject: async () => ({
        projectDir: '/tmp/dbt-project',
        cleanup: async () => undefined,
      }),
      runCommand,
      dbtBin: 'dbt',
    });

    await runner.execute({
      ...INPUT,
      step: { stepId: 'test.analytics.orders', kind: 'DBT_TEST', dependsOn: [] },
      pluginContext: {
        projectBundleRef: {
          uri: `s3://bundle/tenants/tenant-1/${'b'.repeat(64)}`,
          kind: 'dbt-project-bundle',
          sha256: 'b'.repeat(64),
          tenantId: 'tenant-1',
        },
      },
    });

    expect(runCommand).toHaveBeenCalledWith('dbt', ['test', '--select', 'test.analytics.orders'], {
      cwd: '/tmp/dbt-project',
    });
  });

  it.each([
    ['DBT_MODEL', 'run'],
    ['DBT_TEST', 'test'],
    ['DBT_SNAPSHOT', 'snapshot'],
  ] as const)('maps %s through the Temporal DBT plugin command table', async (kind, command) => {
    const runCommand = vi.fn(async () => ({
      stdout: 'ok',
      stderr: '',
    }));
    const runner = new DbtCliPluginRunner({
      bundleReader: {
        read: vi.fn(async (_ref, _options) => new Uint8Array()),
      },
      materializeProject: async () => ({
        projectDir: '/tmp/dbt-project',
        cleanup: async () => undefined,
      }),
      runCommand,
      dbtBin: 'dbt',
    });

    await runner.execute({
      ...INPUT,
      step: { stepId: `${kind.toLowerCase()}.analytics.orders`, kind, dependsOn: [] },
    });

    expect(TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS).toContain(kind);
    expect(runCommand).toHaveBeenCalledWith(
      'dbt',
      [command, '--select', `${kind.toLowerCase()}.analytics.orders`, '--target', 'analytics'],
      { cwd: '/tmp/dbt-project' }
    );
  });

  it('returns FAILED when the dbt process exits non-zero', async () => {
    const error = Object.assign(new Error('dbt failed'), {
      code: 2,
      stdout: '',
      stderr: 'model failed',
    });
    const runner = new DbtCliPluginRunner({
      bundleReader: {
        read: vi.fn(async (_ref, _options) => new Uint8Array()),
      },
      materializeProject: async () => ({
        projectDir: '/tmp/dbt-project',
        cleanup: async () => undefined,
      }),
      runCommand: vi.fn(async () => {
        throw error;
      }),
      dbtBin: 'dbt',
    });

    await expect(runner.execute(INPUT)).resolves.toEqual({
      stepId: 'model.analytics.orders',
      status: 'FAILED',
      failureReason: 'DBT_CLI_EXIT_NON_ZERO',
      error: 'model failed',
    });
  });

  it('returns FAILED when the dbt binary is missing', async () => {
    const error = Object.assign(new Error('spawn ENOENT'), {
      code: 'ENOENT',
      stdout: '',
      stderr: '',
    });
    const runner = new DbtCliPluginRunner({
      bundleReader: {
        read: vi.fn(async (_ref, _options) => new Uint8Array()),
      },
      materializeProject: async () => ({
        projectDir: '/tmp/dbt-project',
        cleanup: async () => undefined,
      }),
      runCommand: vi.fn(async () => {
        throw error;
      }),
      dbtBin: 'dbt',
    });

    await expect(runner.execute(INPUT)).resolves.toEqual({
      stepId: 'model.analytics.orders',
      status: 'FAILED',
      failureReason: 'DBT_CLI_NOT_FOUND',
      error: 'spawn ENOENT',
    });
  });

  it('validates dbt CLI availability with --version', async () => {
    const runCommand = vi.fn(async () => ({
      stdout: 'dbt 1.10.0',
      stderr: '',
    }));

    await assertDbtCliAvailable('dbt', runCommand);

    expect(runCommand).toHaveBeenCalledWith('dbt', ['--version'], { cwd: process.cwd() });
  });
});

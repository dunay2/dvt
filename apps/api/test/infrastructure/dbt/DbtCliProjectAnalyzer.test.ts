import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NODE_DBT_PROCESS_RUNNER } from '../../../src/infrastructure/dbt/dbtAnalyzerProcess.js';
import { DbtCliProjectAnalyzer } from '../../../src/infrastructure/dbt/DbtCliProjectAnalyzer.js';
import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const;

describe('DbtCliProjectAnalyzer', () => {
  let workspaceFilesRoot: string;
  let profilesDirectory: string;
  let projectDirectory: string;

  beforeEach(async () => {
    workspaceFilesRoot = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-analyzer-workspace-'));
    profilesDirectory = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-analyzer-profiles-'));
    projectDirectory = path.join(
      resolveWorkspaceScopeStorageRoot(workspaceFilesRoot, SCOPE),
      'analytics'
    );
    await mkdir(path.join(projectDirectory, 'models'), { recursive: true });
    await writeFile(
      path.join(projectDirectory, 'dbt_project.yml'),
      'name: analytics\nversion: 1.0.0\nprofile: analytics\nmodel-paths: [models]\n',
      'utf8'
    );
    await writeFile(
      path.join(profilesDirectory, 'profiles.yml'),
      'analytics:\n  target: analysis\n  outputs:\n    analysis:\n      type: postgres\n',
      'utf8'
    );
    await writeFile(
      path.join(projectDirectory, 'models', 'orders.sql'),
      "select * from {{ source('raw', 'orders') }}\n",
      'utf8'
    );
    await mkdir(path.join(projectDirectory, 'target'), { recursive: true });
    await writeFile(
      path.join(projectDirectory, 'target', 'manifest.json'),
      JSON.stringify({
        metadata: { dbt_version: '0.0.0-stale' },
        nodes: {
          'model.analytics.stale': {
            unique_id: 'model.analytics.stale',
            resource_type: 'model',
            name: 'stale',
            package_name: 'analytics',
            depends_on: { nodes: [] },
            columns: {},
            tags: [],
          },
        },
        sources: {},
        exposures: {},
        metrics: {},
      }),
      'utf8'
    );
  });

  afterEach(async () => {
    await Promise.all([
      rm(workspaceFilesRoot, { recursive: true, force: true }),
      rm(profilesDirectory, { recursive: true, force: true }),
    ]);
  });

  it('runs dbt parse in isolated target/log paths and ignores stale project artifacts', async () => {
    let isolatedTargetPath = '';
    let isolatedLogPath = '';
    const run = vi.fn().mockImplementation(async (input: { args: readonly string[] }) => {
      isolatedTargetPath = readFlag(input.args, '--target-path');
      isolatedLogPath = readFlag(input.args, '--log-path');
      await mkdir(isolatedTargetPath, { recursive: true });
      await writeFile(
        path.join(isolatedTargetPath, 'manifest.json'),
        JSON.stringify(manifest()),
        'utf8'
      );
      return { kind: 'completed' as const, exitCode: 0, stdout: '', stderr: '' };
    });
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
      processEnvironment: {
        PATH: process.env.PATH,
        DATABASE_URL: 'must-not-leak',
        SNOWFLAKE_PASSWORD: 'must-not-leak',
      },
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('valid');
    expect(result.resources.map((resource) => resource.uniqueId)).toEqual([
      'model.analytics.orders',
      'source.analytics.raw.orders',
      'test.analytics.not_null_orders_order_id',
    ]);
    expect(result.resources.map((resource) => resource.uniqueId)).not.toContain(
      'model.analytics.stale'
    );
    expect(result.dependencies).toEqual([
      {
        sourceUniqueId: 'model.analytics.orders',
        targetUniqueId: 'test.analytics.not_null_orders_order_id',
        relation: 'test_target',
      },
      {
        sourceUniqueId: 'source.analytics.raw.orders',
        targetUniqueId: 'model.analytics.orders',
        relation: 'dependency',
      },
    ]);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        executable: 'dbt',
        cwd: projectDirectory,
        args: expect.arrayContaining([
          'parse',
          '--no-partial-parse',
          '--project-dir',
          projectDirectory,
          '--profiles-dir',
          profilesDirectory,
        ]),
        env: expect.not.objectContaining({
          DATABASE_URL: expect.anything(),
          SNOWFLAKE_PASSWORD: expect.anything(),
        }),
      })
    );
    expect(path.relative(projectDirectory, isolatedTargetPath)).toMatch(/^\.\./);
    expect(path.relative(projectDirectory, isolatedLogPath)).toMatch(/^\.\./);
    await expect(stat(isolatedTargetPath)).rejects.toThrow();
  });

  it('returns deterministic hashes for unchanged project content and normalized analysis', async () => {
    const processRunner = {
      run: vi.fn().mockImplementation(async (input: { args: readonly string[] }) => {
        const targetPath = readFlag(input.args, '--target-path');
        await mkdir(targetPath, { recursive: true });
        await writeFile(path.join(targetPath, 'manifest.json'), JSON.stringify(manifest()), 'utf8');
        return { kind: 'completed' as const, exitCode: 0, stdout: '', stderr: '' };
      }),
    };
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner,
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const first = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });
    const second = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(second.projectRevision.contentSetSha256).toBe(first.projectRevision.contentSetSha256);
    expect(second.analysisSha256).toBe(first.analysisSha256);
  });

  it('returns a safe invalid diagnostic without exposing project-controlled dbt output', async () => {
    const profileSecret = 'warehouse-password-from-target';
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: {
        run: vi.fn().mockResolvedValue({
          kind: 'completed',
          exitCode: 2,
          stdout: '',
          stderr: `Compilation Error in model orders: ${profileSecret} at ${projectDirectory}\\models\\orders.sql`,
        }),
      },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('invalid');
    expect(result.resources).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'dbt_project_invalid',
        severity: 'error',
        message: 'dbt parse rejected the project. Review it in a trusted dbt environment.',
      }),
    ]);
    expect(result.diagnostics[0]?.message).not.toContain(profileSecret);
    expect(result.diagnostics[0]?.message).not.toContain(projectDirectory);
  });

  it('keeps invalid diagnostics deterministic across process output changes', async () => {
    let invocation = 0;
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: {
        run: vi.fn().mockImplementation(async () => {
          invocation += 1;
          return {
            kind: 'completed',
            exitCode: 2,
            stdout: '',
            stderr: `${invocation === 1 ? '2026-07-13T10:00:00.000Z' : '2026-07-13T10:01:00.000Z'} Compilation Error at ${projectDirectory}\\models\\orders.sql`,
          };
        }),
      },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const first = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });
    const second = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(second.analysisSha256).toBe(first.analysisSha256);
    expect(second.diagnostics).toEqual(first.diagnostics);
    expect(first.diagnostics[0]?.message).toBe(
      'dbt parse rejected the project. Review it in a trusted dbt environment.'
    );
    expect(first.diagnostics[0]?.message).not.toContain(workspaceFilesRoot);
  });

  it('treats a missing current-run manifest as unavailable instead of a valid empty graph', async () => {
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: {
        run: vi.fn().mockResolvedValue({ kind: 'completed', exitCode: 0, stdout: '', stderr: '' }),
      },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_analyzer_unavailable');
  });

  it('requires an explicit server-managed analysis profile before invoking dbt', async () => {
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({ workspaceFilesRoot, processRunner: { run } });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_analyzer_profiles_unavailable');
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects an analysis profile stored inside the workspace-file authority root', async () => {
    const workspaceProfile = path.join(workspaceFilesRoot, 'server-profile');
    await mkdir(workspaceProfile, { recursive: true });
    await writeFile(path.join(workspaceProfile, 'profiles.yml'), 'analytics: {}\n', 'utf8');
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory: workspaceProfile,
      processRunner: { run },
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_analyzer_profiles_unavailable');
    expect(run).not.toHaveBeenCalled();
  });

  it('returns unavailable without invoking dbt when the authorized project is absent', async () => {
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'missing' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_project_not_found');
    expect(result.diagnostics[0]?.message).not.toContain(workspaceFilesRoot);
    expect(run).not.toHaveBeenCalled();
  });

  it('classifies a missing analyzer executable as an unavailable process boundary', async () => {
    const result = await NODE_DBT_PROCESS_RUNNER.run({
      executable: `missing-dbt-${process.pid}-${Date.now()}`,
      args: ['parse'],
      cwd: projectDirectory,
      env: process.env,
      timeoutMs: 1_000,
      maxOutputBytes: 1_024,
    });

    expect(result).toMatchObject({ kind: 'unavailable', reason: 'spawn_failure' });
  });

  it('classifies analyzer timeout as an unavailable process boundary', async () => {
    const result = await NODE_DBT_PROCESS_RUNNER.run({
      executable: process.execPath,
      args: ['-e', 'setTimeout(() => {}, 10_000)'],
      cwd: projectDirectory,
      env: process.env,
      timeoutMs: 10,
      maxOutputBytes: 1_024,
    });

    expect(result).toMatchObject({ kind: 'unavailable', reason: 'timeout' });
  });

  it('classifies analyzer output overflow as an unavailable process boundary', async () => {
    const result = await NODE_DBT_PROCESS_RUNNER.run({
      executable: process.execPath,
      args: ['-e', "process.stdout.write('x'.repeat(4_096))"],
      cwd: projectDirectory,
      env: process.env,
      timeoutMs: 1_000,
      maxOutputBytes: 128,
    });

    expect(result).toMatchObject({ kind: 'unavailable', reason: 'output_limit' });
  });

  it('returns unavailable when the analyzer process boundary cannot run dbt', async () => {
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: {
        run: vi.fn().mockResolvedValue({
          kind: 'unavailable',
          reason: 'spawn_failure',
          stdout: '',
          stderr: '',
        }),
      },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_analyzer_unavailable');
  });

  it('rejects project content that exceeds the byte budget before invoking dbt', async () => {
    await writeFile(path.join(projectDirectory, 'models', 'oversized.sql'), 'x'.repeat(1_024));
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
      maxProjectBytes: 100,
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_project_unreadable');
    expect(run).not.toHaveBeenCalled();
  });

  it('counts generated-name directories when enforcing the dbt project byte budget', async () => {
    const configuredResourceDirectory = path.join(projectDirectory, 'target');
    await mkdir(configuredResourceDirectory, { recursive: true });
    await writeFile(
      path.join(projectDirectory, 'dbt_project.yml'),
      'name: analytics\nprofile: analytics\nmodel-paths: ["target"]\n'
    );
    await writeFile(
      path.join(configuredResourceDirectory, 'project-controlled.sql'),
      'x'.repeat(4_096)
    );
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
      maxProjectBytes: 1_000,
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_project_unreadable');
    expect(run).not.toHaveBeenCalled();
  });
});

function readFlag(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  const value = args[index + 1];
  if (index < 0 || value === undefined) {
    throw new Error(`Missing ${flag}`);
  }
  return value;
}

function manifest(): Record<string, unknown> {
  return {
    metadata: { dbt_version: '1.10.0' },
    nodes: {
      'model.analytics.orders': {
        unique_id: 'model.analytics.orders',
        resource_type: 'model',
        name: 'orders',
        package_name: 'analytics',
        original_file_path: 'models/orders.sql',
        depends_on: { nodes: ['source.analytics.raw.orders'] },
        config: { materialized: 'table' },
        columns: { order_id: { name: 'order_id', data_type: 'integer' } },
        tags: ['mart'],
      },
      'test.analytics.not_null_orders_order_id': {
        unique_id: 'test.analytics.not_null_orders_order_id',
        resource_type: 'test',
        name: 'not_null_orders_order_id',
        package_name: 'analytics',
        original_file_path: 'models/schema.yml',
        depends_on: { nodes: ['model.analytics.orders'] },
        columns: {},
        tags: [],
        test_metadata: { name: 'not_null', kwargs: { column_name: 'order_id' } },
      },
    },
    sources: {
      'source.analytics.raw.orders': {
        unique_id: 'source.analytics.raw.orders',
        resource_type: 'source',
        name: 'orders',
        source_name: 'raw',
        package_name: 'analytics',
        original_file_path: 'models/sources.yml',
        depends_on: { nodes: [] },
        columns: { order_id: { name: 'order_id', data_type: 'integer' } },
        tags: ['raw'],
      },
    },
    exposures: {},
    metrics: {},
  };
}

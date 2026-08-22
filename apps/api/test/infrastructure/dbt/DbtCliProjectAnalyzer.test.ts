import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deriveDbtAnalysisSha256 } from '../../../src/infrastructure/dbt/dbtAnalysisIdentity.js';
import { DbtCliProjectAnalyzer } from '../../../src/infrastructure/dbt/DbtCliProjectAnalyzer.js';
import { hashProjectContent } from '../../../src/infrastructure/dbt/dbtProjectContentRevision.js';
import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const;

const LEGACY_V1_ANALYSIS_SHA256 =
  'c624060ca1dfab85fd29fda134e46268ff7663cb08a5a22f24c80c8200de5846';
const V2_ANALYSIS_SHA256 = '59cb46b63fb4e7c4ec89383386df21260defa523e27f1039e64da1104ad16055';

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
    let isolatedProjectDirectory = '';
    let isolatedTargetPath = '';
    let isolatedLogPath = '';
    const run = vi.fn().mockImplementation(async (input: { args: readonly string[] }) => {
      isolatedProjectDirectory = readFlag(input.args, '--project-dir');
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
    expect(result.semanticEvidence.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'dbt_project.yml',
          kind: 'project_config',
          byteLength: expect.any(Number),
          revisionSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        }),
        expect.objectContaining({
          path: 'models/orders.sql',
          kind: 'model',
        }),
      ])
    );
    expect(result.semanticEvidence.identities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ uniqueId: 'model.analytics.orders' }),
        expect.objectContaining({ uniqueId: 'source.analytics.raw.orders' }),
      ])
    );
    expect(result.semanticEvidence.regions).toEqual([
      expect.objectContaining({
        path: 'models/orders.sql',
        kind: 'source',
        classification: 'supported',
        targetUniqueId: 'source.analytics.raw.orders',
      }),
    ]);
    expect(result.semanticEvidence.diagnostics).toEqual([]);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        executable: 'dbt',
        cwd: isolatedProjectDirectory,
        args: expect.arrayContaining([
          'parse',
          '--no-partial-parse',
          '--project-dir',
          isolatedProjectDirectory,
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
    expect(path.relative(projectDirectory, isolatedProjectDirectory)).toMatch(/^\.\./);
    await expect(stat(path.join(isolatedProjectDirectory, 'target'))).rejects.toThrow();
    await expect(stat(isolatedTargetPath)).rejects.toThrow();
    await expect(stat(isolatedProjectDirectory)).rejects.toThrow();
  });

  it('runs selected model compilation through the same isolated DBT boundary', async () => {
    const run = vi.fn().mockImplementation(async (input: { args: readonly string[] }) => {
      const targetPath = readFlag(input.args, '--target-path');
      await mkdir(targetPath, { recursive: true });
      await writeFile(
        path.join(targetPath, 'manifest.json'),
        JSON.stringify({
          ...manifest(),
          nodes: {
            ...((manifest().nodes as Record<string, unknown>) ?? {}),
            'model.analytics.orders': {
              ...((manifest().nodes as Record<string, Record<string, unknown>>)[
                'model.analytics.orders'
              ] ?? {}),
              compiled_code: 'select * from raw.orders',
            },
          },
        }),
        'utf8'
      );
      return { kind: 'completed' as const, exitCode: 0, stdout: '', stderr: '' };
    });
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const result = await analyzer.analyze({
      scope: SCOPE,
      projectRoot: 'analytics',
      operation: { kind: 'compile', selectors: ['orders'] },
    });

    expect(result.status).toBe('valid');
    expect(
      result.resources.find((resource) => resource.uniqueId === 'model.analytics.orders')
    ).toEqual(expect.objectContaining({ compiledSql: 'select * from raw.orders' }));
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining(['compile', '--select', 'orders']),
      })
    );
    expect(run.mock.calls[0]?.[0].args).not.toContain('parse');
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
    expect(first.analysisSha256).toBe(V2_ANALYSIS_SHA256);
    expect(first.analysisSha256).not.toBe(LEGACY_V1_ANALYSIS_SHA256);
  });

  it('changes analysis identity when semantic evidence changes', () => {
    const identityInput = {
      status: 'valid' as const,
      contentSetSha256: 'content-sha',
      analyzerVersion: 'dvt-dbt-analyzer.v2',
      resources: [],
      dependencies: [],
      diagnostics: [],
      semanticEvidence: {
        files: [],
        identities: [],
        regions: [],
        diagnostics: [],
      },
    };

    const baseline = deriveDbtAnalysisSha256(identityInput);
    const changed = deriveDbtAnalysisSha256({
      ...identityInput,
      semanticEvidence: {
        ...identityInput.semanticEvidence,
        regions: [
          {
            regionId: 'region-1',
            ownerUniqueIds: ['model.analytics.orders'],
            path: 'models/orders.sql',
            kind: 'source',
            range: { startByte: 14, endByte: 40 },
            sourceSha256: 'source-sha',
            classification: 'supported',
            targetUniqueId: 'source.analytics.raw.orders',
          },
        ],
      },
    });

    expect(deriveDbtAnalysisSha256(identityInput)).toBe(baseline);
    expect(changed).not.toBe(baseline);
  });

  it('excludes generated artifacts while preserving installed dependencies for parsing', async () => {
    await writeFile(
      path.join(projectDirectory, 'dbt_project.yml'),
      [
        'name: analytics',
        'version: 1.0.0',
        'profile: analytics',
        'model-paths: [models]',
        'target-path: generated/target',
        'log-path: generated/logs',
        'packages-install-path: vendor/dbt',
        '',
      ].join('\n'),
      'utf8'
    );
    await rm(path.join(projectDirectory, 'target'), { recursive: true, force: true });
    const processRunner = {
      run: vi.fn().mockImplementation(async (input: { args: readonly string[] }) => {
        const projectPath = readFlag(input.args, '--project-dir');
        await expect(stat(path.join(projectPath, 'generated', 'target'))).rejects.toThrow();
        await expect(stat(path.join(projectPath, 'generated', 'logs'))).rejects.toThrow();
        await expect(
          readFile(path.join(projectPath, 'vendor', 'dbt', 'macros', 'package_macro.sql'), 'utf8')
        ).resolves.toContain('macro package_macro');
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
      maxProjectBytes: 512,
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });
    await mkdir(path.join(projectDirectory, 'generated', 'target'), { recursive: true });
    await mkdir(path.join(projectDirectory, 'generated', 'logs'), { recursive: true });
    await mkdir(path.join(projectDirectory, 'vendor', 'dbt', 'macros'), { recursive: true });
    await writeFile(path.join(projectDirectory, 'generated', 'target', 'manifest.json'), '{}');
    await writeFile(
      path.join(projectDirectory, 'vendor', 'dbt', 'macros', 'package_macro.sql'),
      '{% macro package_macro() %}1{% endmacro %}\n'
    );

    const first = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });
    await writeFile(
      path.join(projectDirectory, 'generated', 'target', 'manifest.json'),
      'x'.repeat(4_096)
    );
    await writeFile(
      path.join(projectDirectory, 'generated', 'logs', 'dbt.log'),
      'changed runtime log'
    );
    const afterGeneratedArtifactChange = await analyzer.analyze({
      scope: SCOPE,
      projectRoot: 'analytics',
    });
    await writeFile(
      path.join(projectDirectory, 'vendor', 'dbt', 'macros', 'package_macro.sql'),
      '{% macro package_macro() %}2{% endmacro %}\n'
    );
    const afterDependencyChange = await analyzer.analyze({
      scope: SCOPE,
      projectRoot: 'analytics',
    });

    expect(first.status).toBe('valid');
    expect(afterGeneratedArtifactChange.status).toBe('valid');
    expect(afterDependencyChange.status).toBe('valid');
    expect(afterGeneratedArtifactChange.projectRevision.contentSetSha256).toBe(
      first.projectRevision.contentSetSha256
    );
    expect(afterGeneratedArtifactChange.analysisSha256).toBe(first.analysisSha256);
    expect(afterDependencyChange.projectRevision.contentSetSha256).not.toBe(
      afterGeneratedArtifactChange.projectRevision.contentSetSha256
    );
  });

  it('hashes and parses the same isolated project snapshot', async () => {
    const originalSql = "select * from {{ source('raw', 'orders') }}\n";
    const changedSql = 'select 1 as changed_while_parsing\n';
    let analyzedProjectDirectory = '';
    let analyzedSql = '';
    const run = vi
      .fn()
      .mockImplementation(async (input: { args: readonly string[]; cwd: string }) => {
        analyzedProjectDirectory = readFlag(input.args, '--project-dir');
        analyzedSql = await readFile(
          path.join(analyzedProjectDirectory, 'models', 'orders.sql'),
          'utf8'
        );
        await writeFile(path.join(projectDirectory, 'models', 'orders.sql'), changedSql, 'utf8');
        const targetPath = readFlag(input.args, '--target-path');
        await mkdir(targetPath, { recursive: true });
        await writeFile(path.join(targetPath, 'manifest.json'), JSON.stringify(manifest()), 'utf8');
        return { kind: 'completed' as const, exitCode: 0, stdout: '', stderr: '' };
      });
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });
    const expectedRevision = await hashProjectContent(
      projectDirectory,
      {
        maxFiles: 10_000,
        maxBytes: 50_000_000,
        maxDirectories: 5_000,
        maxDepth: 64,
      },
      {
        excludedDirectoryPaths: ['target', 'logs'],
      }
    );

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('valid');
    expect(result.projectRevision.contentSetSha256).toBe(expectedRevision.sha256);
    expect(analyzedSql).toBe(originalSql);
    expect(analyzedProjectDirectory).not.toBe(projectDirectory);
    expect(path.relative(projectDirectory, analyzedProjectDirectory)).toMatch(/^\.\./);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: analyzedProjectDirectory,
        args: expect.arrayContaining(['--project-dir', analyzedProjectDirectory]),
      })
    );
    await expect(stat(analyzedProjectDirectory)).rejects.toThrow();
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
    expect(result.semanticEvidence.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'dbt_project.yml',
          revisionSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        }),
        expect.objectContaining({
          path: 'models/orders.sql',
          revisionSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        }),
      ])
    );
    expect(result.semanticEvidence.identities).toEqual([]);
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
    expect(result.semanticEvidence.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'dbt_project.yml' }),
        expect.objectContaining({ path: 'models/orders.sql' }),
      ])
    );
    expect(result.semanticEvidence.identities).toEqual([]);
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

  it('rejects snapshot-escaping dbt paths before invoking the analyzer process', async () => {
    await writeFile(
      path.join(projectDirectory, 'dbt_project.yml'),
      'name: analytics\nversion: 1.0.0\nprofile: analytics\nmodel-paths: [../outside]\n',
      'utf8'
    );
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('invalid');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'dbt_project_invalid', severity: 'error' }),
    ]);
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
    metadata: { dbt_version: '1.10.0', project_name: 'analytics' },
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

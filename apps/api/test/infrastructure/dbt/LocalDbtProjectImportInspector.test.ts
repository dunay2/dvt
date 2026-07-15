import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalDbtProjectImportInspector } from '../../../src/infrastructure/dbt/LocalDbtProjectImportInspector.js';
import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

const SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' } as const;

describe('LocalDbtProjectImportInspector', () => {
  let workspaceRoot: string;
  let projectRoot: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-import-inspector-'));
    projectRoot = path.join(resolveWorkspaceScopeStorageRoot(workspaceRoot, SCOPE), 'analytics');
    await mkdir(path.join(projectRoot, 'models'), { recursive: true });
    await writeFile(
      path.join(projectRoot, 'dbt_project.yml'),
      'name: analytics\nversion: 1.0.0\nprofile: analytics\nmodel-paths: [models]\n'
    );
    await writeFile(path.join(projectRoot, 'models', 'orders.sql'), 'select 1 as order_id\n');
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('returns a complete deterministic inventory and explicitly excludes runtime artifacts', async () => {
    await mkdir(path.join(projectRoot, 'target'));
    await writeFile(path.join(projectRoot, 'target', 'manifest.json'), '{}');
    const inspector = new LocalDbtProjectImportInspector({ workspaceFilesRoot: workspaceRoot });

    const result = await inspector.inspect({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.projectName).toBe('analytics');
    expect(result.diagnostics).toEqual([]);
    expect(result.inventory).toMatchObject({
      fileCount: 3,
      includedFileCount: 2,
      excludedFileCount: 1,
    });
    expect(result.inventory.files).toEqual([
      expect.objectContaining({
        path: 'analytics/dbt_project.yml',
        classification: 'project-config',
        decision: 'included',
      }),
      expect.objectContaining({
        path: 'analytics/models/orders.sql',
        classification: 'resource-sql',
        decision: 'included',
      }),
      expect.objectContaining({
        path: 'analytics/target/manifest.json',
        classification: 'runtime-artifact',
        decision: 'excluded-runtime-artifact',
      }),
    ]);
  });

  it('partitions configured non-source paths without hiding nested source directories', async () => {
    await writeFile(
      path.join(projectRoot, 'dbt_project.yml'),
      [
        'name: analytics',
        'model-paths: [models]',
        'target-path: generated/target',
        'log-path: generated/logs',
        'packages-install-path: vendor/dbt',
        '',
      ].join('\n')
    );
    await mkdir(path.join(projectRoot, 'models', 'target'), { recursive: true });
    await mkdir(path.join(projectRoot, 'generated', 'target'), { recursive: true });
    await mkdir(path.join(projectRoot, 'generated', 'logs'), { recursive: true });
    await mkdir(path.join(projectRoot, 'vendor', 'dbt'), { recursive: true });
    await writeFile(path.join(projectRoot, 'models', 'target', 'daily.sql'), 'select 2\n');
    await writeFile(
      path.join(projectRoot, 'generated', 'target', 'manifest.json'),
      'x'.repeat(4_096)
    );
    await writeFile(path.join(projectRoot, 'generated', 'logs', 'dbt.log'), 'runtime log');
    await writeFile(path.join(projectRoot, 'vendor', 'dbt', 'package.json'), 'x'.repeat(4_096));
    const inspector = new LocalDbtProjectImportInspector({
      workspaceFilesRoot: workspaceRoot,
      maxProjectBytes: 512,
    });

    const result = await inspector.inspect({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.diagnostics).toEqual([]);
    expect(result.inventory.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'analytics/models/target/daily.sql',
          classification: 'resource-sql',
          decision: 'included',
        }),
        expect.objectContaining({
          path: 'analytics/generated/target/manifest.json',
          classification: 'runtime-artifact',
          decision: 'excluded-runtime-artifact',
        }),
        expect.objectContaining({
          path: 'analytics/generated/logs/dbt.log',
          classification: 'runtime-artifact',
          decision: 'excluded-runtime-artifact',
        }),
        expect.objectContaining({
          path: 'analytics/vendor/dbt/package.json',
          classification: 'runtime-artifact',
          decision: 'excluded-runtime-artifact',
          reason: expect.stringContaining('Installed dbt dependencies'),
        }),
      ])
    );
  });

  it('rejects secret material and binary project files with path-specific diagnostics', async () => {
    await writeFile(path.join(projectRoot, 'profiles.yml'), 'analytics: {target: dev}\n');
    await writeFile(path.join(projectRoot, 'models', 'payload.bin'), Buffer.from([0, 1, 2]));
    const inspector = new LocalDbtProjectImportInspector({ workspaceFilesRoot: workspaceRoot });

    const result = await inspector.inspect({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'dbt_project_secret_material',
          path: 'analytics/profiles.yml',
        }),
        expect.objectContaining({
          code: 'dbt_project_binary_file',
          path: 'analytics/models/payload.bin',
        }),
      ])
    );
    expect(result.inventory.files.filter((file) => file.decision === 'rejected')).toHaveLength(2);
  });

  it('rejects project path configuration that escapes the project root', async () => {
    await writeFile(
      path.join(projectRoot, 'dbt_project.yml'),
      'name: analytics\nmodel-paths: [../shared]\n'
    );
    const inspector = new LocalDbtProjectImportInspector({ workspaceFilesRoot: workspaceRoot });

    const result = await inspector.inspect({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'dbt_project_path_unsafe',
        path: 'analytics/dbt_project.yml',
      })
    );
  });

  it('fails closed when the project exceeds configured file limits', async () => {
    const inspector = new LocalDbtProjectImportInspector({
      workspaceFilesRoot: workspaceRoot,
      maxProjectFiles: 1,
    });

    const result = await inspector.inspect({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'dbt_project_limits_exceeded' })
    );
  });

  it('does not charge excluded artifacts or installed dependencies to the source-file limit', async () => {
    await mkdir(path.join(projectRoot, 'target'), { recursive: true });
    await mkdir(path.join(projectRoot, 'dbt_packages', 'package'), { recursive: true });
    await writeFile(path.join(projectRoot, 'target', 'manifest.json'), '{}');
    await writeFile(path.join(projectRoot, 'dbt_packages', 'package', 'package.json'), '{}');
    await writeFile(path.join(projectRoot, 'dbt_packages', 'package', 'state.json'), '{}');
    const inspector = new LocalDbtProjectImportInspector({
      workspaceFilesRoot: workspaceRoot,
      maxProjectFiles: 2,
    });

    const result = await inspector.inspect({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.diagnostics).toEqual([]);
    expect(result.inventory).toMatchObject({
      includedFileCount: 2,
      excludedFileCount: 3,
    });
  });

  it('limits total file-system inspection independently from imported source files', async () => {
    await mkdir(path.join(projectRoot, 'target'), { recursive: true });
    await writeFile(path.join(projectRoot, 'target', 'manifest.json'), '{}');
    const inspector = new LocalDbtProjectImportInspector({
      workspaceFilesRoot: workspaceRoot,
      maxProjectFiles: 100,
      maxInspectedFiles: 2,
    });

    const result = await inspector.inspect({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'dbt_project_limits_exceeded' })
    );
  });
});

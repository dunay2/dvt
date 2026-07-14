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
});

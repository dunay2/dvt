import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';
import { promisify } from 'node:util';
import { gunzip } from 'node:zlib';

import { afterEach, describe, expect, it } from 'vitest';

import { DbtProjectBundleBuilder } from '../../../src/infrastructure/dbt/DbtProjectBundleBuilder.js';
import { snapshotDbtProjectSource } from '../../../src/infrastructure/dbt/dbtProjectSourceSnapshot.js';
import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

const gunzipAsync = promisify(gunzip);
const LIMITS = {
  maxFiles: 100,
  maxBytes: 100_000,
  maxDirectories: 100,
  maxDepth: 12,
} as const;
const SCOPE = { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' } as const;
const roots: string[] = [];

describe('DbtProjectBundleBuilder', () => {
  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it('writes a deterministic bundle from the exact authorized project revision', async () => {
    const workspaceFilesRoot = await makeRoot('dvt-dbt-bundle-workspace-');
    const bundleRoot = await makeRoot('dvt-dbt-bundle-store-');
    const projectDirectory = path.join(
      resolveWorkspaceScopeStorageRoot(workspaceFilesRoot, SCOPE),
      'analytics'
    );
    await writeProject(projectDirectory);
    const expectedRevision = await readRevision(projectDirectory);
    const builder = new DbtProjectBundleBuilder({
      workspaceFilesRoot,
      bundleStore: { kind: 'file', rootPath: bundleRoot },
      limits: LIMITS,
    });

    const first = await builder.build({
      scope: SCOPE,
      projectRoot: 'analytics',
      expectedContentSetSha256: expectedRevision,
    });
    const second = await builder.build({
      scope: SCOPE,
      projectRoot: 'analytics',
      expectedContentSetSha256: expectedRevision,
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({ ok: true, contentSetSha256: expectedRevision });
    if (!first.ok) throw new Error('Expected a DBT bundle.');
    const archive = await gunzipAsync(await readFile(new URL(first.projectBundleRef.uri)));
    const renderedArchive = archive.toString('utf8');
    expect(renderedArchive).toContain('bundle/dbt_project.yml');
    expect(renderedArchive).toContain('bundle/models/orders.sql');
    expect(renderedArchive).not.toContain('profiles.yml');
    expect(renderedArchive).not.toContain('.env.production');
    expect(renderedArchive).not.toContain('target/manifest.json');
    expect(renderedArchive).not.toContain('.git/config');
  });

  it('rejects a changed project revision before creating an artifact', async () => {
    const workspaceFilesRoot = await makeRoot('dvt-dbt-bundle-workspace-');
    const bundleRoot = await makeRoot('dvt-dbt-bundle-store-');
    const projectDirectory = path.join(
      resolveWorkspaceScopeStorageRoot(workspaceFilesRoot, SCOPE),
      'analytics'
    );
    await writeProject(projectDirectory);
    const expectedRevision = await readRevision(projectDirectory);
    await writeFile(path.join(projectDirectory, 'models', 'orders.sql'), 'select 2 as id\n');
    const builder = new DbtProjectBundleBuilder({
      workspaceFilesRoot,
      bundleStore: { kind: 'file', rootPath: bundleRoot },
      limits: LIMITS,
    });

    const result = await builder.build({
      scope: SCOPE,
      projectRoot: 'analytics',
      expectedContentSetSha256: expectedRevision,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'revision_mismatch',
      expectedContentSetSha256: expectedRevision,
    });
    expect(await readdir(bundleRoot)).toEqual([]);
  });
});

async function makeRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

async function writeProject(projectDirectory: string): Promise<void> {
  await Promise.all([
    mkdir(path.join(projectDirectory, 'models'), { recursive: true }),
    mkdir(path.join(projectDirectory, 'target'), { recursive: true }),
    mkdir(path.join(projectDirectory, '.git'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(projectDirectory, 'dbt_project.yml'), 'name: analytics\n'),
    writeFile(path.join(projectDirectory, 'models', 'orders.sql'), 'select 1 as id\n'),
    writeFile(path.join(projectDirectory, 'profiles.yml'), 'password: secret\n'),
    writeFile(path.join(projectDirectory, '.env.production'), 'TOKEN=secret\n'),
    writeFile(path.join(projectDirectory, 'target', 'manifest.json'), '{}\n'),
    writeFile(path.join(projectDirectory, '.git', 'config'), 'credential=secret\n'),
  ]);
}

async function readRevision(projectDirectory: string): Promise<string> {
  const snapshot = await makeRoot('dvt-dbt-bundle-revision-');
  return (
    await snapshotDbtProjectSource({
      projectDirectory,
      snapshotDirectory: snapshot,
      limits: LIMITS,
    })
  ).sha256;
}

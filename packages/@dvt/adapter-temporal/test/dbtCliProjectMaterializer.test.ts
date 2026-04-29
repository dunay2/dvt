import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { asIsoUtcString, asNonBlankString, type DbtProjectBundleRef } from '@dvt/contracts';
import { c as createTarball } from 'tar';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDbtProjectMaterializer } from '../src/plugins/dbt/dbtCliProjectMaterializer.js';
import type { DbtPluginExecutionInput } from '../src/plugins/dbt/dbtPluginTypes.js';

const tempRoots: string[] = [];

describe('dbtCliProjectMaterializer', () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((path) => rm(path, { recursive: true, force: true }))
    );
  });

  it('extracts every bundle entry before discovering the DBT project directory', async () => {
    const fixtureRoot = await createTempRoot('dvt-dbt-bundle-src-');
    const workdirRoot = await createTempRoot('dvt-dbt-work-');
    const bundleBytes = await createBundleArchive(fixtureRoot, {
      'bundle/dbt_project.yml': 'name: analytics\nversion: "1.0"\n',
      'bundle/models/orders.sql': 'select 1 as id\n',
    });
    const bundleReader = {
      read: vi.fn(async () => bundleBytes),
    };
    const materializeProject = createDbtProjectMaterializer(bundleReader, workdirRoot);

    const project = await materializeProject(createInput());

    try {
      expect((await stat(join(project.projectDir, 'dbt_project.yml'))).isFile()).toBe(true);
      await expect(readFile(join(project.projectDir, 'models/orders.sql'), 'utf8')).resolves.toBe(
        'select 1 as id\n'
      );
      expect(bundleReader.read).toHaveBeenCalledWith(createProjectBundleRef(), {
        expectedTenantId: 'tenant-1',
      });
    } finally {
      await project.cleanup();
    }

    await expect(readdir(workdirRoot)).resolves.toEqual([]);
  });

  it('removes the worker-local materialization directory when the bundle has no DBT project', async () => {
    const fixtureRoot = await createTempRoot('dvt-dbt-invalid-bundle-src-');
    const workdirRoot = await createTempRoot('dvt-dbt-invalid-work-');
    const bundleBytes = await createBundleArchive(fixtureRoot, {
      'bundle/models/orders.sql': 'select 1 as id\n',
    });
    const materializeProject = createDbtProjectMaterializer(
      {
        read: vi.fn(async () => bundleBytes),
      },
      workdirRoot
    );

    await expect(materializeProject(createInput())).rejects.toThrow(
      'DBT_PROJECT_DIRECTORY_NOT_FOUND'
    );
    await expect(readdir(workdirRoot)).resolves.toEqual([]);
  });
});

async function createTempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempRoots.push(root);

  return root;
}

async function createBundleArchive(
  fixtureRoot: string,
  entries: Record<string, string>
): Promise<Uint8Array> {
  for (const [relativePath, contents] of Object.entries(entries)) {
    const path = join(fixtureRoot, relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
  }

  const archivePath = join(fixtureRoot, 'bundle.tgz');
  await createTarball.asyncFile(
    {
      cwd: fixtureRoot,
      file: archivePath,
      gzip: true,
    },
    ['bundle']
  );

  return readFile(archivePath);
}

function createInput(): DbtPluginExecutionInput {
  const projectBundleRef = createProjectBundleRef();

  return {
    step: {
      stepId: asNonBlankString('model.analytics.orders'),
      kind: 'DBT_MODEL',
      dependsOn: [],
    },
    executionIdentity: {
      tenantId: 'tenant-1',
      runId: 'run-1',
      environmentId: 'env-1',
    },
    runContext: {
      tenantId: asNonBlankString('tenant-1'),
      projectId: asNonBlankString('project-1'),
      environmentId: asNonBlankString('env-1'),
      runId: asNonBlankString('run-1'),
      targetAdapter: 'temporal',
      logicalAttemptId: 1,
      originRunId: asNonBlankString('run-1'),
    },
    runExecutionContext: {
      schemaVersion: asNonBlankString('v1.0'),
      planId: asNonBlankString('plan-1'),
      planVersion: asNonBlankString('1.0'),
      planSha256: asNonBlankString('a'.repeat(64)),
      tenantId: asNonBlankString('tenant-1'),
      projectId: asNonBlankString('project-1'),
      environmentId: asNonBlankString('env-1'),
      targetAdapter: 'temporal',
      createdAtIso: asIsoUtcString('2026-04-14T00:00:00.000Z'),
      createdBy: asNonBlankString('test'),
      pluginContexts: {
        dbt: {
          projectBundleRef,
          targetProfile: asNonBlankString('analytics'),
        },
      },
    },
    pluginContext: {
      projectBundleRef,
      targetProfile: asNonBlankString('analytics'),
    },
  };
}

function createProjectBundleRef(): DbtProjectBundleRef {
  return {
    uri: 's3://bundle/tenants/tenant-1/bundle.tgz',
    kind: 'dbt-project-bundle',
    sha256: 'b'.repeat(64),
    tenantId: 'tenant-1',
  };
}

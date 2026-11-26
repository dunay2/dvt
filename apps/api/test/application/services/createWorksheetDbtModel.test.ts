/** Verify real workspace writes and rollback-free refusals in a temporary workspace. */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { asSha256HexString } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { afterEach, beforeEach, expect, it } from 'vitest';

import { CreateWorksheetDbtModel } from '../../../src/application/services/createWorksheetDbtModel.js';
import { resolveWorksheetDbtModelDirectory } from '../../../src/infrastructure/dbt/dbtProjectPathPolicy.js';
import { LocalWorkspaceFileBatchMutationGateway } from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.js';
import { LocalWorkspaceFileRepository } from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
const canvasId = 'file-canvas';
const projectRoot = 'analytics';
const config = 'name: demo\nversion: 1.0.0\nmodel-paths: [warehouse/models]\n';
const input = {
  canvasId,
  projectRoot,
  configSha256: asSha256HexString(sha256HexUtf8(config)),
  name: 'weekly_orders',
  sql: 'select 1 as orders;',
  requestId: '87985a9e-b8fb-4a4e-9576-1eb5ed649169',
};
const target = 'analytics/warehouse/models/weekly_orders.sql';
let dir: string;
let files: LocalWorkspaceFileRepository;
let command: CreateWorksheetDbtModel;
let owner = canvasId;
let resources: {
  resourceType: 'model';
  name: string;
  originalFilePath: string;
  packageName: string;
}[];
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'dvt-worksheet-model-'));
  files = new LocalWorkspaceFileRepository({ root: dir });
  owner = canvasId;
  resources = [];
  command = new CreateWorksheetDbtModel({
    files,
    batch: new LocalWorkspaceFileBatchMutationGateway({ root: dir }),
    modelDirectory: resolveWorksheetDbtModelDirectory,
    projectGraph: async () => ({
      freshness: 'fresh',
      nodes: resources,
      projectRevision: { projectRoot },
    }),
    resolveAuthority: async () => ({
      kind: 'resolved',
      binding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: owner,
        authority: { kind: 'dbt-project-files', projectRoot },
      },
    }),
    withLock: async (_key, action) => action(),
  });
  await files.saveFileContent(scope, {
    path: 'analytics/dbt_project.yml',
    content: config,
    expectedRevision: { kind: 'absent' },
  });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

it('creates a model inside the configured directory and replays the same operation', async () => {
  const result = await command.execute(scope, input);
  expect(result).toMatchObject({ kind: 'created', path: target });
  expect(await command.execute(scope, input)).toEqual(result);
  expect((await files.getFileContent(scope, target)).content.toLowerCase()).toContain(
    'select 1 as orders'
  );
});

it('preserves a pre-existing file and refuses competing publication', async () => {
  await files.saveFileContent(scope, {
    path: target,
    content: 'select 9',
    expectedRevision: { kind: 'absent' },
  });
  expect(await command.execute(scope, input)).toEqual({ kind: 'refused', reason: 'conflict' });
  expect((await files.getFileContent(scope, target)).content).toBe('select 9');
});

it('rejects a superseded configuration and a foreign project owner before publication', async () => {
  expect(
    await command.execute(scope, { ...input, configSha256: asSha256HexString('a'.repeat(64)) })
  ).toEqual({ kind: 'refused', reason: 'conflict' });
  owner = 'other';
  expect(await command.execute(scope, input)).toEqual({
    kind: 'refused',
    reason: 'project_unavailable',
  });
  await expect(files.getFileContent(scope, target)).rejects.toThrow();
});

it.each(['delete from accounts', 'select 1; select 2', "select '{{ var(1) }}'"])(
  'rejects ineligible SQL %s',
  async (sql) => {
    expect(await command.execute(scope, { ...input, sql })).toEqual({
      kind: 'refused',
      reason: 'invalid_sql',
    });
    await expect(files.getFileContent(scope, target)).rejects.toThrow();
  }
);

it('honors default and configured model paths, rejecting invalid configurations', () => {
  const resolve = (content: string): string | undefined =>
    resolveWorksheetDbtModelDirectory({ path: 'project/dbt_project.yml', content })
      ?.workspaceDirectory;
  expect(resolve('name: demo')).toBe('project/models');
  expect(resolve(config)).toBe('project/warehouse/models');
  expect(resolve('name: demo\nmodel-paths: [../escape]')).toBeUndefined();
});

it('refuses an existing dbt model name in another folder of the same package', async () => {
  resources.push({
    resourceType: 'model',
    name: input.name,
    originalFilePath: 'warehouse/models/finance/weekly_orders.sql',
    packageName: 'demo',
  });
  expect(await command.execute(scope, input)).toEqual({ kind: 'refused', reason: 'conflict' });
  await expect(files.getFileContent(scope, target)).rejects.toThrow();
});

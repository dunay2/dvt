import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { DbtProjectRootRelocationPlan } from '@dvt/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanvasAuthoringAuthorityStoredRecord } from '../../src/application/ports/canvasAuthoringAuthority.js';
import type { IDbtProjectRootAuthorityPort } from '../../src/application/ports/dbtProjectRootRelocation.js';
import { PreviewDbtProjectRootRelocationQuery } from '../../src/application/services/dbtProjectRootRelocation/PreviewDbtProjectRootRelocationQuery.js';
import { RelocateDbtProjectRootCommand } from '../../src/application/services/dbtProjectRootRelocation/RelocateDbtProjectRootCommand.js';
import { LocalDbtProjectImportInspector } from '../../src/infrastructure/dbt/LocalDbtProjectImportInspector.js';
import { LocalWorkspaceFileBatchMutationGateway } from '../../src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.js';
import { LocalWorkspaceFileRepository } from '../../src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import { LocalWorkspaceMetadataFileRepository } from '../../src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.js';
import { LocalWorkspaceRootInventory } from '../../src/infrastructure/workspaceFiles/LocalWorkspaceRootInventory.js';
import { resolveWorkspaceScopeStorageRoot } from '../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
const sql = "select * from {{ ref('customers') }} -- keep user text\r\n";

describe('dbt project root relocation', () => {
  let root: string;
  let directory: string;
  let record: CanvasAuthoringAuthorityStoredRecord;
  let failCommit: boolean;
  let publications: number;
  let preview: PreviewDbtProjectRootRelocationQuery;
  let command: RelocateDbtProjectRootCommand;
  let metadata: LocalWorkspaceMetadataFileRepository;

  const seed = async (file: string, content: string): Promise<void> => {
    await mkdir(path.dirname(path.join(directory, file)), { recursive: true });
    await writeFile(path.join(directory, file), content);
  };

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-root-relocation-'));
    directory = resolveWorkspaceScopeStorageRoot(root, scope);
    await seed(
      'imported/dbt_project.yml',
      "name: analytics\nversion: '1.0'\nconfig-version: 2\nmodel-paths: ['models']\n"
    );
    await seed('imported/models/orders.sql', sql);
    await seed('models/sources/raw.yml', 'version: 2\nsources: []\n');
    record = {
      key: { ...scope, canvasId: 'files' },
      revision: 'before',
      updatedAt: '2026-11-02T10:00:00.000Z',
      binding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'files',
        authority: { kind: 'dbt-project-files', projectRoot: 'imported' },
      },
    };
    failCommit = false;
    publications = 0;
    const authorities: IDbtProjectRootAuthorityPort = {
      readProjectFileAuthorities: async () => [record],
      commitRootRelocation: async (input, publish) => {
        if (record.revision === input.newRevision)
          return { kind: 'relocated', record, deduplicated: true };
        if (record.revision !== input.expectedRevision)
          return { kind: 'refused', reason: 'stale_authority' };
        publications++;
        await publish();
        if (failCommit) throw new Error('Simulated database commit failure');
        record = {
          ...record,
          revision: input.newRevision,
          binding: {
            ...record.binding,
            authority: { kind: 'dbt-project-files', projectRoot: '.' },
          },
        };
        return { kind: 'relocated', record, deduplicated: false };
      },
    };
    const deps = {
      authorities,
      authorityPolicy: { resolve: async () => record.binding },
      workspaceFiles: new LocalWorkspaceFileRepository({ root }),
      inventory: new LocalWorkspaceRootInventory(root),
      inspector: new LocalDbtProjectImportInspector({ workspaceFilesRoot: root }),
      maxBytes: 5_000_000,
    };
    metadata = new LocalWorkspaceMetadataFileRepository({ root });
    preview = new PreviewDbtProjectRootRelocationQuery(deps);
    command = new RelocateDbtProjectRootCommand({
      ...deps,
      metadata,
      batchMutation: new LocalWorkspaceFileBatchMutationGateway({ root }),
      nowIso: () => '2026-11-02T11:00:00.000Z',
    });
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function plan(): Promise<DbtProjectRootRelocationPlan> {
    const result = await preview.execute({ scope, canvasId: 'files' });
    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') throw new Error(JSON.stringify(result));
    return result.plan;
  }

  it('moves every project file without rewriting SQL and merges the existing models directory', async () => {
    const input = await plan();
    expect(await readFile(path.join(directory, 'imported/models/orders.sql'), 'utf8')).toBe(sql);
    expect(await command.execute({ scope, plan: input })).toMatchObject({
      kind: 'relocated',
      deduplicated: false,
      sourceDirectoryRetained: false,
    });
    expect(await readFile(path.join(directory, 'models/orders.sql'), 'utf8')).toBe(sql);
    expect(await readFile(path.join(directory, 'models/sources/raw.yml'), 'utf8')).toContain(
      'version: 2'
    );
    await expect(readFile(path.join(directory, 'imported/dbt_project.yml'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(record.binding.authority).toEqual({ kind: 'dbt-project-files', projectRoot: '.' });
    expect(await preview.execute({ scope, canvasId: 'files' })).toMatchObject({
      kind: 'already_normalized',
    });
  });
  it('replays a completed receipt without overwriting subsequent user changes', async () => {
    const input = await plan();
    await command.execute({ scope, plan: input });
    await seed('models/orders.sql', 'a later user edit');
    expect(await command.execute({ scope, plan: input })).toMatchObject({
      kind: 'relocated',
      deduplicated: true,
    });
    expect(await readFile(path.join(directory, 'models/orders.sql'), 'utf8')).toBe(
      'a later user edit'
    );
    expect(publications).toBe(1);
  });
  it('recovers file publication after database rollback using the private snapshot', async () => {
    const input = await plan();
    failCommit = true;
    await expect(command.execute({ scope, plan: input })).rejects.toThrow('commit failure');
    expect(record.revision).toBe('before');
    failCommit = false;
    expect(await command.execute({ scope, plan: input })).toMatchObject({ kind: 'relocated' });
    expect(await readFile(path.join(directory, 'models/orders.sql'), 'utf8')).toBe(sql);
  });
  it('retains recovery evidence and refuses to restore a file deleted after publication', async () => {
    const input = await plan();
    failCommit = true;
    await expect(command.execute({ scope, plan: input })).rejects.toThrow();
    failCommit = false;
    await rm(path.join(directory, 'models/orders.sql'));
    expect(await command.execute({ scope, plan: input })).toMatchObject({
      kind: 'refused',
      reason: 'recovery_conflict',
    });
    expect(
      await metadata.getFileContent(scope, `.dvt/dbt-root-relocations/${input.planSha256}.json`)
    ).toMatchObject({ content: expect.stringContaining('keep user text') });
    expect(record.revision).toBe('before');
  });
  it('refuses destination collisions, private credentials and changed source inventories', async () => {
    await seed('models/orders.sql', 'different destination');
    expect(await preview.execute({ scope, canvasId: 'files' })).toMatchObject({
      kind: 'refused',
      reason: 'destination_conflict',
    });
    await rm(path.join(directory, 'models/orders.sql'));
    await seed('imported/profiles.yml', 'private credential material');
    expect(await preview.execute({ scope, canvasId: 'files' })).toMatchObject({
      kind: 'refused',
      reason: 'private_file',
    });
    await rm(path.join(directory, 'imported/profiles.yml'));
    const input = await plan();
    await seed('imported/models/later.sql', 'later');
    expect(await command.execute({ scope, plan: input })).toMatchObject({
      kind: 'refused',
      reason: 'stale_files',
    });
    expect(await readFile(path.join(directory, 'imported/models/orders.sql'), 'utf8')).toBe(sql);
  });
  it('rejects scope replay and authority changes before publishing files', async () => {
    const input = await plan();
    expect(
      await command.execute({ scope: { ...scope, tenantId: 'other' }, plan: input })
    ).toMatchObject({ kind: 'refused', reason: 'scope_mismatch' });
    record = { ...record, revision: 'new-authority' };
    expect(await command.execute({ scope, plan: input })).toMatchObject({
      kind: 'refused',
      reason: 'stale_authority',
    });
    expect(publications).toBe(0);
  });
});

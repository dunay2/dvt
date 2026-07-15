import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  InvalidWorkspacePathError,
  WorkspaceFileNotFoundError,
} from '../../../src/application/ports/workspaceFiles.js';
import { LocalWorkspaceFileRepository } from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import { LocalWorkspaceMetadataFileRepository } from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.js';

const SCOPE = {
  tenantId: 'tenant',
  projectId: 'project',
  environmentId: 'dev',
} as const;

describe('LocalWorkspaceMetadataFileRepository', () => {
  let namespaceRoot: string;

  beforeEach(async () => {
    namespaceRoot = await mkdtemp(path.join(tmpdir(), 'dvt-workspace-metadata-'));
  });

  afterEach(async () => {
    await rm(namespaceRoot, { recursive: true, force: true });
  });

  it('persists canonical .dvt metadata without exposing it through project files', async () => {
    const projectFiles = new LocalWorkspaceFileRepository({ root: namespaceRoot });
    const metadataFiles = new LocalWorkspaceMetadataFileRepository({ root: namespaceRoot });
    const logicalPath = '.dvt/warehouse-connections.json';
    const content = JSON.stringify({ connections: [], padding: 'x'.repeat(1_050_000) });

    await expect(
      metadataFiles.saveFileContent(SCOPE, {
        path: logicalPath,
        content,
        expectedRevision: { kind: 'absent' },
      })
    ).resolves.toMatchObject({
      kind: 'saved',
      path: logicalPath,
    });
    await expect(metadataFiles.getFileContent(SCOPE, logicalPath)).resolves.toMatchObject({
      path: logicalPath,
      content,
    });
    await expect(projectFiles.listFiles(SCOPE)).resolves.toEqual([]);
    await expect(projectFiles.getFileContent(SCOPE, logicalPath)).rejects.toBeInstanceOf(
      WorkspaceFileNotFoundError
    );
  });

  it('rejects paths outside the reserved metadata namespace', async () => {
    const metadataFiles = new LocalWorkspaceMetadataFileRepository({ root: namespaceRoot });

    await expect(metadataFiles.getFileContent(SCOPE, 'models/orders.sql')).rejects.toBeInstanceOf(
      InvalidWorkspacePathError
    );
  });

  it('migrates metadata from the project-file namespace and removes the old copy', async () => {
    const projectFiles = new LocalWorkspaceFileRepository({ root: namespaceRoot });
    const metadataFiles = new LocalWorkspaceMetadataFileRepository({ root: namespaceRoot });
    const logicalPath = '.dvt/warehouse-connections.json';
    const content = JSON.stringify({ connections: [{ id: 'warehouse-a' }] });

    await projectFiles.saveFileContent(SCOPE, {
      path: logicalPath,
      content,
      expectedRevision: { kind: 'absent' },
    });

    await expect(metadataFiles.getFileContent(SCOPE, logicalPath)).resolves.toMatchObject({
      path: logicalPath,
      content,
    });
    await expect(projectFiles.getFileContent(SCOPE, logicalPath)).rejects.toBeInstanceOf(
      WorkspaceFileNotFoundError
    );
    await expect(metadataFiles.getFileContent(SCOPE, logicalPath)).resolves.toMatchObject({
      content,
    });
  });
});

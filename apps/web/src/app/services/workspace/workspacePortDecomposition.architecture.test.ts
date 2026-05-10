import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readRepoFile(...segments: string[]): string {
  return readFileSync(resolve(process.cwd(), ...segments), 'utf8');
}

describe('workspace port decomposition architecture', () => {
  it('does not expose a broad IWorkspacePort god port', () => {
    const source = readRepoFile('src', 'app', 'ports', 'workspace.ts');

    expect(source).not.toContain('export interface IWorkspacePort');
    expect(source).toContain('export interface IWorkspaceGraphSnapshotQueryPort');
    expect(source).toContain('export interface IWorkspaceFilesQueryPort');
    expect(source).toContain('export interface IWorkspaceDiffQueryPort');
    expect(source).toContain('export interface IWorkspaceAdminReadPort');
    expect(source).toContain('export interface IWarehouseSourceImportPort');
  });

  it('keeps read ports free of command methods', () => {
    const source = readRepoFile('src', 'app', 'ports', 'workspace.ts');

    const filesPort = source.slice(
      source.indexOf('export interface IWorkspaceFilesQueryPort'),
      source.indexOf('export interface IWorkspaceDiffQueryPort')
    );

    expect(filesPort).toContain('listFiles');
    expect(filesPort).toContain('getFileContent');
    expect(filesPort).not.toContain('saveFileContent');
    expect(filesPort).not.toContain('importSources');
  });

  it('keeps API missing rails unavailable before transport', () => {
    const source = readRepoFile('src', 'app', 'services', 'workspace', 'workspacePorts.api.ts');

    expect(source).toContain('createApiWorkspaceDiffQueryPort');
    expect(source).toContain('createApiWorkspaceAdminReadPort');
    expect(source).toContain('createApiWarehouseSourceImportPort');
    expect(source).not.toContain("getJson<DiffChange[]>('/diff/changes')");
    expect(source).not.toContain("getJson<Plugin[]>('/plugins')");
    expect(source).not.toContain("getJson<Role[]>('/admin/roles')");
    expect(source).not.toContain("getJson<AuditLogEntry[]>('/admin/audit')");
  });

  it('hard-cuts composition hooks away from the legacy workspace service shape', () => {
    const compositionSource = readRepoFile(
      'src',
      'app',
      'services',
      'composition',
      'appServices.ts'
    );
    const contextSource = readRepoFile('src', 'app', 'services', 'AppServicesContext.tsx');
    const serviceSource = readRepoFile('src', 'app', 'services', 'workspace', 'workspacePorts.ts');

    expect(compositionSource).not.toContain('readonly workspaceService');
    expect(compositionSource).not.toContain('workspaceService?:');
    expect(contextSource).not.toContain('useWorkspaceService');
    expect(serviceSource).not.toContain('createWorkspaceService');
    expect(compositionSource).toContain('workspaceGraphSnapshotQuery');
    expect(compositionSource).toContain('workspaceFilesQuery');
    expect(compositionSource).toContain('workspaceFileContentCommand');
  });

  it('does not keep legacy workspace service modules after the hard cut', () => {
    const workspaceServiceFileNames = readdirSync(
      resolve(process.cwd(), 'src', 'app', 'services', 'workspace')
    ).filter((fileName) => fileName.startsWith('workspaceService'));

    expect(workspaceServiceFileNames).toEqual([]);
  });
});

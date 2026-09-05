// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { createMockWorkspacePorts } from '../../../testing/workspacePortDoubles';
import { ApiError } from '../api/createApiClient';
import { flattenWorkspaceEntries } from './workspaceFileTree.test.fixtures';
import { createApiWorkspacePortHarness } from './workspacePortsApi.test.harness';
import { WorkspaceFileLoadError, WORKSPACE_HTTP_ERROR_REASON } from './workspaceErrors';
import {
  buildWorkspaceScope,
  clearGrantedWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from './workspaceScope.test.harness';

describe('workspace ports files', () => {
  installWorkspaceScopeHarness();

  it('keeps file-content edits local to each default mock service instance', async () => {
    const firstPorts = createMockWorkspacePorts();
    const secondPorts = createMockWorkspacePorts();
    const original = await secondPorts.workspaceFilesQuery.getFileContent('README.md');

    await firstPorts.workspaceFileContentCommand.saveFileContent({
      path: 'README.md',
      content: '# Mutated in first instance only',
      expectedRevision: { kind: 'content_sha256', value: original.contentSha256 },
    });

    const firstAfter = await firstPorts.workspaceFilesQuery.getFileContent('README.md');
    const secondAfter = await secondPorts.workspaceFilesQuery.getFileContent('README.md');

    expect(firstAfter.content).toBe('# Mutated in first instance only');
    expect(secondAfter.content).toBe(original.content);
  });

  it('returns a unique default file tree without duplicated workspace paths', async () => {
    const ports = createMockWorkspacePorts();

    const fileTree = flattenWorkspaceEntries(await ports.workspaceFilesQuery.listFiles());

    expect(fileTree).toContain('models/staging');
    expect(fileTree).toContain('models/marts');
    expect(fileTree).toContain('models/staging/stg_orders.sql');
    expect(fileTree).toContain('models/staging/stg_customers.sql');
    expect(fileTree).toContain('models/marts/dim_store.sql');
    expect(new Set(fileTree).size).toBe(fileTree.length);
  });

  it('adds newly saved files to the instance-local file tree', async () => {
    const firstPorts = createMockWorkspacePorts();
    const secondPorts = createMockWorkspacePorts();
    const newFilePath = 'models/generated/new_model.sql';

    await firstPorts.workspaceFileContentCommand.saveFileContent({
      path: newFilePath,
      content: 'select 1 as id',
      expectedRevision: { kind: 'absent' },
    });

    const firstTree = flattenWorkspaceEntries(await firstPorts.workspaceFilesQuery.listFiles());
    const secondTree = flattenWorkspaceEntries(await secondPorts.workspaceFilesQuery.listFiles());
    const firstFile = await firstPorts.workspaceFilesQuery.getFileContent(newFilePath);

    expect(firstTree).toContain('models/generated');
    expect(firstTree).toContain(newFilePath);
    expect(secondTree).not.toContain(newFilePath);
    expect(firstFile.content).toBe('select 1 as id');
  });

  it('maps missing mock files to a typed workspace file load error', async () => {
    const ports = createMockWorkspacePorts();

    await expect(ports.workspaceFilesQuery.getFileContent('models/missing.sql')).rejects.toEqual(
      expect.objectContaining<Partial<WorkspaceFileLoadError>>({
        name: 'WorkspaceFileLoadError',
        kind: 'not_found',
        path: 'models/missing.sql',
      })
    );
  });

  it('maps canonical workspace file-not-found envelopes to a typed workspace file load error', async () => {
    setWorkspaceScope(buildWorkspaceScope());
    const { workspaceFilesQuery } = createApiWorkspacePortHarness({
      getJson: async () => {
        throw new ApiError({
          message: 'Request to /workspace/files/models%2Fmissing.sql failed (404)',
          endpoint: '/workspace/files/models%2Fmissing.sql',
          statusCode: 404,
          category: 'client',
          responseBody: {
            error: {
              type: 'not_found',
              reason: WORKSPACE_HTTP_ERROR_REASON.fileNotFound,
            },
          },
        });
      },
    });

    await expect(workspaceFilesQuery.getFileContent('models/missing.sql')).rejects.toEqual(
      expect.objectContaining<Partial<WorkspaceFileLoadError>>({
        name: 'WorkspaceFileLoadError',
        kind: 'not_found',
        path: 'models/missing.sql',
      })
    );
  });

  it('lists files through the scoped workspace files query endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, workspaceFilesQuery } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() => [] as TResponse,
    });

    await workspaceFilesQuery.listFiles();

    expect(getJson).toHaveBeenCalledWith(
      `/workspace/files?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`
    );
  });

  it('does not build workspace file requests before server-granted scope resolves', () => {
    clearGrantedWorkspaceScope();
    const { getJson, workspaceFilesQuery } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() => [] as TResponse,
    });

    expect(() => workspaceFilesQuery.listFiles()).toThrow('workspace_scope_unresolved');
    expect(getJson).not.toHaveBeenCalled();
  });

  it('loads file content through the scoped workspace file content query endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, workspaceFilesQuery } = createApiWorkspacePortHarness({
      getJson: async <TResponse>() =>
        ({
          path: 'models/staging/stg_orders.sql',
          name: 'stg_orders.sql',
          language: 'sql',
          content: 'select 1',
          lastModified: '2026-05-04T00:00:00Z',
        }) as TResponse,
    });

    await workspaceFilesQuery.getFileContent('models/staging/stg_orders.sql');

    expect(getJson).toHaveBeenCalledWith(
      `/workspace/files/models%2Fstaging%2Fstg_orders.sql?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`
    );
  });

  it('does not collapse unrelated not-found envelopes into workspace file load errors', async () => {
    setWorkspaceScope(buildWorkspaceScope());
    const unrelatedNotFound = new ApiError({
      message: 'Request to /workspace/files/models%2Fmissing.sql failed (404)',
      endpoint: '/workspace/files/models%2Fmissing.sql',
      statusCode: 404,
      category: 'client',
      responseBody: {
        error: {
          type: 'not_found',
          reason: 'run_not_found',
        },
      },
    });
    const { workspaceFilesQuery } = createApiWorkspacePortHarness({
      getJson: async () => {
        throw unrelatedNotFound;
      },
    });

    await expect(workspaceFilesQuery.getFileContent('models/missing.sql')).rejects.toBe(
      unrelatedNotFound
    );
  });
});

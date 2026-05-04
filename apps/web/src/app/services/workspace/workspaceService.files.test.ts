import { describe, expect, it } from 'vitest';

import { ApiError } from '../api/createApiClient';
import { createWorkspaceService } from './workspaceService';
import { flattenWorkspaceEntries } from './workspaceFileTree.test.fixtures';
import { createApiWorkspaceServiceHarness } from './workspaceServiceApi.test.harness';
import { WorkspaceFileLoadError, WORKSPACE_HTTP_ERROR_REASON } from './workspaceErrors';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from './workspaceScope.test.harness';

describe('workspaceService files', () => {
  installWorkspaceScopeHarness();

  it('keeps file-content edits local to each default mock service instance', async () => {
    const firstService = createWorkspaceService('mock');
    const secondService = createWorkspaceService('mock');
    const original = await secondService.getFileContent('README.md');

    await firstService.saveFileContent('README.md', '# Mutated in first instance only');

    const firstAfter = await firstService.getFileContent('README.md');
    const secondAfter = await secondService.getFileContent('README.md');

    expect(firstAfter.content).toBe('# Mutated in first instance only');
    expect(secondAfter.content).toBe(original.content);
  });

  it('returns a unique default file tree without duplicated workspace paths', async () => {
    const service = createWorkspaceService('mock');

    const fileTree = flattenWorkspaceEntries(await service.listFiles());

    expect(fileTree).toContain('models/staging');
    expect(fileTree).toContain('models/marts');
    expect(fileTree).toContain('models/staging/stg_orders.sql');
    expect(fileTree).toContain('models/staging/stg_customers.sql');
    expect(fileTree).toContain('models/marts/dim_store.sql');
    expect(new Set(fileTree).size).toBe(fileTree.length);
  });

  it('adds newly saved files to the instance-local file tree', async () => {
    const firstService = createWorkspaceService('mock');
    const secondService = createWorkspaceService('mock');
    const newFilePath = 'models/generated/new_model.sql';

    await firstService.saveFileContent(newFilePath, 'select 1 as id');

    const firstTree = flattenWorkspaceEntries(await firstService.listFiles());
    const secondTree = flattenWorkspaceEntries(await secondService.listFiles());
    const firstFile = await firstService.getFileContent(newFilePath);

    expect(firstTree).toContain('models/generated');
    expect(firstTree).toContain(newFilePath);
    expect(secondTree).not.toContain(newFilePath);
    expect(firstFile.content).toBe('select 1 as id');
  });

  it('maps missing mock files to a typed workspace file load error', async () => {
    const service = createWorkspaceService('mock');

    await expect(service.getFileContent('models/missing.sql')).rejects.toEqual(
      expect.objectContaining<Partial<WorkspaceFileLoadError>>({
        name: 'WorkspaceFileLoadError',
        kind: 'not_found',
        path: 'models/missing.sql',
      })
    );
  });

  it('maps canonical workspace file-not-found envelopes to a typed workspace file load error', async () => {
    const { service } = createApiWorkspaceServiceHarness({
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

    await expect(service.getFileContent('models/missing.sql')).rejects.toEqual(
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
    const { getJson, service } = createApiWorkspaceServiceHarness({
      getJson: async <TResponse>() => [] as TResponse,
    });

    await service.listFiles();

    expect(getJson).toHaveBeenCalledWith(
      `/workspace/files?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`
    );
  });

  it('loads file content through the scoped workspace file content query endpoint', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { getJson, service } = createApiWorkspaceServiceHarness({
      getJson: async <TResponse>() =>
        ({
          path: 'models/staging/stg_orders.sql',
          name: 'stg_orders.sql',
          language: 'sql',
          content: 'select 1',
          lastModified: '2026-05-04T00:00:00Z',
        }) as TResponse,
    });

    await service.getFileContent('models/staging/stg_orders.sql');

    expect(getJson).toHaveBeenCalledWith(
      `/workspace/files/models%2Fstaging%2Fstg_orders.sql?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`
    );
  });

  it('does not collapse unrelated not-found envelopes into workspace file load errors', async () => {
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
    const { service } = createApiWorkspaceServiceHarness({
      getJson: async () => {
        throw unrelatedNotFound;
      },
    });

    await expect(service.getFileContent('models/missing.sql')).rejects.toBe(unrelatedNotFound);
  });
});

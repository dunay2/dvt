import { describe, expect, it, vi, type Mocked } from 'vitest';

import {
  InvalidWorkspacePathError,
  WorkspaceFileNotFoundError,
  type IWorkspaceFileRepository,
} from '../../src/application/ports/workspaceFiles.js';
import type { CanvasAuthoringAuthorityPolicy } from '../../src/application/services/canvasAuthoringAuthorityPolicy.js';
import { GetWorkspaceFileContentUseCase } from '../../src/application/services/getWorkspaceFileContentUseCase.js';

const SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' };
const FILE = {
  path: 'analytics/models/orders.sql',
  name: 'orders.sql',
  language: 'sql',
  content: 'select 1',
  contentSha256: 'a'.repeat(64),
  lastModified: '2026-10-30T10:00:00.000Z',
};
const RESOLUTION = {
  kind: 'resolved' as const,
  binding: {
    schemaVersion: 'canvas-authoring-authority-binding.v1' as const,
    canvasId: 'orders-canvas',
    authority: { kind: 'dbt-project-files' as const, projectRoot: 'analytics' },
  },
};

describe('GetWorkspaceFileContentUseCase', () => {
  function fixture(): {
    repository: Mocked<Pick<IWorkspaceFileRepository, 'getFileContent'>>;
    authority: Mocked<Pick<CanvasAuthoringAuthorityPolicy, 'resolveFileContext'>>;
    useCase: GetWorkspaceFileContentUseCase;
  } {
    const repository = {
      getFileContent: vi.fn<IWorkspaceFileRepository['getFileContent']>().mockResolvedValue(FILE),
    };
    const authority = {
      resolveFileContext: vi
        .fn<CanvasAuthoringAuthorityPolicy['resolveFileContext']>()
        .mockResolvedValue(RESOLUTION),
    };
    return {
      repository,
      authority,
      useCase: new GetWorkspaceFileContentUseCase(repository, authority),
    };
  }

  it('attaches authority to the accepted canonical path after the scoped file read', async () => {
    const { useCase, repository, authority } = fixture();
    await expect(useCase.execute(SCOPE, 'analytics%2Fmodels%2Forders.sql')).resolves.toEqual({
      ...FILE,
      authoringAuthority: RESOLUTION,
    });
    expect(repository.getFileContent).toHaveBeenCalledWith(
      SCOPE,
      'analytics%2Fmodels%2Forders.sql'
    );
    expect(authority.resolveFileContext).toHaveBeenCalledWith(SCOPE, FILE.path);
  });

  it.each([
    new InvalidWorkspacePathError('../outside.sql'),
    new WorkspaceFileNotFoundError('missing.sql'),
  ])('does not resolve authority for a rejected file: %s', async (failure) => {
    const { useCase, repository, authority } = fixture();
    repository.getFileContent.mockRejectedValue(failure);
    await expect(useCase.execute(SCOPE, failure.path)).rejects.toBe(failure);
    expect(authority.resolveFileContext).not.toHaveBeenCalled();
  });

  it('preserves unresolved authority without fabricating a project', async () => {
    const { useCase, authority } = fixture();
    const unresolved = { kind: 'unresolved', reason: 'missing_authority', canvasId: null } as const;
    authority.resolveFileContext.mockResolvedValue(unresolved);
    await expect(useCase.execute(SCOPE, FILE.path)).resolves.toEqual({
      ...FILE,
      authoringAuthority: unresolved,
    });
  });

  it('propagates unavailable authority rather than returning authoritative bytes', async () => {
    const { useCase, authority } = fixture();
    authority.resolveFileContext.mockRejectedValue(new Error('authority unavailable'));
    await expect(useCase.execute(SCOPE, FILE.path)).rejects.toThrow('authority unavailable');
  });
});

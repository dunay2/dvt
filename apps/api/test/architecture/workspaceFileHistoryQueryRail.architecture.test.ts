import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { PROTECTED_RUNTIME_COMMAND_QUERY_RAILS } from '../../src/application/ports/protectedRuntimeCommandQueryRails.js';

const repoRoot = path.resolve(process.cwd(), '../..');

function read(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('workspace file history query rail architecture', () => {
  it('keeps F-23 on the documented C&Q rail', () => {
    const gitDoc = read('docs/architecture/components/web/git/git-mode-architecture.md');
    const f23Plan = read(
      'docs/planning/proposals/mandatory/frontend-and-ux/f23-git-file-history-review-plan-20260522.md'
    );

    expect(gitDoc).toContain('GetWorkspaceFileHistory');
    expect(f23Plan).toContain('GetWorkspaceFileHistory');
    expect(f23Plan).toContain('GET /workspace/file-history/:path');
  });

  it('registers protected runtime ownership for file history', () => {
    const routeRegistration = read(
      'apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts'
    );
    const routeModule = read('apps/api/src/entrypoints/http/workspaceFileHistoryRoutes.ts');
    const routeConstants = read('apps/api/src/entrypoints/http/runtimeRoutes.constants.ts');
    const rail = PROTECTED_RUNTIME_COMMAND_QUERY_RAILS.find(
      (candidate) => candidate.name === 'GetWorkspaceFileHistory'
    );

    expect(routeRegistration).toContain('registerWorkspaceFileHistoryRoutes');
    expect(routeModule).toContain('RUNTIME_ROUTE_PATH.workspaceFileHistory');
    expect(routeModule).toContain('AUTHORIZATION_ACTION.workspaceFilesView');
    expect(routeConstants).toContain("workspaceFileHistory: '/workspace/file-history/:path'");
    expect(rail).toMatchObject({
      kind: 'query',
      dddObject: 'WorkspaceFileHistory',
      applicationPort: 'ListWorkspaceFileHistoryUseCase',
      adapterSurface: 'GET /workspace/file-history/:path',
      scopeAndAuthorization: 'workspace:files:view, tenant/project/environment scope',
    });
  });
});

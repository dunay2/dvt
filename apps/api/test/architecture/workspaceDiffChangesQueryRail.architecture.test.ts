import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { PROTECTED_RUNTIME_COMMAND_QUERY_RAILS } from '../../src/application/ports/protectedRuntimeCommandQueryRails.js';

const repoRoot = path.resolve(process.cwd(), '../..');

function read(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('workspace diff changes query rail architecture', () => {
  it('keeps the Diff workbench behavior on the documented C&Q rail', () => {
    const componentDoc = read(
      'docs/architecture/components/web/diff/diff-monaco-review-surface-component.md'
    );
    const workspaceDoc = read(
      'docs/architecture/components/web/workspace/workspace-port-decomposition-component.md'
    );

    expect(componentDoc).toContain('GetWorkspaceDiffChanges');
    expect(componentDoc).toContain('DiffChange');
    expect(workspaceDoc).toContain('GetWorkspaceDiffChanges');
    expect(workspaceDoc).toContain('GET /workspace/diff/changes');
  });

  it('registers protected API routes instead of leaving the web adapter as route authority', () => {
    const routeRegistration = read(
      'apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts'
    );
    const routeGroup = read('apps/api/src/entrypoints/http/workspaceDiffChangesRouteGroup.ts');
    const routeModule = read('apps/api/src/entrypoints/http/workspaceDiffChangesRoutes.ts');
    const routeConstants = read('apps/api/src/entrypoints/http/runtimeRoutes.constants.ts');
    const rail = PROTECTED_RUNTIME_COMMAND_QUERY_RAILS.find(
      (candidate) => candidate.name === 'GetWorkspaceDiffChanges'
    );

    expect(routeRegistration).toContain('registerProtectedWorkspaceDiffChangesRouteGroup');
    expect(routeRegistration).not.toContain('LocalWorkspaceDiffChangesRepository');
    expect(routeRegistration).not.toContain('new ListWorkspaceDiffChangesUseCase');
    expect(routeGroup).toContain('registerWorkspaceDiffChangesRoutes');
    expect(routeGroup).toContain('LocalWorkspaceDiffChangesRepository');
    expect(routeGroup).toContain('ListWorkspaceDiffChangesUseCase');
    expect(routeModule).toContain('RUNTIME_ROUTE_PATH.workspaceDiffChanges');
    expect(routeModule).toContain('AUTHORIZATION_ACTION.workspaceDiffView');
    expect(rail).toMatchObject({
      kind: 'query',
      dddObject: 'WorkspaceDiffChanges',
      applicationPort: 'ListWorkspaceDiffChangesUseCase',
      adapterSurface: 'GET /workspace/diff/changes',
      scopeAndAuthorization: 'workspace:diff:view, tenant/project/environment scope',
    });
    expect(routeConstants).toContain("workspaceDiffChanges: '/workspace/diff/changes'");
  });

  it('requires scoped web API endpoints instead of unsupported adapter posture', () => {
    const apiAdapter = read('apps/web/src/app/services/workspace/workspacePorts.api.ts');

    expect(apiAdapter).toContain('buildWorkspaceDiffChangesEndpoint');
    expect(apiAdapter).not.toContain(
      "rejectUnsupportedApiWorkspaceCapability('workspace.diffChanges'"
    );
    expect(apiAdapter).not.toContain("getJson<DiffChange[]>('/diff/changes')");
  });
});

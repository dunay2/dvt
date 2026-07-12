import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(process.cwd(), '../..');

function read(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('workspace files command/query rail architecture', () => {
  it('keeps the Code and Canvas workspace-file behavior on the documented C&Q rails', () => {
    const componentDoc = read(
      'docs/architecture/components/web/code-workbench-workspace-files-component.md'
    );

    expect(componentDoc).toContain('ListWorkspaceFiles');
    expect(componentDoc).toContain('GetWorkspaceFileContent');
    expect(componentDoc).toContain('SaveWorkspaceFileContent');
    expect(componentDoc).toContain('WorkspaceFileTree');
    expect(componentDoc).toContain('WorkspaceFileContent');
  });

  it('registers protected API routes instead of leaving the web adapter as route authority', () => {
    const routeRegistration = read(
      'apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts'
    );
    const routeGroup = read('apps/api/src/entrypoints/http/workspaceFilesRouteGroup.ts');
    const routeModule = read('apps/api/src/entrypoints/http/workspaceFilesRoutes.ts');

    expect(routeRegistration).toContain('registerProtectedWorkspaceFilesRouteGroup');
    expect(routeRegistration).not.toContain('LocalWorkspaceFileRepository');
    expect(routeRegistration).not.toContain('new ListWorkspaceFilesUseCase');
    expect(routeRegistration).not.toContain('new GetWorkspaceFileContentUseCase');
    expect(routeGroup).toContain('registerWorkspaceFilesRoutes');
    expect(routeGroup).toContain('LocalWorkspaceFileRepository');
    expect(routeGroup).toContain('ListWorkspaceFilesUseCase');
    expect(routeGroup).toContain('GetWorkspaceFileContentUseCase');
    expect(routeGroup).toContain('SaveWorkspaceFileContentUseCase');
    expect(routeModule).toContain('RUNTIME_ROUTE_PATH.workspaceFiles');
    expect(routeModule).toContain('RUNTIME_ROUTE_PATH.workspaceFileContent');
    expect(routeModule).toContain('config: { rateLimit: deps.rateLimit }');
    expect(routeModule).toContain('AUTHORIZATION_ACTION.workspaceFilesView');
    expect(routeModule).toContain('AUTHORIZATION_ACTION.workspaceFilesSave');
  });

  it('requires scoped web API endpoints and routes file writes through the live command rail', () => {
    const apiAdapter = read('apps/web/src/app/services/workspace/workspacePorts.api.ts');

    expect(apiAdapter).not.toContain("getJson<WorkspaceFileEntry[]>('/workspace/files')");
    expect(apiAdapter).toContain('buildWorkspaceFilesEndpoint');
    expect(apiAdapter).toContain('buildWorkspaceFileContentEndpoint');
    expect(apiAdapter).toContain("Omit<SaveWorkspaceFileContentInput, 'path'>");
    expect(apiAdapter).toContain('WorkspaceFileSaveReceipt');
  });
});

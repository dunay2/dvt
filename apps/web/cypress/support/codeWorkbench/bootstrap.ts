/** Bootstrap only controlled Code file transport; unexpected reads and all writes fail closed. */
import type { FileContent } from '../../../src/app/ports/workspace';
import { stubCanvasDraftRead } from '../canvasDraftAuthoring';
import { stubE2eApi, stubE2eJsonApi } from '../e2eApiStub';
import { E2E_PROJECT_WORKSPACE, stubShellBootstrapApis } from '../workspaceSession';

const INITIAL_REVISION = 'a'.repeat(64);
export const INITIAL_SQL = 'select * from orders';

export function stubCodeWorkbenchBootstrapApis(scopes?: readonly string[]): void {
  stubShellBootstrapApis({ scopes });
  stubCanvasDraftRead();

  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '1.0.0',
    plugins: {
      dbt: { available: true },
      dvt: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
}

export function stubContextualCodeWorkbenchApis(
  files: ReadonlyArray<FileContent> = [
    {
      path: 'models/staging/stg_orders.sql',
      name: 'stg_orders.sql',
      language: 'sql',
      content: INITIAL_SQL,
      contentSha256: INITIAL_REVISION,
      lastModified: '2026-07-12T00:00:00.000Z',
    },
  ],
  scopes?: readonly string[]
): void {
  stubCodeWorkbenchBootstrapApis(scopes);
  stubE2eJsonApi(
    'GET',
    '/workspace/files',
    files.map(({ path, name }) => ({ path, name, kind: 'file' }))
  );
  stubE2eApi('GET', /\/workspace\/files\/.+/, ({ url }) => {
    const path = decodeURIComponent(url.pathname.slice('/workspace/files/'.length));
    const file = files.find((candidate) => candidate.path === path);
    if (file === undefined) throw new Error(`Unexpected workspace file read: ${path}`);
    return { body: file };
  });
  stubE2eJsonApi('GET', /\/workspace\/file-history\/.+/, []);
  stubE2eApi('POST', /\/workspace\/files\/.+/, () => {
    throw new Error('Read-only Project Code must not save workspace files.');
  });
}

import { installE2eApiFetchStub, resetE2eApiStubs, stubE2eJsonApi } from './e2eApiStub';

export type E2eWorkspaceSession = {
  tenantId: string;
  projectId: string;
  environmentId: string;
};

const SESSION_STORAGE_KEY = 'dvt-web-session';

export const E2E_WORKSPACE_SESSION: E2eWorkspaceSession = {
  tenantId: 'e2e-tenant',
  projectId: 'e2e-project',
  environmentId: 'e2e-env',
};

export function seedE2eWorkspaceSession(
  window: Window,
  session: E2eWorkspaceSession = E2E_WORKSPACE_SESSION
): void {
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      state: session,
      version: 0,
    })
  );
}

export function visitWithE2eWorkspaceSession(
  path: string,
  options: {
    onBeforeLoad?: (window: Window) => void;
  } = {}
): void {
  cy.visit(path, {
    onBeforeLoad(window) {
      window.localStorage.clear();
      seedE2eWorkspaceSession(window);
      installE2eApiFetchStub(window);
      options.onBeforeLoad?.(window);
    },
  });
}

export function stubShellBootstrapApis(): void {
  resetE2eApiStubs();

  stubE2eJsonApi('GET', '/healthz', {
    ok: true,
    status: 'healthy',
    components: {
      intentReconciler: {
        status: 'healthy',
      },
    },
  });

  stubE2eJsonApi('GET', '/readyz', {
    ok: true,
    status: 'ready',
  });

  stubE2eJsonApi('GET', '/version', {
    name: 'dvt-api',
    version: '1.0.0',
  });

  stubE2eJsonApi('GET', '/db/ready', {
    ok: true,
    reason: null,
  });
}

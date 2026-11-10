import { installE2eApiFetchStub, resetE2eApiStubs, stubE2eApi, stubE2eJsonApi } from './e2eApiStub';

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

export const E2E_PROJECT_WORKSPACE = {
  ...E2E_WORKSPACE_SESSION,
  projectName: 'E2E Project',
} as const;

export const LIVE_WORKSPACE_SESSION: E2eWorkspaceSession = {
  tenantId: 'tenant',
  projectId: 'project',
  environmentId: 'dev',
};

type BootstrapResponse = Awaited<ReturnType<Parameters<typeof stubE2eApi>[2]>>;

export type ShellBootstrapApiOptions = {
  scopes?: readonly string[];
  projectIds?: readonly string[];
  health?: Partial<Record<'healthz' | 'readyz' | 'version' | 'dbReady', BootstrapResponse>>;
  capabilities?: BootstrapResponse;
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
    onBeforeLoad?: (window: Cypress.AUTWindow) => void;
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

export function visitWithLiveWorkspaceSession(
  path: string,
  options: {
    onBeforeLoad?: (window: Cypress.AUTWindow) => void;
  } = {}
): void {
  cy.visit(path, {
    onBeforeLoad(window) {
      window.localStorage.clear();
      seedE2eWorkspaceSession(window, LIVE_WORKSPACE_SESSION);
      options.onBeforeLoad?.(window);
    },
  });
}

export function stubShellBootstrapApis(options: ShellBootstrapApiOptions = {}): void {
  resetE2eApiStubs();

  stubE2eJsonApi('GET', '/session', {
    principal: {
      principalId: 'e2e-principal',
      subjectId: 'e2e-subject',
      principalType: 'user',
      issuer: 'e2e',
      audience: 'dvt-web',
      expiresAtIso: '2030-01-01T00:00:00.000Z',
    },
    grants: {
      tenantIds: [E2E_WORKSPACE_SESSION.tenantId],
      projectIds: options.projectIds ?? [E2E_WORKSPACE_SESSION.projectId],
      scopes: options.scopes ?? ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
    },
  });

  const healthDefaults = [
    {
      key: 'healthz',
      path: '/healthz',
      response: {
        body: {
          ok: true,
          status: 'healthy',
          components: { intentReconciler: { status: 'healthy' } },
        },
      },
    },
    { key: 'readyz', path: '/readyz', response: { body: { ok: true, status: 'ready' } } },
    { key: 'version', path: '/version', response: { body: { name: 'dvt-api', version: '1.0.0' } } },
    { key: 'dbReady', path: '/db/ready', response: { body: { ok: true, reason: null } } },
  ] as const;
  for (const probe of healthDefaults) {
    const response = options.health?.[probe.key] ?? probe.response;
    stubE2eApi('GET', probe.path, () => response);
  }
  const capabilities = options.capabilities;
  if (capabilities !== undefined) stubE2eApi('GET', '/capabilities', () => capabilities);
}

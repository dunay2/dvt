/**
 * Owned concern: boot and exercise live protected-runtime HTTP seams without constructing fixtures.
 * @baseline GH-3578: fixture seeding and generic LIVE transport have separate consumers.
 * @decision Share request helpers and keep fixture seeding in its dedicated consumer.
 * @consequence Transport-only stories no longer transitively import canvas scenario builders.
 * @version 1.0.0
 */
import { installE2eApiFetchStub } from './e2eApiStub';
import {
  buildAuthorizationHeaders,
  buildBearerAuth,
  buildDraftReadUrl,
  readRequiredEnv,
} from './liveProtectedRequest';
import {
  LIVE_WORKSPACE_SESSION,
  seedE2eWorkspaceSession,
  type E2eWorkspaceSession,
} from './workspaceSession';

export function hasLiveProtectedRuntimeEnv(): boolean {
  return ['apiBaseUrl', 'apiBearerToken'].every((name) => {
    const value = Cypress.env(name);

    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function resolveLiveWorkspaceSession(): E2eWorkspaceSession {
  return {
    tenantId:
      typeof Cypress.env('workspaceTenantId') === 'string'
        ? String(Cypress.env('workspaceTenantId')).trim()
        : LIVE_WORKSPACE_SESSION.tenantId,
    projectId:
      typeof Cypress.env('workspaceProjectId') === 'string'
        ? String(Cypress.env('workspaceProjectId')).trim()
        : LIVE_WORKSPACE_SESSION.projectId,
    environmentId:
      typeof Cypress.env('workspaceEnvironmentId') === 'string'
        ? String(Cypress.env('workspaceEnvironmentId')).trim()
        : LIVE_WORKSPACE_SESSION.environmentId,
  };
}

export function visitWithLiveWorkspaceSession(
  path: string,
  options: {
    onBeforeLoad?: (window: Window) => void;
  } = {}
): void {
  const session = resolveLiveWorkspaceSession();

  cy.visit(path, {
    onBeforeLoad(window) {
      window.localStorage.clear();
      seedE2eWorkspaceSession(window, session);
      installE2eApiFetchStub(window);
      options.onBeforeLoad?.(window);
    },
  });
}

export function readLiveGraphDraft(
  session: E2eWorkspaceSession = resolveLiveWorkspaceSession(),
  options: { failOnStatusCode?: boolean } = {}
): Cypress.Chainable<Cypress.Response<unknown>> {
  return cy.request({
    method: 'GET',
    url: buildDraftReadUrl(session),
    headers: buildAuthorizationHeaders(),
    auth: buildBearerAuth(),
    failOnStatusCode: options.failOnStatusCode,
  });
}

export function readLiveRunIds(
  session: E2eWorkspaceSession = resolveLiveWorkspaceSession()
): Cypress.Chainable<string[]> {
  const query = new URLSearchParams(session);

  return cy
    .request({
      method: 'GET',
      url: `${readRequiredEnv('apiBaseUrl')}/runs?${query.toString()}`,
      headers: buildAuthorizationHeaders(),
      auth: buildBearerAuth(),
    })
    .then((response) => {
      expect(response.status).to.equal(200);
      const items = (response.body as { readonly items?: ReadonlyArray<{ runId?: string }> }).items;
      return (items ?? []).flatMap(({ runId }) => (runId === undefined ? [] : [runId])).sort();
    });
}

export function readLiveRunSnapshot(runId: string): Cypress.Chainable<Cypress.Response<unknown>> {
  const session = resolveLiveWorkspaceSession();
  const query = new URLSearchParams(session);

  return cy.request({
    method: 'GET',
    url: `${readRequiredEnv('apiBaseUrl')}/runs/${runId}?${query.toString()}`,
    headers: buildAuthorizationHeaders(),
    auth: buildBearerAuth(),
  });
}

export function readLiveRunEvents(runId: string): Cypress.Chainable<Cypress.Response<unknown>> {
  const session = resolveLiveWorkspaceSession();
  const query = new URLSearchParams(session);

  return cy.request({
    method: 'GET',
    url: `${readRequiredEnv('apiBaseUrl')}/runs/${runId}/events?${query.toString()}`,
    headers: buildAuthorizationHeaders(),
    auth: buildBearerAuth(),
  });
}

export function readLiveWorkspaceFile(
  path: string,
  session: E2eWorkspaceSession = resolveLiveWorkspaceSession()
): Cypress.Chainable<Cypress.Response<unknown>> {
  const query = new URLSearchParams(session);

  return cy.request({
    method: 'GET',
    url: `${readRequiredEnv('apiBaseUrl')}/workspace/files/${encodeURIComponent(path)}?${query.toString()}`,
    headers: buildAuthorizationHeaders(),
    auth: buildBearerAuth(),
  });
}

export function waitForLiveWorkspaceFileContent(
  path: string,
  expectedContent: string,
  attempt = 0
): Cypress.Chainable<void> {
  return readLiveWorkspaceFile(path).then((response) => {
    expect(response.status).to.equal(200);
    const content = String((response.body as { content?: unknown }).content ?? '');

    if (content === expectedContent) {
      return;
    }

    if (attempt >= 30) {
      throw new Error(
        `Timed out waiting for live workspace content at ${path}. ` +
          `Expected ${JSON.stringify(expectedContent)} but observed ${JSON.stringify(content)}.`
      );
    }

    return cy
      .wait(250)
      .then(() => waitForLiveWorkspaceFileContent(path, expectedContent, attempt + 1));
  });
}

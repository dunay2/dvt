/**
 * Owned concern: boot and exercise the live protected-runtime HTTP seams for
 * selected-closure browser proof.
 */
import {
  buildCanvasDraftSaveRequest,
  type CanvasDraftSessionScope,
  type StubCanvasDraftReadOptions,
} from './canvasDraftAuthoring';
import { LIVE_WORKSPACE_SESSION, seedE2eWorkspaceSession } from './workspaceSession';

function readRequiredEnv(name: string): string {
  const value = Cypress.env(name);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Cypress env ${name} is required for the live protected-runtime lane`);
  }

  return value.trim();
}

export function hasLiveProtectedRuntimeEnv(): boolean {
  return ['apiBaseUrl', 'apiBearerToken'].every((name) => {
    const value = Cypress.env(name);

    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function resolveLiveWorkspaceSession(): CanvasDraftSessionScope {
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

function buildDraftReadUrl(session: CanvasDraftSessionScope): string {
  const apiBaseUrl = readRequiredEnv('apiBaseUrl');
  const query = new URLSearchParams(session);
  return `${apiBaseUrl}/workspace/graph/draft?${query.toString()}`;
}

function buildAuthorizationHeaders(): Record<string, string> {
  const apiBearerToken = readRequiredEnv('apiBearerToken');

  return {
    Authorization: `Bearer ${apiBearerToken}`,
    Accept: 'application/json',
  };
}

function buildBearerAuth(): { bearer: string } {
  return {
    bearer: readRequiredEnv('apiBearerToken'),
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
      options.onBeforeLoad?.(window);
    },
  });
}

export function seedLiveSelectedClosureDraft(
  options: StubCanvasDraftReadOptions = {}
): Cypress.Chainable<string> {
  const session = resolveLiveWorkspaceSession();
  const readUrl = buildDraftReadUrl(session);
  const headers = buildAuthorizationHeaders();

  return cy
    .request({
      method: 'GET',
      url: readUrl,
      headers,
      auth: buildBearerAuth(),
      failOnStatusCode: false,
    })
    .then((readResponse) => {
      let expectedRevision = 'initial';

      if (readResponse.status === 200) {
        expect(readResponse.body.kind).to.equal('ok');
        expect(readResponse.body.record.scope).to.deep.include(session);
        expectedRevision = readResponse.body.record.revision as string;
      } else {
        expect(readResponse.status).to.equal(404);
        expect(readResponse.body.error.reason).to.equal('workspace_graph_draft_not_found');
      }

      return cy.request({
        method: 'PUT',
        url: `${readRequiredEnv('apiBaseUrl')}/workspace/graph/draft`,
        headers,
        auth: buildBearerAuth(),
        body: buildCanvasDraftSaveRequest(session, {
          ...options,
          expectedRevision,
          idempotencyKey: `live-selected-closure-${Date.now()}`,
        }),
      });
    })
    .then((saveResponse) => {
      expect(saveResponse.status).to.equal(200);
      expect(saveResponse.body.kind).to.equal('saved');

      return saveResponse.body.revision as string;
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

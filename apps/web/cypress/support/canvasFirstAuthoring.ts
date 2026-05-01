/**
 * Owned concern: resolve and preflight the live first-authoring workspace scope
 * without seeding draft success outside the Canvas UI flow.
 */
import { resolveLiveWorkspaceSession } from './liveProtectedRuntime';
import type { E2eWorkspaceSession } from './workspaceSession';

export function resolveLiveFirstAuthoringWorkspaceSession(
  variant: 'transformation' | 'dbt' = 'transformation'
): E2eWorkspaceSession {
  const session = resolveLiveWorkspaceSession();

  return {
    tenantId: session.tenantId,
    projectId: `${session.projectId}-tf-e2-m-c-first-authoring-${variant}`,
    environmentId: session.environmentId,
  };
}

export function assertLiveFirstAuthoringDraftScopeIsClean(
  variant: 'transformation' | 'dbt' = 'transformation'
): Cypress.Chainable<void> {
  const session = resolveLiveFirstAuthoringWorkspaceSession(variant);
  const apiBaseUrl = Cypress.env('apiBaseUrl');
  const apiBearerToken = Cypress.env('apiBearerToken');

  if (typeof apiBaseUrl !== 'string' || apiBaseUrl.trim().length === 0) {
    throw new Error('Cypress env apiBaseUrl is required for the first-authoring live proof');
  }
  if (typeof apiBearerToken !== 'string' || apiBearerToken.trim().length === 0) {
    throw new Error('Cypress env apiBearerToken is required for the first-authoring live proof');
  }

  const query = new URLSearchParams(session);

  return cy
    .request({
      method: 'GET',
      url: `${apiBaseUrl.trim()}/workspace/graph/draft?${query.toString()}`,
      headers: {
        Authorization: `Bearer ${apiBearerToken.trim()}`,
        Accept: 'application/json',
      },
      auth: {
        bearer: apiBearerToken.trim(),
      },
      failOnStatusCode: false,
    })
    .then((response) => {
      if (response.status === 404) {
        expect((response.body as { error?: { reason?: string } }).error?.reason).to.equal(
          'workspace_graph_draft_not_found'
        );
        return;
      }

      if (response.status === 200) {
        throw new Error(
          `First-authoring live scope is dirty for ${session.tenantId}/${session.projectId}/${session.environmentId}`
        );
      }

      throw new Error(`Unexpected first-authoring draft preflight status ${response.status}`);
    });
}

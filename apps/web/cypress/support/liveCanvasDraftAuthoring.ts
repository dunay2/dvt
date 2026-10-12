/**
 * Owned concern: seed a real protected canvas draft using the existing read and save protocol.
 * @baseline GH-3578: fixture seeding and generic LIVE transport have separate consumers.
 * @decision Keep fixture construction out of transport-only LIVE consumers.
 * @consequence Seeding preserves scope, optimistic revision and acknowledgement assertions.
 * @version 1.0.0
 */
import { buildCanvasDraftSaveRequest } from './canvasDraftAuthoring';
import type { CanvasDraftScenarioOptions } from './canvasDrafts/scenario';
import {
  buildAuthorizationHeaders,
  buildBearerAuth,
  buildDraftReadUrl,
  readRequiredEnv,
} from './liveProtectedRequest';
import { resolveLiveWorkspaceSession } from './liveProtectedRuntime';

export function seedLiveSelectedClosureDraft(
  options: CanvasDraftScenarioOptions = {}
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
        expect(readResponse.body.kind).to.equal('not_found');
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

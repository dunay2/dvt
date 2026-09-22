/**
 * Owned concern: prove protected StartRun rejection boundaries using an exact
 * PlanRef obtained from the persisted native Canvas Preview.
 */
import {
  clickPreviewExecutionPlanFromOperationalDrawer,
  getVisibleCanvasNode,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import { resetE2eApiStubs } from '../../support/e2eApiStub';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveRunIds,
  resolveLiveWorkspaceSession,
  seedLiveSelectedClosureDraft,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

describe('DVT protected StartRun boundaries live', () => {
  type PlanRef = {
    readonly uri: string;
    readonly sha256: string;
    readonly schemaVersion: string;
    readonly planId: string;
    readonly planVersion: string;
  };

  type LiveSession = ReturnType<typeof resolveLiveWorkspaceSession>;

  function previewExactPlanRef(title: string, alias: string): Cypress.Chainable<PlanRef> {
    seedLiveSelectedClosureDraft({
      authoringGenerated: true,
      terminalTransformPreview: true,
      title,
    });
    cy.intercept('POST', '**/plans/preview').as(alias);
    visitWithLiveWorkspaceSession('/canvas');
    getVisibleCanvasNode('dvt-transform-1').should('be.visible');
    selectCanvasClosure(['dvt-transform-1']);
    clickPreviewExecutionPlanFromOperationalDrawer();

    return cy.wait(`@${alias}`, { timeout: 30_000 }).then((interception) => {
      expect(interception.response?.statusCode).to.equal(200);
      const planRef = (interception.response?.body as { readonly planRef?: PlanRef }).planRef;
      expect(planRef?.sha256).to.match(/^[a-f0-9]{64}$/);
      expect(planRef?.planId).to.be.a('string').and.not.to.equal('');
      return planRef!;
    });
  }

  function startRun(
    session: LiveSession,
    planRef: PlanRef,
    projectId: string,
    bearerToken = String(Cypress.env('apiBearerToken'))
  ): Cypress.Chainable<Cypress.Response<unknown>> {
    const apiBaseUrl = String(Cypress.env('apiBaseUrl'));

    return cy.request({
      method: 'POST',
      url: `${apiBaseUrl}/runs/start`,
      headers: { Authorization: `Bearer ${bearerToken}` },
      auth: { bearer: bearerToken },
      failOnStatusCode: false,
      body: {
        tenantId: session.tenantId,
        projectId,
        environmentId: session.environmentId,
        targetAdapter: 'temporal',
        selection: { mode: 'explicit', nodeIds: ['dvt-transform-1'] },
        planRef,
      },
    });
  }

  function readRestrictedBearerToken(): string {
    const token = Cypress.env('restrictedApiBearerToken');
    expect(token).to.be.a('string').and.not.to.equal('');
    return String(token);
  }

  beforeEach(function () {
    if (!hasLiveProtectedRuntimeEnv()) this.skip();
    resetE2eApiStubs();
  });

  it('rejects a cross-scope StartRun without creating a Run', () => {
    const session = resolveLiveWorkspaceSession();
    let authorizedRunIds: string[] = [];
    let planRef: PlanRef;

    previewExactPlanRef('DVT cross-scope StartRun guard', 'crossScopePreview').then(
      (previewPlanRef) => {
        planRef = previewPlanRef;
      }
    );
    readLiveRunIds(session).then((runIds) => {
      authorizedRunIds = runIds;
    });
    cy.then(() => startRun(session, planRef, `${session.projectId}-other`)).then((response) => {
      expect(response.status).to.equal(403);
      expect(response.body).to.deep.equal({
        error: { type: 'forbidden', reason: 'project_not_granted' },
      });
      expect(JSON.stringify(response.body)).not.to.contain(planRef.sha256);
      expect(JSON.stringify(response.body)).not.to.contain(planRef.planId);
    });
    readLiveRunIds(session).then((currentRunIds) => {
      expect(currentRunIds).to.deep.equal(authorizedRunIds);
    });
  });

  it('rejects a corrupted PlanRef without creating a Run or disclosing plan identity', () => {
    const session = resolveLiveWorkspaceSession();
    let authorizedRunIds: string[] = [];
    let exactPlanRef: PlanRef;
    let corruptedPlanRef: PlanRef;

    previewExactPlanRef('DVT corrupt PlanRef guard', 'corruptPlanRefPreview').then((planRef) => {
      exactPlanRef = planRef;
      corruptedPlanRef = {
        ...planRef,
        sha256: `${planRef.sha256[0] === '0' ? '1' : '0'}${planRef.sha256.slice(1)}`,
      };
    });
    readLiveRunIds(session).then((runIds) => {
      authorizedRunIds = runIds;
    });
    cy.then(() => startRun(session, corruptedPlanRef, session.projectId)).then((response) => {
      expect(response.status).to.equal(422);
      expect(response.body).to.deep.equal({
        error: { type: 'unprocessable', reason: 'plan_rejected' },
      });
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.to.contain(exactPlanRef.sha256);
      expect(responseText).not.to.contain(corruptedPlanRef.sha256);
      expect(responseText).not.to.contain(exactPlanRef.planId);
    });
    readLiveRunIds(session).then((currentRunIds) => {
      expect(currentRunIds).to.deep.equal(authorizedRunIds);
    });
  });

  it('rejects a same-scope principal without run:start permission', () => {
    const session = resolveLiveWorkspaceSession();
    const restrictedBearerToken = readRestrictedBearerToken();
    let authorizedRunIds: string[] = [];
    let planRef: PlanRef;

    previewExactPlanRef('DVT StartRun action guard', 'actionDeniedPreview').then(
      (previewPlanRef) => {
        planRef = previewPlanRef;
      }
    );
    readLiveRunIds(session).then((runIds) => {
      authorizedRunIds = runIds;
    });
    cy.then(() => startRun(session, planRef, session.projectId, restrictedBearerToken)).then(
      (response) => {
        expect(response.status).to.equal(403);
        expect(response.body).to.deep.equal({
          error: { type: 'forbidden', reason: 'action_not_granted' },
        });
        expect(JSON.stringify(response.body)).not.to.contain(planRef.sha256);
        expect(JSON.stringify(response.body)).not.to.contain(planRef.planId);
      }
    );
    readLiveRunIds(session).then((currentRunIds) => {
      expect(currentRunIds).to.deep.equal(authorizedRunIds);
    });
  });
});

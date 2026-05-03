import { buildDraftReadDeniedResponse } from '../../../src/app/services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import {
  buildCanvasDraftReadResponse,
  type CanvasDraftSessionScope,
} from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type DraftDeniedReason = 'unauthenticated' | 'workspace_scope_denied';

const DRAFT_SYNCED_COPY = /Draft synced|Draft sincronizado/;
const SESSION_REQUIRED_TITLE =
  /Session required for draft access|Sesion requerida para acceder al draft/;
const REFRESH_SESSION_ACTION = /Refresh session|Refrescar sesion/;
const FORBIDDEN_SCOPE_TITLE = /Draft scope is forbidden|El scope del draft esta denegado/;
const CHANGE_SCOPE_ACTION = /Change scope|Cambiar scope/;
const READ_ONLY_TITLE = /Draft is read-only|El draft esta en solo lectura/;

function stubRuntimeCapabilities(): void {
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '1.0.0',
    plugins: {
      dvt: { available: true },
    },
  });
}

function assertDraftReadScope(
  url: URL,
  scope: CanvasDraftSessionScope = E2E_WORKSPACE_SESSION
): void {
  expect(Object.fromEntries(url.searchParams.entries())).to.deep.include({
    tenantId: scope.tenantId,
    projectId: scope.projectId,
    environmentId: scope.environmentId,
  });
}

function buildDeniedDraftReadResponse(
  reason: DraftDeniedReason
): ReturnType<typeof buildDraftReadDeniedResponse> {
  return buildDraftReadDeniedResponse(E2E_WORKSPACE_SESSION, {
    capability: {
      scope: E2E_WORKSPACE_SESSION,
      mode: 'forbidden',
      canRead: false,
      canWrite: false,
      reason,
    },
  });
}

function stubDraftReadResponse(body: unknown): void {
  stubE2eApi('GET', '/workspace/graph/draft', ({ url }) => {
    assertDraftReadScope(url);

    return {
      statusCode: 200,
      body,
    };
  });
}

function stubUnexpectedDraftSave(): void {
  stubE2eApi('PUT', '/workspace/graph/draft', () => {
    throw new Error('Canvas draft access posture must block draft saves in this scenario.');
  });
}

function visitCanvasWithDraftRead(body: unknown): void {
  stubShellBootstrapApis();
  stubRuntimeCapabilities();
  stubDraftReadResponse(body);
  stubUnexpectedDraftSave();

  visitWithE2eWorkspaceSession('/canvas');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function assertUnsafeCanvasCommandsAreDisabled(): void {
  cy.contains('button', 'Plan').should('be.disabled');
  cy.contains('button', 'Run').should('be.disabled');
  cy.then(() => {
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
  });
}

function assertDraftSyncedCopyIsHidden(): void {
  cy.get('body').invoke('text').should('not.match', DRAFT_SYNCED_COPY);
}

describe('Canvas draft access posture', () => {
  it('shows session recovery and disables unsafe Canvas actions when draft access is unauthenticated', () => {
    visitCanvasWithDraftRead(buildDeniedDraftReadResponse('unauthenticated'));

    cy.contains(SESSION_REQUIRED_TITLE).should('be.visible');
    cy.contains('button', REFRESH_SESSION_ACTION).should('be.visible').and('be.enabled');
    assertDraftSyncedCopyIsHidden();
    assertUnsafeCanvasCommandsAreDisabled();
  });

  it('shows forbidden-scope recovery when workspace scope is denied', () => {
    visitCanvasWithDraftRead(buildDeniedDraftReadResponse('workspace_scope_denied'));

    cy.contains(FORBIDDEN_SCOPE_TITLE).should('be.visible');
    cy.contains('button', CHANGE_SCOPE_ACTION).should('be.visible').and('be.enabled');
    assertDraftSyncedCopyIsHidden();
    assertUnsafeCanvasCommandsAreDisabled();
  });

  it('keeps inspection visible and graph mutation disabled for read-only drafts', () => {
    visitCanvasWithDraftRead(
      buildCanvasDraftReadResponse(E2E_WORKSPACE_SESSION, { readOnly: true })
    );

    cy.contains(READ_ONLY_TITLE).should('be.visible');
    cy.get('.react-flow').should('be.visible');
    assertDraftSyncedCopyIsHidden();
    assertUnsafeCanvasCommandsAreDisabled();

    cy.get('[aria-label="Show explorer panel"]').click();
    cy.contains('Project Nodes').should('be.visible');
    cy.contains('h3', 'Add node').should('not.exist');
  });
});

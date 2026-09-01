/** Owned concern: prove Canvas draft access fail-closed posture in browser. */
import { buildDraftReadDeniedResponse } from '../../../src/app/services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { resolveCanvasViewCopy, type CanvasViewCopy } from '../../../src/app/views/canvas/copy';
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
  E2E_PROJECT_WORKSPACE,
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type DraftDeniedReason = 'unauthenticated' | 'workspace_scope_denied';
type CanvasDraftAccessCopyKey = keyof Pick<
  CanvasViewCopy,
  | 'draftSessionRequiredTitle'
  | 'draftForbiddenScopeTitle'
  | 'draftReadOnlyTitle'
  | 'refreshSessionActionLabel'
  | 'changeScopeActionLabel'
  | 'draftSyncedLabel'
>;

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
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubDraftReadResponse(body);
  stubUnexpectedDraftSave();

  visitWithE2eWorkspaceSession('/canvas');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function assertUnsafeCanvasCommandsAreDisabled(): void {
  cy.window({ log: false }).then((window) => {
    const copy = resolveCanvasViewCopy(
      window.navigator.language || window.document.documentElement.lang
    );

    for (const label of [copy.toolbarPlanLabel, copy.toolbarRunLabel]) {
      cy.get('body').then(($body) => {
        const matchingButton = [...$body.find('button')].find((button) =>
          button.textContent?.includes(label)
        );

        if (matchingButton != null) {
          cy.wrap(matchingButton).should('be.disabled');
        }
      });
    }
  });

  cy.then(() => {
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
  });
}

function assertCanvasCopyVisible(copyKey: CanvasDraftAccessCopyKey): void {
  cy.window({ log: false }).then((window) => {
    const copy = resolveCanvasViewCopy(
      window.navigator.language || window.document.documentElement.lang
    );

    cy.contains(copy[copyKey]).should('be.visible');
  });
}

function assertCanvasButtonVisible(copyKey: CanvasDraftAccessCopyKey): void {
  cy.window({ log: false }).then((window) => {
    const copy = resolveCanvasViewCopy(
      window.navigator.language || window.document.documentElement.lang
    );

    cy.contains('button', copy[copyKey]).should('be.visible').and('be.enabled');
  });
}

function assertDraftSyncedCopyIsHidden(): void {
  cy.window({ log: false }).then((window) => {
    const copy = resolveCanvasViewCopy(
      window.navigator.language || window.document.documentElement.lang
    );

    cy.get('body').invoke('text').should('not.contain', copy.draftSyncedLabel);
  });
}

describe('Canvas draft access posture', () => {
  it('shows session recovery and disables unsafe Canvas actions when draft access is unauthenticated', () => {
    visitCanvasWithDraftRead(buildDeniedDraftReadResponse('unauthenticated'));

    assertCanvasCopyVisible('draftSessionRequiredTitle');
    assertCanvasButtonVisible('refreshSessionActionLabel');
    assertDraftSyncedCopyIsHidden();
    assertUnsafeCanvasCommandsAreDisabled();
  });

  it('shows forbidden-scope recovery when workspace scope is denied', () => {
    visitCanvasWithDraftRead(buildDeniedDraftReadResponse('workspace_scope_denied'));

    assertCanvasCopyVisible('draftForbiddenScopeTitle');
    assertCanvasButtonVisible('changeScopeActionLabel');
    assertDraftSyncedCopyIsHidden();
    assertUnsafeCanvasCommandsAreDisabled();
  });

  it('keeps inspection visible and graph mutation disabled for read-only drafts', () => {
    visitCanvasWithDraftRead(
      buildCanvasDraftReadResponse(E2E_WORKSPACE_SESSION, { readOnly: true })
    );

    cy.get('[data-slot="canvas-readonly-state"]').should('be.visible');
    cy.get('.react-flow').should('be.visible');
    assertDraftSyncedCopyIsHidden();
    assertUnsafeCanvasCommandsAreDisabled();

    cy.get('.react-flow__pane').rightclick(320, 260);
    cy.contains('[role="menuitem"]', 'Transform').should('not.exist');
    cy.contains('[role="menuitem"]', 'Add source').should('not.exist');
  });
});

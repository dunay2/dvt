/**
 * Owned concern: keep abandoned session responses from replacing current route admission.
 * @baseline GH-3678: route cleanup must also invalidate browser projection publication.
 * @decision Delay only the workspace HTTP response and navigate through the real public route.
 * @consequence A transport that ignores abort cannot restore obsolete workspace grants.
 */
import type { WorkspaceContextResponse } from '@dvt/contracts';

import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
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

const CURRENT_SCOPE = {
  ...E2E_WORKSPACE_SESSION,
  projectId: 'current-project',
};
const CURRENT_WORKSPACE = {
  ...CURRENT_SCOPE,
  projectName: 'Current project',
};
const OBSOLETE_WORKSPACE = {
  ...E2E_WORKSPACE_SESSION,
  projectId: 'obsolete-project',
  projectName: 'Obsolete project',
};

function workspaceResponse(workspace: typeof CURRENT_WORKSPACE): {
  body: WorkspaceContextResponse;
} {
  return {
    body: {
      defaultWorkspace: workspace,
      availableWorkspaces: [workspace],
      deploymentScope: {
        targetAdapter: 'temporal',
        availableTargetAdapters: ['temporal'],
      },
    },
  };
}

describe('Session publication across public route navigation', () => {
  let releasePrevious: (() => void) | undefined;

  afterEach(() => {
    releasePrevious?.();
    releasePrevious = undefined;
  });

  for (const currentAccess of ['granted', 'denied'] as const) {
    it(`discards the abandoned response after current access is ${currentAccess}`, () => {
      cy.viewport(1400, 900);
      stubShellBootstrapApis({
        projectIds: [CURRENT_WORKSPACE.projectId, OBSOLETE_WORKSPACE.projectId],
      });
      stubE2eJsonApi('GET', '/capabilities', {
        apiVersion: '1.0.0',
        minFrontendVersion: '0.0.1',
        plugins: { dvt: { available: true } },
      });
      stubE2eJsonApi('GET', '/projects', {
        tenants: [{ tenantId: E2E_WORKSPACE_SESSION.tenantId, canCreateProject: true }],
        projects: [],
        integrityFindings: [],
      });
      stubCanvasDraftRead({ emptyCanvas: true, canvasKind: 'transformation' }, CURRENT_SCOPE);

      const previousResponseGate = new Promise<void>((resolve) => {
        releasePrevious = resolve;
      });
      let workspaceRequests = 0;
      stubE2eApi('GET', '/workspace/context', async () => {
        workspaceRequests += 1;
        if (workspaceRequests === 1) {
          await previousResponseGate;
          return workspaceResponse(OBSOLETE_WORKSPACE);
        }
        return currentAccess === 'granted'
          ? workspaceResponse(CURRENT_WORKSPACE)
          : {
              statusCode: 403,
              body: {
                error: { type: 'forbidden', reason: 'workspace_context_not_granted' },
              },
            };
      });

      let previousResponseRead = false;
      let persistedBeforeAdmission: string | null = null;
      visitWithE2eWorkspaceSession('/login?returnTo=%2Fcanvas', {
        onBeforeLoad(window) {
          const fetch = window.fetch.bind(window);
          let observedWorkspace = false;
          window.fetch = async (input, init) => {
            const request = new window.Request(input, init);
            const previous =
              new URL(request.url).pathname === '/workspace/context' && !observedWorkspace;
            if (previous) observedWorkspace = true;
            const response = await fetch(input, init);
            if (previous) {
              const readJson = response.json.bind(response);
              response.json = async () => {
                const body: unknown = await readJson();
                previousResponseRead = true;
                return body;
              };
            }
            return response;
          };
        },
      });
      cy.contains('Login required').should('be.visible');
      cy.window().then((window) => {
        persistedBeforeAdmission = window.localStorage.getItem('dvt-web-session');
      });
      cy.contains('a', 'Retry protected route').click();
      waitForE2eApiCall('/workspace/context', 'GET');
      cy.get('[data-testid="canvas-viewport"]').should('not.exist');
      cy.go('back');
      cy.contains('Login required').should('be.visible');
      cy.contains('a', 'Retry protected route').click();

      if (currentAccess === 'granted') {
        waitForE2eApiCall('/workspace/graph/draft', 'GET');
        cy.get('[data-testid="canvas-viewport"]').should('be.visible');
      } else {
        cy.get('[data-slot="project-onboarding-form"]').should('be.visible');
      }
      cy.then(() => {
        expect(workspaceRequests).to.equal(2);
        expect(releasePrevious).to.be.a('function');
        releasePrevious!();
      });
      // Observe consumption, not just release, before asserting absence of a late publication.
      cy.wrap(null).should(() => expect(previousResponseRead).to.equal(true));
      cy.window().should((window) => {
        const persisted = window.localStorage.getItem('dvt-web-session');
        if (currentAccess === 'granted') {
          expect(JSON.parse(persisted ?? 'null').state).to.deep.include(CURRENT_SCOPE);
        } else {
          expect(persisted).to.equal(persistedBeforeAdmission);
          expect(getE2eApiCalls('/workspace/graph/draft', 'GET')).to.have.length(0);
        }
      });
      cy.location('pathname').should('eq', '/canvas');
      cy.contains(OBSOLETE_WORKSPACE.projectName).should('not.exist');
      if (currentAccess === 'granted') {
        cy.get('[data-testid="canvas-viewport"]').should('be.visible');
      } else {
        cy.get('[data-slot="project-onboarding-form"]').should('be.visible');
        cy.get('[data-testid="canvas-viewport"]').should('not.exist');
      }
    });
  }
});

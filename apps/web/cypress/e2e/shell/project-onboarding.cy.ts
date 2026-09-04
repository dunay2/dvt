import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  installE2eApiFetchStub,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
} from '../../support/workspaceSession';

function stubRuntimeCapabilities(): void {
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: {
      dvt: { available: true },
    },
  });
}

function stubFirstUseProjectOnboardingApis(): void {
  let projectCreated = false;

  stubE2eApi('GET', '/workspace/context', () => {
    if (!projectCreated) {
      return {
        statusCode: 403,
        body: {
          error: {
            type: 'forbidden',
            reason: 'workspace_context_not_granted',
          },
        },
      };
    }

    return {
      body: {
        defaultWorkspace: E2E_PROJECT_WORKSPACE,
        availableWorkspaces: [E2E_PROJECT_WORKSPACE],
        deploymentScope: {
          targetAdapter: 'temporal',
          availableTargetAdapters: ['temporal'],
        },
      },
    };
  });

  stubE2eJsonApi('GET', '/projects', {
    tenants: [
      {
        tenantId: E2E_WORKSPACE_SESSION.tenantId,
        canCreateProject: true,
      },
    ],
    projects: [],
    integrityFindings: [],
  });

  stubE2eApi('POST', '/projects', ({ body, headers }) => {
    expect(headers).to.have.property('idempotency-key').and.to.not.equal('');
    expect(body).to.deep.equal({
      tenantId: E2E_WORKSPACE_SESSION.tenantId,
      name: 'Orders workspace',
    });
    projectCreated = true;

    return {
      statusCode: 201,
      body: {
        project: {
          tenantId: E2E_WORKSPACE_SESSION.tenantId,
          projectId: E2E_WORKSPACE_SESSION.projectId,
          name: 'Orders workspace',
          environmentIds: [E2E_WORKSPACE_SESSION.environmentId],
        },
        defaultWorkspace: E2E_PROJECT_WORKSPACE,
      },
    };
  });
}

function visitCanvasWithoutPersistedWorkspace(): void {
  cy.visit('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.clear();
      installE2eApiFetchStub(window);
    },
  });
}

describe('Project onboarding first-use flow', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
    stubShellBootstrapApis({
      scopes: [
        'workspace:graph-draft:view',
        'workspace:graph-draft:save',
        'plan:preview',
        'run:start',
      ],
    });
    stubRuntimeCapabilities();
    stubFirstUseProjectOnboardingApis();
    stubStatefulCanvasDraftAuthoring({ emptyCanvas: true, canvasKind: 'transformation' });
  });

  it('creates a project and opens an empty typed canvas without fixture nodes', () => {
    visitCanvasWithoutPersistedWorkspace();

    cy.contains(/Create a project|Crear un proyecto/, { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="project-onboarding-form"]').within(() => {
      cy.get('select[name="tenantId"]').should('not.exist');
      cy.contains(E2E_WORKSPACE_SESSION.tenantId).should('not.exist');
      cy.get('input[name="projectName"]').type('Orders workspace');
      cy.contains('button', /Create project|Crear proyecto/).click();
    });

    waitForE2eApiCall('/projects', 'POST');
    waitForE2eApiCall('/workspace/context', 'GET');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.location('pathname').should('eq', '/canvas');
    cy.get('[data-slot="canvas-viewport"]', { timeout: 20_000 }).should('be.visible');
    cy.get('[data-slot="canvas-empty-state"]').should('not.exist');
    cy.contains('src_orders').should('not.exist');
    cy.contains('model_orders').should('not.exist');
    cy.contains('orders_dashboard').should('not.exist');
  });
});

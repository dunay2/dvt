import { resolveCopyLanguage } from '../../../src/app/copyLanguage';
import { resolveRunStatesCopy } from '../../../src/app/views/runs/runStatesCopy';
import { getLastE2eApiCall, stubE2eJsonApi } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubRunsRouteBootstrapApis(): void {
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: {
      monitoring: { available: true },
    },
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/runs', {
    items: [
      {
        runId: 'run_e2e_1',
        planId: 'plan_e2e_1',
        status: 'RUNNING',
        environmentId: 'e2e-env',
        startedAt: '2026-04-07T00:00:00.000Z',
      },
    ],
  });
}

function expectScopedRunRequest(path: string): void {
  cy.wrap(null, { timeout: 5_000 }).should(() => {
    const request = getLastE2eApiCall(path, 'GET');
    expect(request, `GET ${path}`).not.to.equal(null);
    expect(request?.url.searchParams.get('tenantId')).to.equal('e2e-tenant');
    if (path === '/runs') {
      expect(request?.url.searchParams.get('projectId')).to.equal('e2e-project');
      expect(request?.url.searchParams.get('environmentId')).to.equal('e2e-env');
    }
  });
}

describe('Runs runtime contract', () => {
  beforeEach(() => {
    stubShellBootstrapApis();
    stubRunsRouteBootstrapApis();
  });

  it('sends tenant scope in list, detail, and events requests', () => {
    stubE2eJsonApi('GET', '/runs/run_e2e_1', {
      runId: 'run_e2e_1',
      planId: 'plan_e2e_1',
      status: 'RUNNING',
      environmentId: 'e2e-env',
      startedAt: '2026-04-07T00:00:00.000Z',
    });

    stubE2eJsonApi('GET', '/runs/run_e2e_1/events', {
      items: [],
      nextCursor: null,
    });

    visitWithE2eWorkspaceSession('/runs');
    cy.get('#app-loading-screen', { timeout: 30_000 }).should('not.exist');
    expectScopedRunRequest('/runs');

    cy.window().then((window) => {
      const copy = resolveRunStatesCopy(resolveCopyLanguage(window.document.documentElement.lang));
      cy.get('[data-slot="run-operational-table"]').within(() => {
        cy.contains('run_e2e_1').should('be.visible');
        cy.contains('button', copy.viewDetails).click();
      });
    });
    expectScopedRunRequest('/runs/run_e2e_1');
    expectScopedRunRequest('/runs/run_e2e_1/events');
  });

  it('renders completed result evidence from the snapshot read model', () => {
    stubE2eJsonApi('GET', '/runs/run_completed', {
      runId: 'run_completed',
      planId: 'plan_e2e_1',
      status: 'COMPLETED',
      executor: 'postgres',
      environmentId: 'e2e-env',
      startedAt: '2026-04-07T00:00:00.000Z',
      completedAt: '2026-04-07T00:00:10.000Z',
      execution: {
        materialization: {
          executor: 'postgres',
          environmentId: 'e2e-env',
          sinkTable: 'analytics.orders_daily',
          rowsWritten: 42,
          startedAt: '2026-04-07T00:00:01.000Z',
          completedAt: '2026-04-07T00:00:10.000Z',
          durationMs: 9000,
        },
      },
    });

    stubE2eJsonApi('GET', '/runs/run_completed/events', {
      items: [],
      nextCursor: null,
    });

    visitWithE2eWorkspaceSession('/runs/run_completed');
    cy.get('#app-loading-screen', { timeout: 30_000 }).should('not.exist');
    expectScopedRunRequest('/runs/run_completed');
    expectScopedRunRequest('/runs/run_completed/events');

    cy.window().then((window) => {
      const copy = resolveRunStatesCopy(resolveCopyLanguage(window.document.documentElement.lang));
      cy.contains(copy.runTitle('run_completed')).should('be.visible');
      cy.get('[data-slot="run-result-tab"]').should('be.enabled').click();
      cy.get('[data-slot="run-materialization-card"]').within(() => {
        cy.contains(copy.materializationTitle).should('be.visible');
        cy.contains(copy.executorLabel).should('be.visible');
        cy.contains('postgres').should('be.visible');
        cy.contains('analytics.orders_daily').should('be.visible');
        cy.contains('42').should('be.visible');
      });
    });
  });

  it('renders failed result diagnostics from the snapshot read model', () => {
    stubE2eJsonApi('GET', '/runs/run_failed', {
      runId: 'run_failed',
      planId: 'plan_e2e_1',
      status: 'FAILED',
      executor: 'postgres',
      environmentId: 'e2e-env',
      startedAt: '2026-04-07T00:00:00.000Z',
      completedAt: '2026-04-07T00:00:10.000Z',
      failedStepId: 'step-transform',
      errorReason: 'STEP_FAILURE',
      execution: {
        failure: {
          stepId: 'step-transform',
          reason: 'STEP_FAILURE',
          failedAt: '2026-04-07T00:00:08.000Z',
        },
      },
    });

    stubE2eJsonApi('GET', '/runs/run_failed/events', {
      items: [],
      nextCursor: null,
    });

    visitWithE2eWorkspaceSession('/runs/run_failed');
    cy.get('#app-loading-screen', { timeout: 30_000 }).should('not.exist');
    expectScopedRunRequest('/runs/run_failed');
    expectScopedRunRequest('/runs/run_failed/events');

    cy.window().then((window) => {
      const copy = resolveRunStatesCopy(resolveCopyLanguage(window.document.documentElement.lang));
      cy.contains(copy.runTitle('run_failed')).should('be.visible');
      cy.contains(copy.executorLabel).should('be.visible');
      cy.contains('postgres').should('be.visible');
      cy.get('[data-slot="run-detail-diagnostics-tab"]').click();
      cy.contains(copy.failureDiagnosticsTitle).should('be.visible');
      cy.contains('step-transform').should('be.visible');
      cy.contains('STEP_FAILURE').should('be.visible');
    });
  });
});

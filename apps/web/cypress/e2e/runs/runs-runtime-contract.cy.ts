import { resolveCopyLanguage } from '../../../src/app/copyLanguage';
import { resolveRunStatesCopy } from '../../../src/app/views/runs/runStatesCopy';
import { getLastE2eApiCall, stubE2eJsonApi } from '../../support/e2eApiStub';
import { pressNativeKey } from '../../support/nativeKeyboard';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function stubRunsRouteBootstrapApis(): void {
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
    stubShellBootstrapApis({
      capabilities: {
        body: {
          apiVersion: '1.0.0',
          minFrontendVersion: '0.0.1',
          plugins: { monitoring: { available: true } },
        },
      },
    });
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

    // Run ID owns navigation now; the complete trusted Enter proves the browser's link action.
    cy.get('[data-slot="run-operational-table"] a[href="/runs/run_e2e_1"]')
      .should('be.visible')
      .focus();
    pressNativeKey('Enter');
    expectScopedRunRequest('/runs/run_e2e_1');
    expectScopedRunRequest('/runs/run_e2e_1/events');
  });

  it('uses one shell heading and keeps the token-based dense table contained beside the persistent rail', () => {
    cy.viewport(1280, 800);
    visitWithE2eWorkspaceSession('/runs');
    cy.get('#app-loading-screen', { timeout: 30_000 }).should('not.exist');
    let rail: HTMLElement;
    cy.get<HTMLElement>('[data-slot="left-navigation-rail"]')
      .should('be.visible')
      .then((element) => {
        rail = element[0]!;
      });
    cy.window().then((window) => {
      const copy = resolveRunStatesCopy(resolveCopyLanguage(window.document.documentElement.lang));
      cy.get('[data-slot="shell-top-bar"] h1').should('have.text', copy.runsTitle);
      cy.get('[data-slot="runs-state-header"]').should('not.exist');
      cy.get('[data-slot="run-operational-table"] thead th')
        .last()
        .should('have.text', copy.runTableHeaders.status);
      cy.get('[data-column="status"]').each((element) => {
        expect(['right', 'end']).to.include(window.getComputedStyle(element[0]!).textAlign);
      });
      cy.get('[data-slot="run-operational-table"] a')
        .first()
        .then((element) => {
          const computed = window.getComputedStyle(element[0]!);
          expect(computed.fontFamily).to.include('IBM Plex Mono');
          const tokenProbe = window.document.createElement('span');
          tokenProbe.style.color = 'var(--text-strong)';
          window.document.body.append(tokenProbe);
          try {
            expect(computed.color).to.equal(window.getComputedStyle(tokenProbe).color);
          } finally {
            tokenProbe.remove();
          }
        });
    });
    cy.viewport(400, 700);
    cy.get<HTMLElement>('[data-slot="left-navigation-rail"]')
      .should('be.visible')
      .should((element) => {
        expect(element[0], 'viewport changes retain the same navigation owner').to.equal(rail);
      });
    cy.get<HTMLElement>('[data-slot="run-operational-table"] [data-slot="table-container"]').should(
      (element) => {
        const container = element[0]!;
        expect(container.scrollWidth, 'dense columns scroll locally').to.be.greaterThan(
          container.clientWidth
        );
        const document = container.ownerDocument;
        expect(
          document.documentElement.scrollWidth,
          'page width stays inside the viewport'
        ).to.be.at.most(document.documentElement.clientWidth + 1);
      }
    );
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

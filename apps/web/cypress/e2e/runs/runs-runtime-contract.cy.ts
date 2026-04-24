import { waitForE2eApiCall } from '../../support/e2eApiStub';
import { stubShellBootstrapApis, visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

describe('Runs runtime contract', () => {
  beforeEach(() => {
    stubShellBootstrapApis();
  });

  it('sends tenant scope in list, detail, and events requests', () => {
    cy.intercept('GET', '**/runs?tenantId=*', (req) => {
      expect(req.url).to.include('tenantId=e2e-tenant');
      expect(req.url).to.include('projectId=e2e-project');
      expect(req.url).to.include('environmentId=e2e-env');

      req.reply({
        statusCode: 200,
        body: {
          items: [
            {
              runId: 'run_e2e_1',
              planId: 'plan_e2e_1',
              status: 'RUNNING',
              environmentId: 'e2e-env',
              startedAt: '2026-04-07T00:00:00.000Z',
            },
          ],
          nextCursor: null,
        },
      });
    }).as('listRuns');

    cy.intercept('GET', '**/runs/run_e2e_1?tenantId=*', (req) => {
      expect(req.url).to.include('tenantId=e2e-tenant');

      req.reply({
        statusCode: 200,
        body: {
          runId: 'run_e2e_1',
          planId: 'plan_e2e_1',
          status: 'RUNNING',
          environmentId: 'e2e-env',
          startedAt: '2026-04-07T00:00:00.000Z',
        },
      });
    }).as('getRun');

    cy.intercept('GET', '**/runs/run_e2e_1/events?tenantId=*', (req) => {
      expect(req.url).to.include('tenantId=e2e-tenant');

      req.reply({
        statusCode: 200,
        body: {
          items: [],
          nextCursor: null,
        },
      });
    }).as('getRunEvents');

    visitWithE2eWorkspaceSession('/runs');
    waitForE2eApiCall('/healthz', 'GET');
    waitForE2eApiCall('/readyz', 'GET');
    waitForE2eApiCall('/version', 'GET');
    waitForE2eApiCall('/db/ready', 'GET');
    cy.wait('@listRuns');

    cy.contains('Run run_e2e_1').click();
    cy.wait('@getRun');
    cy.wait('@getRunEvents');
  });

  it('renders completed result evidence from the snapshot read model', () => {
    cy.intercept('GET', '**/runs/run_completed?tenantId=*', (req) => {
      expect(req.url).to.include('tenantId=e2e-tenant');

      req.reply({
        statusCode: 200,
        body: {
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
        },
      });
    }).as('getCompletedRun');

    cy.intercept('GET', '**/runs/run_completed/events?tenantId=*', (req) => {
      expect(req.url).to.include('tenantId=e2e-tenant');
      req.reply({
        statusCode: 200,
        body: {
          items: [],
          nextCursor: null,
        },
      });
    }).as('getCompletedRunEvents');

    visitWithE2eWorkspaceSession('/runs/run_completed');
    waitForE2eApiCall('/healthz', 'GET');
    waitForE2eApiCall('/readyz', 'GET');
    waitForE2eApiCall('/version', 'GET');
    waitForE2eApiCall('/db/ready', 'GET');
    cy.wait('@getCompletedRun');
    cy.wait('@getCompletedRunEvents');

    cy.contains('Run run_completed').should('exist');
    cy.contains('Materialization evidence').should('exist');
    cy.contains('Executor').should('exist');
    cy.contains('postgres').should('exist');
    cy.contains('analytics.orders_daily').should('exist');
    cy.contains('42').should('exist');
  });

  it('renders failed result diagnostics from the snapshot read model', () => {
    cy.intercept('GET', '**/runs/run_failed?tenantId=*', (req) => {
      expect(req.url).to.include('tenantId=e2e-tenant');

      req.reply({
        statusCode: 200,
        body: {
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
        },
      });
    }).as('getFailedRun');

    cy.intercept('GET', '**/runs/run_failed/events?tenantId=*', (req) => {
      expect(req.url).to.include('tenantId=e2e-tenant');
      req.reply({
        statusCode: 200,
        body: {
          items: [],
          nextCursor: null,
        },
      });
    }).as('getFailedRunEvents');

    visitWithE2eWorkspaceSession('/runs/run_failed');
    waitForE2eApiCall('/healthz', 'GET');
    waitForE2eApiCall('/readyz', 'GET');
    waitForE2eApiCall('/version', 'GET');
    waitForE2eApiCall('/db/ready', 'GET');
    cy.wait('@getFailedRun');
    cy.wait('@getFailedRunEvents');

    cy.contains('Run run_failed').should('exist');
    cy.contains('Failure diagnostics').should('exist');
    cy.contains('Executor').should('exist');
    cy.contains('postgres').should('exist');
    cy.contains('step-transform').should('exist');
    cy.contains('STEP_FAILURE').should('exist');
  });
});

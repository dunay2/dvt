type PlanPreviewResponseOptions = {
  persistedSha: string;
  planRefSha: string;
};

function stubRunWorkspaceApis(runId = 'run_e2e_1'): void {
  cy.intercept('GET', '**/runs?*', {
    statusCode: 200,
    body: {
      items: [
        {
          runId,
          planId: 'plan_e2e_1',
          status: 'FAILED',
          environmentId: 'e2e-env',
          startedAt: '2026-04-08T00:00:00.000Z',
          completedAt: '2026-04-08T00:00:30.000Z',
          failedStepId: 'step-transform',
          errorReason: 'STEP_FAILURE',
          materialization: {
            executor: 'postgres',
            environmentId: 'e2e-env',
            sinkTable: 'analytics.orders_daily',
            rowsWritten: 42,
            startedAt: '2026-04-08T00:00:05.000Z',
            completedAt: '2026-04-08T00:00:25.000Z',
            durationMs: 20000,
          },
        },
      ],
      nextCursor: null,
    },
  }).as('listRuns');

  cy.intercept(`GET`, `**/runs/${runId}?*`, {
    statusCode: 200,
    body: {
      runId,
      planId: 'plan_e2e_1',
      status: 'FAILED',
      environmentId: 'e2e-env',
      gitSha: 'abc123def',
      startedAt: '2026-04-08T00:00:00.000Z',
      completedAt: '2026-04-08T00:00:30.000Z',
      failedStepId: 'step-transform',
      errorReason: 'STEP_FAILURE',
      materialization: {
        executor: 'postgres',
        environmentId: 'e2e-env',
        sinkTable: 'analytics.orders_daily',
        rowsWritten: 42,
        startedAt: '2026-04-08T00:00:05.000Z',
        completedAt: '2026-04-08T00:00:25.000Z',
        durationMs: 20000,
      },
    },
  }).as('getRun');

  cy.intercept(`GET`, `**/runs/${runId}/events*`, {
    statusCode: 200,
    body: {
      items: [
        {
          eventId: 'evt-step-started-1',
          eventType: 'StepStarted',
          runId,
          emittedAt: '2026-04-08T00:00:10.000Z',
          tenantId: 'e2e-tenant',
          projectId: 'e2e-project',
          environmentId: 'e2e-env',
          planId: 'plan_e2e_1',
          planVersion: '1.0.0',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: 'id-1',
          payloadVersion: 1,
          stepId: 'step-transform',
          runSeq: 1,
          persistedAt: '2026-04-08T00:00:10.000Z',
          payload: {
            stepArtifactRef: {
              artifactKind: 'dbt.compiled-sql',
              storageUri: 's3://dvt-artifacts/dev/compiled/orders_daily.sql',
              sha256: 'a'.repeat(64),
              sizeBytes: 2048,
              encoding: 'utf-8',
            },
          },
        },
        {
          eventId: 'evt-step-started-2',
          eventType: 'StepStarted',
          runId,
          emittedAt: '2026-04-08T00:00:12.000Z',
          tenantId: 'e2e-tenant',
          projectId: 'e2e-project',
          environmentId: 'e2e-env',
          planId: 'plan_e2e_1',
          planVersion: '1.0.0',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: 'id-2',
          payloadVersion: 1,
          stepId: 'step-evidence',
          runSeq: 2,
          persistedAt: '2026-04-08T00:00:12.000Z',
          payload: {
            compiledCodeRef: {
              storageUri: 's3://dvt-artifacts/dev/compiled/evidence.sql',
              sha256: 'b'.repeat(64),
              sizeBytes: 128,
              encoding: 'utf-8',
            },
          },
        },
        {
          eventId: 'evt-step-failed',
          eventType: 'StepFailed',
          runId,
          emittedAt: '2026-04-08T00:00:20.000Z',
          tenantId: 'e2e-tenant',
          projectId: 'e2e-project',
          environmentId: 'e2e-env',
          planId: 'plan_e2e_1',
          planVersion: '1.0.0',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: 'id-3',
          payloadVersion: 1,
          stepId: 'step-transform',
          runSeq: 3,
          persistedAt: '2026-04-08T00:00:20.000Z',
          payload: {},
        },
        {
          eventId: 'evt-run-failed',
          eventType: 'RunFailed',
          runId,
          emittedAt: '2026-04-08T00:00:21.000Z',
          tenantId: 'e2e-tenant',
          projectId: 'e2e-project',
          environmentId: 'e2e-env',
          planId: 'plan_e2e_1',
          planVersion: '1.0.0',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: 'id-4',
          payloadVersion: 1,
          stepId: 'step-transform',
          runSeq: 4,
          persistedAt: '2026-04-08T00:00:21.000Z',
          payload: {
            reason: 'STEP_FAILURE',
          },
        },
      ],
      nextCursor: null,
    },
  }).as('getRunEvents');
}

function stubCanvasRuntimeApis(): void {
  cy.intercept('GET', '**/capabilities*', {
    statusCode: 200,
    body: {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: {
        dbt: { available: true },
      },
    },
  }).as('getCapabilities');

  cy.intercept('GET', '**/workspace/graph*', {
    statusCode: 200,
    body: {
      nodes: [
        {
          id: 'src_orders',
          name: 'src_orders',
          type: 'SOURCE',
          package: 'raw',
          path: 'models/sources/raw.yml',
          tags: ['source'],
          status: 'idle',
          dependencies: [],
        },
        {
          id: 'model_orders',
          name: 'model_orders',
          type: 'MODEL',
          package: 'analytics',
          path: 'models/analytics/model_orders.sql',
          tags: ['transform'],
          status: 'idle',
          dependencies: ['src_orders'],
        },
        {
          id: 'orders_dashboard',
          name: 'orders_dashboard',
          type: 'EXPOSURE',
          package: 'analytics',
          path: 'models/exposures/orders.yml',
          tags: ['output'],
          status: 'idle',
          dependencies: ['model_orders'],
        },
      ],
      edges: [
        {
          id: 'edge_source_transform',
          source: 'src_orders',
          target: 'model_orders',
          type: 'source',
        },
        {
          id: 'edge_transform_sink',
          source: 'model_orders',
          target: 'orders_dashboard',
          type: 'exposure',
        },
      ],
    },
  }).as('getWorkspaceGraph');
}

function stubPlanPreviewResponse({ persistedSha, planRefSha }: PlanPreviewResponseOptions): void {
  cy.intercept('POST', '**/plans/preview', (req) => {
    expect(req.body.persist).to.equal(true);
    expect(req.body.selectedNodeIds).to.deep.equal([
      'src_orders',
      'model_orders',
      'orders_dashboard',
    ]);

    req.reply({
      statusCode: 200,
      body: {
        plan: {
          metadata: {
            planVersion: '1.0',
            schemaVersion: 'v1.2',
            contractVersion: '1.0.0',
            inputHashSha256: 'a'.repeat(64),
            planId: 'b'.repeat(64),
            createdAtIso: '2026-04-08T00:00:00.000Z',
          },
          steps: [],
          observability: {
            tags: {
              adapter: 'temporal',
              environmentId: 'e2e-env',
            },
          },
        },
        planRef: {
          uri: 'dvt://plans/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          sha256: planRefSha,
          schemaVersion: 'v1.2',
          planId: 'b'.repeat(64),
          planVersion: 'v1',
        },
        planSummary: {
          executor: 'postgres',
          nodeCount: 3,
          stepCount: 2,
          sourceTables: ['raw.orders'],
          sinkTables: ['analytics.orders_daily'],
        },
        persisted: {
          planRecordId: 'plan-record-e2e',
          canonicalPlanSha256: persistedSha,
        },
      },
    });
  }).as('previewPlan');
}

describe('Canvas preview-run persisted path', () => {
  it('starts run when persisted preview hash matches active planRef', () => {
    stubCanvasRuntimeApis();
    stubRunWorkspaceApis('run_e2e_1');
    stubPlanPreviewResponse({
      persistedSha: 'c'.repeat(64),
      planRefSha: 'c'.repeat(64),
    });

    cy.intercept('POST', '**/runs/start', (req) => {
      expect(req.body.planRef.sha256).to.equal('c'.repeat(64));
      expect(req.body.planRef.planVersion).to.equal('v1');
      req.reply({
        statusCode: 200,
        body: {
          provider: 'temporal',
          runId: 'run_e2e_1',
          tenantId: 'e2e-tenant',
          namespace: 'default',
          workflowId: 'wf_e2e_1',
        },
      });
    }).as('startRun');

    cy.visit('/canvas');
    cy.wait('@getCapabilities');
    cy.wait('@getWorkspaceGraph');
    cy.contains('Mode: source -> sql_transform -> sink').should('be.visible');

    cy.contains('button', 'Plan').should('be.enabled').click();
    cy.wait('@previewPlan');

    cy.contains('Execution Plan Preview').should('be.visible');
    cy.contains('Preview is current and ready to run.').should('be.visible');
    cy.contains('button', 'Start Run').should('be.enabled').click({ force: true });

    cy.wait('@startRun');
    cy.location('pathname').should('eq', '/runs/run_e2e_1');

    cy.contains('Run run_e2e_1').should('exist');
    cy.contains('Materialization evidence').should('exist');
    cy.contains('Executor').should('exist');
    cy.contains('postgres').should('exist');
    cy.contains('Sink table').should('exist');
    cy.contains('analytics.orders_daily').should('exist');
    cy.contains('Rows written').should('exist');
    cy.contains('42').should('exist');
    cy.contains('Failure diagnostics').should('exist');
    cy.contains('STEP_FAILURE').should('exist');
  });

  it('blocks run when persisted preview hash is not aligned with planRef', () => {
    stubCanvasRuntimeApis();
    stubPlanPreviewResponse({
      persistedSha: 'd'.repeat(64),
      planRefSha: 'c'.repeat(64),
    });

    cy.intercept('POST', '**/runs/start', {
      statusCode: 500,
      body: { message: 'should not be called' },
    }).as('startRun');

    cy.visit('/canvas');
    cy.wait('@getCapabilities');
    cy.wait('@getWorkspaceGraph');
    cy.contains('Mode: source -> sql_transform -> sink').should('be.visible');

    cy.contains('button', 'Plan').should('be.enabled').click();
    cy.wait('@previewPlan');

    cy.contains('Execution Plan Preview').should('be.visible');
    cy.contains(
      'Preview is not aligned with the active plan reference. Re-run Plan before starting.'
    ).should('be.visible');
    cy.contains('button', 'Run').should('be.disabled');
    cy.contains('button', 'Start Run').should('be.disabled');
    cy.get('@startRun.all').should('have.length', 0);
  });
});

type PlanPreviewResponseOptions = {
  persistedSha: string;
  planRefSha: string;
};

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
          workflowId: 'wf_e2e_1',
        },
      });
    }).as('startRun');

    cy.visit('/canvas');
    cy.wait('@getCapabilities');
    cy.wait('@getWorkspaceGraph');

    cy.contains('button', 'Plan').should('be.enabled').click();
    cy.wait('@previewPlan');

    cy.contains('Execution Plan Preview').should('be.visible');
    cy.contains('Preview is current and ready to run.').should('be.visible');
    cy.contains('button', 'Start Run').should('be.enabled').click({ force: true });

    cy.wait('@startRun');
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

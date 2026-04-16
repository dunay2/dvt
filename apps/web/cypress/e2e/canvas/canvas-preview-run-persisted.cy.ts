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
          execution: {
            failure: {
              stepId: 'step-transform',
              reason: 'STEP_FAILURE',
              message: 'duplicate key value violates unique constraint',
              failedAt: '2026-04-08T00:00:20.000Z',
            },
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
      execution: {
        failure: {
          stepId: 'step-transform',
          reason: 'STEP_FAILURE',
          message: 'duplicate key value violates unique constraint',
          failedAt: '2026-04-08T00:00:20.000Z',
        },
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
          config: {
            schema: 'raw',
            table: 'orders',
            alias: 'orders',
          },
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
          config: {
            dialect: 'postgres',
          },
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
          config: {
            schema: 'analytics',
            table: 'orders_dashboard',
            materialization: 'table',
            writeMode: 'replace',
          },
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

  cy.intercept('POST', '**/workspace/files/pipelines%2Fsales_pipeline.yaml*', (req) => {
    expect(req.body.content).to.contain('executionTarget: "postgres"');
    expect(req.body.content).to.contain('type: "source"');
    expect(req.body.content).to.contain('type: "sql_transform"');
    expect(req.body.content).to.contain('type: "sink"');
    expect(req.body.content).to.contain('schema: "raw"');
    expect(req.body.content).to.contain('table: "orders_dashboard"');
    expect(req.body.content).to.contain('entrypoint: "models/analytics/model_orders.sql"');
    req.reply({
      statusCode: 200,
      body: {
        path: 'pipelines/sales_pipeline.yaml',
        name: 'sales_pipeline.yaml',
        language: 'yaml',
        content: req.body.content,
        lastModified: '2026-04-08T00:00:00.000Z',
      },
    });
  }).as('saveGraphArtifact');

  cy.intercept('GET', '**/workspace/files/models%2Fanalytics%2Fmodel_orders.sql*', {
    statusCode: 200,
    body: {
      path: 'models/analytics/model_orders.sql',
      name: 'model_orders.sql',
      language: 'sql',
      content: ['select *', 'from raw.orders'].join('\n'),
      lastModified: '2026-04-08T00:00:00.000Z',
    },
  }).as('getSqlArtifact');
}

function stubPlanPreviewResponse({ persistedSha, planRefSha }: PlanPreviewResponseOptions): void {
  cy.intercept('POST', '**/plans/preview', (req) => {
    expect(req.body.persist).to.equal(true);
    expect(req.body.previewProfile).to.equal('transformation-sql-first-v1');
    expect(req.body.selectedNodeIds).to.deep.equal([
      'src_orders',
      'model_orders',
      'orders_dashboard',
    ]);
    expect(req.body.graphSource).to.include({
      kind: 'generic-graph-v1',
      sourceFamily: 'transformation-design-graph',
      sourceVersion: 'transformation-sql-first-v1',
    });
    expect(req.body.provenance.graphArtifact).to.deep.include({
      repo: 'dunay2/dvt',
      path: 'pipelines/sales_pipeline.yaml',
      ref: 'refs/heads/main',
      commitSha: 'local',
    });
    expect(req.body.provenance.graphArtifact.contentSha256).to.match(/^[0-9a-f]{64}$/);
    expect(req.body.provenance.sqlArtifact).to.deep.include({
      repo: 'dunay2/dvt',
      path: 'models/analytics/model_orders.sql',
      ref: 'refs/heads/main',
      commitSha: 'local',
    });
    expect(req.body.provenance.sqlArtifact.contentSha256).to.match(/^[0-9a-f]{64}$/);

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
    cy.wait('@saveGraphArtifact');
    cy.wait('@getSqlArtifact');
    cy.wait('@previewPlan');

    cy.contains('Execution Plan Preview').should('be.visible');
    cy.contains('Preview is current and ready to run.').should('be.visible');
    cy.contains('button', 'Start Run').should('be.enabled').click({ force: true });

    cy.wait('@startRun');
    cy.location('pathname').should('eq', '/runs/run_e2e_1');

    cy.contains('Run run_e2e_1').should('exist');
    cy.contains('Materialization evidence').should('not.exist');
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
    cy.wait('@saveGraphArtifact');
    cy.wait('@getSqlArtifact');
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

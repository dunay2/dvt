import { canvasViewCopy } from '../../../src/app/views/canvas/canvasCopyCatalog';
import { stubCanvasDraftRead } from '../../support/canvasDraftAuthoring';
import {
  clickButtonNatively,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import {
  stubSelectedClosurePreviewArtifacts,
  waitForSelectedClosurePreviewArtifacts,
} from '../../support/canvasPreviewArtifacts';
import {
  getE2eApiCalls,
  getLastE2eApiCall,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import { stubShellBootstrapApis, visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

type PlanPreviewResponseOptions = {
  planRecordId: string;
  persistedSha: string;
  planRefSha: string;
};

type CanvasRuntimeApiOptions = {
  includeLooseNode?: boolean;
  canvasKind?: 'transformation' | 'dbt';
  emptyCanvas?: boolean;
  title?: string;
};

type PlanRejectedCause =
  | 'dependency_gap'
  | 'selected_node_missing'
  | 'cycle_detected'
  | 'graph_source_selection_mismatch';

type PreviewPlanRequest = {
  persist: boolean;
  previewProfile: string;
  selection: { mode: string; nodeIds: string[] };
  graphSource: {
    kind: string;
    sourceFamily: string;
    sourceVersion: string;
    nodes: Array<{ nodeId: string }>;
  };
  provenance: {
    graphArtifact: {
      repo: string;
      path: string;
      ref: string;
      commitSha: string;
      contentSha256: string;
    };
    sqlArtifact: {
      repo: string;
      path: string;
      ref: string;
      commitSha: string;
      contentSha256: string;
    };
  };
};

type StartRunRequest = {
  planRef: { sha256: string; planVersion?: string };
  selection: { mode: string; nodeIds: string[] };
};

const PLAN_REJECTION_MESSAGES: Record<PlanRejectedCause, string> = {
  dependency_gap:
    'Selected closure is missing required upstream dependencies. Adjust the selection and re-run Plan.',
  selected_node_missing:
    'Selected nodes are no longer available in the authoritative draft. Refresh the canvas and re-run Plan.',
  cycle_detected:
    'Selected closure contains a cycle and cannot be executed. Remove the cycle and re-run Plan.',
  graph_source_selection_mismatch:
    'Selected scope no longer matches the authoritative draft. Re-run Plan.',
};

function visitCanvasWithSettledBootstrap(): void {
  visitWithE2eWorkspaceSession('/canvas');
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/readyz', 'GET');
  waitForE2eApiCall('/version', 'GET');
  waitForE2eApiCall('/db/ready', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  cy.get('body').should(($body) => {
    const screen = $body.find('#app-loading-screen');
    if (screen.length === 0) {
      return;
    }

    expect(screen.attr('data-state')).to.equal('complete');
  });
}

function stubRunWorkspaceApis(runId = 'run_e2e_1'): void {
  stubE2eJsonApi('GET', '/runs', {
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
  });

  stubE2eJsonApi('GET', `/runs/${runId}`, {
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
  });

  stubE2eJsonApi('GET', `/runs/${runId}/events`, {
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
  });
}

function stubCanvasRuntimeApis(options: CanvasRuntimeApiOptions = {}): void {
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: {
      dbt: { available: true },
      dvt: { available: true },
    },
  });
  stubCanvasDraftRead(options);
}

function assertPreviewPlanRequest(): void {
  cy.then(() => {
    const previewCall = getLastE2eApiCall('/plans/preview', 'POST');
    const previewBody = previewCall?.body as PreviewPlanRequest | null | undefined;

    expect(previewBody).to.not.equal(undefined);
    expect(previewBody?.persist).to.equal(true);
    expect(previewBody?.previewProfile).to.equal('transformation-sql-first-v1');
    expect(previewBody?.selection).to.deep.equal({
      mode: 'explicit',
      nodeIds: ['src_orders', 'model_orders', 'orders_dashboard'],
    });
    expect(previewBody?.graphSource.nodes).to.have.length(3);
    expect(previewBody?.graphSource.nodes.map((node) => node.nodeId)).to.deep.equal([
      'src_orders',
      'model_orders',
      'orders_dashboard',
    ]);
    expect(previewBody?.graphSource).to.include({
      kind: 'generic-graph-v1',
      sourceFamily: 'transformation-design-graph',
      sourceVersion: 'transformation-sql-first-v1',
    });
    expect(previewBody?.provenance.graphArtifact).to.deep.include({
      repo: 'dunay2/dvt',
      path: 'pipelines/sales_pipeline.yaml',
      ref: 'refs/heads/main',
      commitSha: 'local',
    });
    expect(previewBody?.provenance.graphArtifact.contentSha256).to.match(/^[0-9a-f]{64}$/);
    expect(previewBody?.provenance.sqlArtifact).to.deep.include({
      repo: 'dunay2/dvt',
      path: 'models/analytics/model_orders.sql',
      ref: 'refs/heads/main',
      commitSha: 'local',
    });
    expect(previewBody?.provenance.sqlArtifact.contentSha256).to.match(/^[0-9a-f]{64}$/);
  });
}

function assertRunStartSelection(expectedSha: string): void {
  cy.then(() => {
    const startRunCall = getLastE2eApiCall('/runs/start', 'POST');
    const startRunBody = startRunCall?.body as StartRunRequest | null | undefined;

    expect(startRunBody).to.not.equal(undefined);
    expect(startRunBody?.planRef.sha256).to.equal(expectedSha);
    expect(startRunBody?.selection).to.deep.equal({
      mode: 'explicit',
      nodeIds: ['src_orders', 'model_orders', 'orders_dashboard'],
    });
  });
}

function stubPlanPreviewResponse({
  planRecordId,
  persistedSha,
  planRefSha,
}: PlanPreviewResponseOptions): void {
  const planId = 'b'.repeat(64);

  stubE2eJsonApi('POST', '/plans/preview', {
    previewProfile: 'transformation-sql-first-v1',
    plan: {
      metadata: {
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: 'a'.repeat(64),
        planId,
        createdAtIso: '2026-04-08T00:00:00.000Z',
      },
      steps: [
        {
          stepId: 'src_orders',
          kind: 'PREPARE_POSTGRES_TRANSFORM',
          dependsOn: [],
          stepTypeConfig: {
            targetSchema: 'analytics',
            sourceSchema: 'raw',
            sourceTable: 'orders',
            sourceAlias: 'orders_src',
          },
        },
        {
          stepId: 'model_orders',
          kind: 'POSTGRES_SQL_TRANSFORM',
          dependsOn: ['src_orders'],
          stepTypeConfig: {
            dialect: 'postgres',
            entrypoint: 'models/analytics/model_orders.sql',
            sql: 'select * from raw.orders',
            sqlArtifact: {
              repo: 'dunay2/dvt',
              path: 'models/analytics/model_orders.sql',
              ref: 'refs/heads/main',
              commitSha: 'local',
              contentSha256: 'a'.repeat(64),
            },
            sourceSchema: 'raw',
            sourceTable: 'orders',
            sourceAlias: 'orders_src',
            sinkSchema: 'analytics',
            sinkTable: 'orders_daily',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
        {
          stepId: 'orders_dashboard',
          kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
          dependsOn: ['model_orders'],
          stepTypeConfig: {
            sinkSchema: 'analytics',
            sinkTable: 'orders_daily',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      ],
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
      planId,
      planVersion: 'v1',
    },
    planSummary: {
      executor: 'postgres',
      nodeCount: 3,
      stepCount: 3,
      sourceTables: ['raw.orders'],
      sinkTables: ['analytics.orders_daily'],
    },
    persisted: {
      planRecordId,
      canonicalPlanSha256: persistedSha,
    },
    validation: {
      valid: true,
      warnings: [],
    },
    provenance: {
      graphArtifact: {
        repo: 'dunay2/dvt',
        path: 'pipelines/sales_pipeline.yaml',
        ref: 'refs/heads/main',
        commitSha: 'local',
        contentSha256: 'f'.repeat(64),
      },
      sqlArtifact: {
        repo: 'dunay2/dvt',
        path: 'models/analytics/model_orders.sql',
        ref: 'refs/heads/main',
        commitSha: 'local',
        contentSha256: 'a'.repeat(64),
      },
    },
  });
}

function stubPlanRejectedPreview(cause: Exclude<PlanRejectedCause, 'graph_source_selection_mismatch'>): void {
  stubE2eJsonApi(
    'POST',
    '/plans/preview',
    {
      error: {
        type: 'runtime',
        reason: 'plan_rejected',
        details: {
          cause,
          rejectionReason: PLAN_REJECTION_MESSAGES[cause],
        },
      },
    },
    { statusCode: 409 }
  );
}

function stubPlanRejectedStartRun(cause: Extract<PlanRejectedCause, 'graph_source_selection_mismatch'>): void {
  stubE2eJsonApi(
    'POST',
    '/runs/start',
    {
      error: {
        type: 'runtime',
        reason: 'plan_rejected',
        details: {
          cause,
          rejectionReason: PLAN_REJECTION_MESSAGES[cause],
        },
      },
    },
    { statusCode: 409 }
  );
}

describe('Canvas preview-run persisted path', () => {
  beforeEach(() => {
    stubShellBootstrapApis();
    stubSelectedClosurePreviewArtifacts();
  });

  it('keeps dbt first-node authoring visible while execution actions stay unavailable', () => {
    stubCanvasRuntimeApis({
      canvasKind: 'dbt',
      emptyCanvas: true,
      title: 'Warehouse dbt',
    });

    visitCanvasWithSettledBootstrap();

    cy.contains('Warehouse dbt').should('be.visible');
    cy.contains('Start dbt canvas').should('be.visible');
    cy.contains('Add first dbt node').should('be.visible');
    cy.contains('button', 'Source').should('be.enabled');
    cy.contains('button', 'Plan').should('be.disabled');
    cy.contains('button', 'Run').should('be.disabled');
    cy.then(() => {
      expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });

  for (const cause of [
    'dependency_gap',
    'selected_node_missing',
    'cycle_detected',
  ] as const satisfies ReadonlyArray<Exclude<PlanRejectedCause, 'graph_source_selection_mismatch'>>) {
    it(`surfaces ${cause} as explicit re-plan guidance during preview`, () => {
      stubCanvasRuntimeApis({ includeLooseNode: true });
      stubPlanRejectedPreview(cause);

      visitCanvasWithSettledBootstrap();

      selectCanvasClosure(['src_orders', 'model_orders', 'orders_dashboard']);

      cy.contains('button', 'Plan').should('be.enabled').click();
      waitForSelectedClosurePreviewArtifacts();
      waitForE2eApiCall('/plans/preview', 'POST');
      assertPreviewPlanRequest();

      cy.contains(PLAN_REJECTION_MESSAGES[cause]).should('be.visible');
      cy.contains('Execution Plan Preview').should('not.exist');
      cy.location('pathname').should('eq', '/canvas');
      cy.then(() => {
        expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      });
    });
  }

  it('keeps preview and run scoped to the selected closure inside a larger canvas', () => {
    stubCanvasRuntimeApis({ includeLooseNode: true });
    stubRunWorkspaceApis('run_e2e_selected_1');
    stubPlanPreviewResponse({
      planRecordId: 'b'.repeat(64),
      persistedSha: 'e'.repeat(64),
      planRefSha: 'f'.repeat(64),
    });
    stubE2eJsonApi('POST', '/runs/start', {
      runId: 'run_e2e_selected_1',
      accepted: true,
    });

    visitCanvasWithSettledBootstrap();

    cy.contains('.react-flow__node', 'src_orders').should('be.visible');
    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.contains('.react-flow__node', 'orders_dashboard').should('be.visible');
    cy.contains('.react-flow__node', 'orphan_metrics').should('be.visible');

    selectCanvasClosure(['src_orders', 'model_orders', 'orders_dashboard']);

    cy.contains('button', 'Plan').should('be.enabled').click();
    waitForSelectedClosurePreviewArtifacts();
    waitForE2eApiCall('/plans/preview', 'POST');
    assertPreviewPlanRequest();

    cy.contains('Execution Plan Preview').should('be.visible');
    cy.contains('Persisted Preview Summary').should('be.visible');
    cy.contains('Nodes:').parent().should('contain.text', '3');
    cy.contains('Source tables:').parent().should('contain.text', 'raw.orders');
    cy.contains('Sink tables:').parent().should('contain.text', 'analytics.orders_daily');
    clickButtonNatively('Start Run');

    waitForE2eApiCall('/runs/start', 'POST');
    assertRunStartSelection('f'.repeat(64));
    cy.location('pathname').should('eq', '/runs/run_e2e_selected_1');
    cy.contains('Run run_e2e_selected_1').should('exist');
  });

  it('starts run when persisted preview identity matches the active plan', () => {
    stubCanvasRuntimeApis();
    stubRunWorkspaceApis('run_e2e_1');
    stubPlanPreviewResponse({
      planRecordId: 'b'.repeat(64),
      persistedSha: 'c'.repeat(64),
      planRefSha: 'd'.repeat(64),
    });
    stubE2eJsonApi('POST', '/runs/start', {
      runId: 'run_e2e_1',
      accepted: true,
    });

    visitCanvasWithSettledBootstrap();
    cy.contains('.react-flow__node', 'src_orders').should('be.visible');
    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.contains('.react-flow__node', 'orders_dashboard').should('be.visible');

    cy.contains('button', 'Plan').should('be.enabled').click();
    waitForSelectedClosurePreviewArtifacts();
    waitForE2eApiCall('/plans/preview', 'POST');
    assertPreviewPlanRequest();

    cy.contains('Execution Plan Preview').should('be.visible');
    cy.contains(canvasViewCopy.planStatusPreviewReadyMessage).should('be.visible');
    clickButtonNatively('Start Run');

    waitForE2eApiCall('/runs/start', 'POST');
    assertRunStartSelection('d'.repeat(64));
    cy.then(() => {
      const startRunBody = getLastE2eApiCall('/runs/start', 'POST')?.body as
        | StartRunRequest
        | undefined;
      expect(startRunBody?.planRef.planVersion).to.equal('v1');
    });
    cy.location('pathname').should('eq', '/runs/run_e2e_1');

    cy.contains('Run run_e2e_1').should('exist');
    cy.contains('Materialization evidence').should('not.exist');
    cy.contains('Failure diagnostics').should('exist');
    cy.contains('STEP_FAILURE').should('exist');
  });

  it('blocks run when persisted preview identity is not aligned with the active plan', () => {
    stubCanvasRuntimeApis();
    stubPlanPreviewResponse({
      planRecordId: 'plan-record-mismatch',
      persistedSha: 'd'.repeat(64),
      planRefSha: 'c'.repeat(64),
    });
    stubE2eJsonApi('POST', '/runs/start', {
      message: 'should not be called',
    }, { statusCode: 500 });

    visitCanvasWithSettledBootstrap();
    cy.contains('.react-flow__node', 'src_orders').should('be.visible');
    cy.contains('.react-flow__node', 'model_orders').should('be.visible');
    cy.contains('.react-flow__node', 'orders_dashboard').should('be.visible');

    cy.contains('button', 'Plan').should('be.enabled').click();
    waitForSelectedClosurePreviewArtifacts();
    waitForE2eApiCall('/plans/preview', 'POST');
    assertPreviewPlanRequest();

    cy.contains('Execution Plan Preview').should('be.visible');
    cy.contains(canvasViewCopy.planStatusPreviewNotAlignedMessage).should('be.visible');
    cy.contains('button', 'Run').should('be.disabled');
    cy.contains('button', 'Start Run').should('be.disabled');
    cy.then(() => {
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });

  it('surfaces graph_source_selection_mismatch from protected start-run as explicit re-plan guidance', () => {
    stubCanvasRuntimeApis({ includeLooseNode: true });
    stubPlanPreviewResponse({
      planRecordId: 'b'.repeat(64),
      persistedSha: 'f'.repeat(64),
      planRefSha: '0'.repeat(64),
    });
    stubPlanRejectedStartRun('graph_source_selection_mismatch');

    visitCanvasWithSettledBootstrap();

    selectCanvasClosure(['src_orders', 'model_orders', 'orders_dashboard']);

    cy.contains('button', 'Plan').should('be.enabled').click();
    waitForSelectedClosurePreviewArtifacts();
    waitForE2eApiCall('/plans/preview', 'POST');
    assertPreviewPlanRequest();

    cy.contains('Execution Plan Preview').should('be.visible');
    clickButtonNatively('Start Run');

    waitForE2eApiCall('/runs/start', 'POST');
    assertRunStartSelection('0'.repeat(64));
    cy.contains(PLAN_REJECTION_MESSAGES.graph_source_selection_mismatch).should('exist');
    cy.location('pathname').should('eq', '/canvas');
    cy.contains('Execution Plan Preview').should('be.visible');
  });
});

import type { TransformationSqlFirstPlanPreviewPersistResponse } from '@dvt/contracts';

import { stubStatefulCanvasDraftAuthoring } from '../canvasDraftAuthoring';
import { stubSelectedClosurePreviewArtifacts } from '../canvasPreviewArtifacts';
import { getLastE2eApiCall, stubE2eApi, stubE2eJsonApi, waitForE2eApiCall } from '../e2eApiStub';
import {
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../workspaceSession';

type PlanPreviewResponseOptions = {
  planRecordId: string;
  persistedSha: string;
  planRefSha: string;
};

type PlanPreviewResponse = TransformationSqlFirstPlanPreviewPersistResponse;

type CanvasRuntimeApiOptions = {
  includeLooseNode?: boolean;
  canvasKind?: 'transformation' | 'dbt';
  emptyCanvas?: boolean;
  title?: string;
  skipDraftRead?: boolean;
  sourceImportAvailable?: boolean;
};

type PlanRejectedCause =
  'dependency_gap' | 'selected_node_missing' | 'cycle_detected' | 'graph_source_selection_mismatch';

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

export const PLAN_REJECTION_MESSAGES: Record<PlanRejectedCause, string> = {
  dependency_gap:
    'Selected closure is missing required upstream dependencies. Adjust the selection and preview execution plan again.',
  selected_node_missing:
    'Selected nodes are no longer available in the authoritative draft. Refresh the canvas and preview execution plan again.',
  cycle_detected:
    'Selected closure contains a cycle and cannot be executed. Remove the cycle and preview execution plan again.',
  graph_source_selection_mismatch:
    'Selected scope no longer matches the authoritative draft. Preview execution plan again.',
};

export function stubPreviewRunShellBootstrap(): void {
  stubShellBootstrapApis({
    scopes: [
      'workspace:graph-draft:view',
      'workspace:graph-draft:save',
      'workspace:files:save',
      'workspace:files:view',
      'plan:preview',
      'run:start',
    ],
  });
  stubSelectedClosurePreviewArtifacts();
}

export function visitCanvasWithSettledBootstrap(): void {
  visitWithE2eWorkspaceSession('/canvas');
  waitForE2eApiCall('/healthz', 'GET');
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

export function stubRunWorkspaceApis(runId = 'run_e2e_1'): void {
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
            artifactKind: 'compiled-sql',
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
  });
}

export function stubCanvasRuntimeApis(options: CanvasRuntimeApiOptions = {}): void {
  const plugins: Record<string, { available: boolean; reason?: string }> = {
    dbt: { available: true },
    dvt: { available: true },
  };
  if (options.sourceImportAvailable === true) {
    plugins['dvt.warehouse-source'] = { available: true };
  }

  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins,
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    effectiveWorkspace: E2E_WORKSPACE_SESSION,
    availableWorkspaces: [E2E_WORKSPACE_SESSION],
  });
  if (options.skipDraftRead !== true) {
    stubStatefulCanvasDraftAuthoring(options);
  }
}

export function assertPreviewPlanRequest(): void {
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

export function assertRunStartSelection(expectedSha: string): void {
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

export function getLastStartRunRequest(): StartRunRequest | null {
  return getLastE2eApiCall('/runs/start', 'POST')?.body as StartRunRequest | null;
}

export function stubPlanPreviewResponse({
  planRecordId,
  persistedSha,
  planRefSha,
}: PlanPreviewResponseOptions): void {
  stubE2eJsonApi(
    'POST',
    '/plans/preview',
    buildPlanPreviewResponse({ planRecordId, persistedSha, planRefSha })
  );
}

function buildPlanPreviewResponse({
  planRecordId,
  persistedSha,
  planRefSha,
}: PlanPreviewResponseOptions): PlanPreviewResponse {
  const planId = 'b'.repeat(64);

  return {
    previewProfile: 'transformation-sql-first-v1',
    plan: {
      metadata: {
        planVersion: '1.0',
        schemaVersion: '1.0',
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
      schemaVersion: '1.0',
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
      kind: 'transformation-git-artifacts',
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
  } as const;
}

export function stubSelectionRejectedPreview(
  cause: Exclude<PlanRejectedCause, 'graph_source_selection_mismatch'>
): string {
  const reasonByCause: Record<
    Exclude<PlanRejectedCause, 'graph_source_selection_mismatch'>,
    string
  > = {
    dependency_gap: 'Selected closure is missing required upstream dependencies.',
    selected_node_missing: 'Selected nodes are no longer available in the authoritative draft.',
    cycle_detected: 'Selected closure contains a cycle and cannot be executed.',
  };
  const reason = reasonByCause[cause];

  stubE2eJsonApi(
    'POST',
    '/plans/preview',
    {
      error: {
        type: 'unprocessable',
        reason: 'plan_rejected',
        details: {
          contractVersion: '1.0.0',
          kind: 'selection-rejected',
          rejection: {
            code: 'REJECTED',
            cause,
            reason,
          },
        },
      },
    },
    { statusCode: 422 }
  );

  return reason;
}

export function stubPlanInvalidPreview(options: PlanPreviewResponseOptions): PlanPreviewResponse {
  const preview = buildPlanPreviewResponse(options);
  const validation = {
    status: 'ERROR',
    code: 'MISSING_CAPABILITY',
    planId: preview.planRef.planId,
    adapterId: 'temporal',
    degradable: false,
    cause: 'executor.dbt',
    reason: 'The selected runtime cannot execute dbt steps.',
  } as const;

  stubE2eJsonApi(
    'POST',
    '/plans/preview',
    {
      error: {
        type: 'unprocessable',
        reason: 'plan_rejected',
        details: {
          contractVersion: '1.0.0',
          kind: 'plan-invalid',
          ...preview,
          validation,
        },
      },
    },
    { statusCode: 422 }
  );

  return preview;
}

export function stubPlanRejectedStartRun(
  cause: Extract<PlanRejectedCause, 'graph_source_selection_mismatch'>
): void {
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

export function stubAcceptedRunStart(runId: string): void {
  stubE2eJsonApi('POST', '/runs/start', {
    runId,
    accepted: true,
  });
}

export function stubSequentialRunStart(): void {
  let startRunCount = 0;
  stubE2eApi('POST', '/runs/start', () => {
    startRunCount += 1;
    return {
      body: {
        runId: `run_e2e_${startRunCount}`,
        accepted: true,
      },
    };
  });
}

export function stubUnexpectedRunStart(): void {
  stubE2eJsonApi(
    'POST',
    '/runs/start',
    {
      message: 'should not be called',
    },
    { statusCode: 500 }
  );
}

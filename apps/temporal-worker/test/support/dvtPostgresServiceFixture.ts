import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY,
  DvtPostgresPublicationEvidenceSchema,
  RUN_PLAN_WORKFLOW,
  parseRunExecutionContext,
  parseRunExecutionContextRef,
  type RunExecutionContextRef,
} from '@dvt/contracts';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Client } from 'pg';

import { runTemporalWorkerHost } from '../../src/host/runTemporalWorkerHost.js';
import { createOperationalServer } from '../../src/ops/OperationalServer.js';
import { TemporalWorkerMonitor } from '../../src/ops/TemporalWorkerMonitor.js';
import { loadEnv } from '../../src/plugins/env.js';

import { createDvtPostgresExecutionPlan, digest } from './dvtPostgresPlanFixture.js';
import {
  bootstrapRunMetadata,
  storeValidPlanArtifact,
  waitForRunCompleted,
} from './temporalWorkerServiceTestSupport.js';

type PublicationEvidence = ReturnType<typeof DvtPostgresPublicationEvidenceSchema.parse>;

export interface DvtPostgresServiceResult {
  readonly evidence: PublicationEvidence;
  readonly rows: readonly { order_id: string; status: string }[];
}

export async function executeDvtPostgresServiceVertical(): Promise<DvtPostgresServiceResult> {
  const connectionString =
    process.env['DVT_PG_URL'] ??
    process.env['DATABASE_URL'] ??
    'postgresql://dvt:dvt@localhost:5432/dvt';
  const temporalAddress = process.env['DVT_HET1_TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
  const suffix = `${process.pid}_${Date.now()}`;
  const relation = `dvt_orders_${suffix}`.slice(0, 63);
  const taskQueue = `dvt-postgres-${suffix}`;
  const runId = `run-dvt-postgres-${suffix}`;
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'dvt-postgres-service-'));
  const artifactRoot = join(workspaceRoot, '.dvt', 'run-context-artifacts');
  const postgres = new Client({ connectionString });
  const shutdown = new globalThis.AbortController();
  let temporal: TestWorkflowEnvironment | undefined;
  let workerRun: Promise<void> | undefined;

  try {
    await mkdir(artifactRoot, { recursive: true });
    const sqlBytes = Buffer.from("SELECT 7::bigint AS order_id, 'ready'::text AS status", 'utf8');
    const sqlPath = join(artifactRoot, 'compiled.sql');
    await writeFile(sqlPath, sqlBytes);
    const plan = createDvtPostgresExecutionPlan({
      tenantId: 'tenant-dvt-service',
      projectId: 'project-dvt-service',
      environmentId: 'test',
      relation,
      sqlArtifact: {
        storageUri: pathToFileURL(sqlPath).href,
        sha256: digest(sqlBytes),
        sizeBytes: sqlBytes.byteLength,
      },
    });
    const planRef = await storeValidPlanArtifact({
      connectionString,
      schema: 'dvt',
      plan,
      tenantId: 'tenant-dvt-service',
      projectId: 'project-dvt-service',
      environmentId: 'test',
    });
    const runContextRef = await writeRunContextArtifact({
      artifactRoot,
      planRef,
      publicationToken: digest(`publication:${runId}`),
    });
    await bootstrapRunMetadata({
      connectionString,
      schema: 'dvt',
      tenantId: 'tenant-dvt-service',
      projectId: 'project-dvt-service',
      environmentId: 'test',
      namespace: 'default',
      taskQueue,
      runId,
      planRef,
    });

    temporal = await TestWorkflowEnvironment.createFromExistingServer({
      address: temporalAddress,
      namespace: 'default',
    });
    const env = loadEnv({
      NODE_ENV: 'development',
      LOG_LEVEL: 'silent',
      DATABASE_URL: connectionString,
      DVT_PG_SCHEMA: 'dvt',
      DVT_TEMPORAL_WORKER_RUN_MIGRATIONS: 'true',
      TEMPORAL_ADDRESS: temporal.address,
      TEMPORAL_NAMESPACE: 'default',
      TEMPORAL_TASK_QUEUE: taskQueue,
      DVT_TEMPORAL_ADMIN_HOST: '127.0.0.1',
      DVT_TEMPORAL_ADMIN_PORT: String(9800 + Math.floor(Math.random() * 100)),
      DVT_TEMPORAL_DVT_POSTGRES_ENABLED: 'true',
      DVT_POSTGRES_CREDENTIAL_BINDINGS: JSON.stringify({
        'postgres:warehouse-a': connectionString,
      }),
      DVT_WORKSPACE_FILES_ROOT: workspaceRoot,
    });
    const monitor = new TemporalWorkerMonitor({
      serviceName: env.SERVICE_NAME,
      logger: { info() {}, error() {} },
      enabledCapabilities: [DVT_POSTGRES_OPERATIONAL_WORKLOAD_REQUIRED_CAPABILITY],
    });
    workerRun = runTemporalWorkerHost({
      env,
      logger: { info() {}, error() {} },
      monitor,
      operationalServer: createOperationalServer({
        host: env.DVT_TEMPORAL_ADMIN_HOST,
        port: env.DVT_TEMPORAL_ADMIN_PORT,
        logger: { info() {} },
        monitor,
      }),
      shutdownSignal: shutdown.signal,
    });
    await waitUntilReady(env.DVT_TEMPORAL_ADMIN_PORT);

    await postgres.connect();
    const evidence = await executeWorkflow({
      temporal,
      connectionString,
      taskQueue,
      runId,
      planRef,
      runContextRef,
    });
    const rows = await postgres.query<{ order_id: string; status: string }>(
      `SELECT order_id::text, status FROM public."${relation}" ORDER BY order_id`
    );
    return { evidence, rows: rows.rows };
  } finally {
    shutdown.abort();
    await workerRun;
    await temporal?.teardown();
    await postgres.query(`DROP TABLE IF EXISTS public."${relation}"`).catch(() => undefined);
    await postgres.end().catch(() => undefined);
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}

async function writeRunContextArtifact(args: {
  artifactRoot: string;
  planRef: Awaited<ReturnType<typeof storeValidPlanArtifact>>;
  publicationToken: string;
}): Promise<RunExecutionContextRef> {
  const context = parseRunExecutionContext({
    schemaVersion: 'v1.0',
    planId: args.planRef.planId,
    planVersion: args.planRef.planVersion,
    planSha256: args.planRef.sha256,
    tenantId: 'tenant-dvt-service',
    projectId: 'project-dvt-service',
    environmentId: 'test',
    targetAdapter: 'temporal',
    createdAtIso: '2026-09-15T12:00:00.000Z',
    createdBy: 'service-test',
    pluginContexts: {
      'dvt-postgres': {
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-a',
          provider: 'postgres',
        },
        credentialRef: 'postgres:warehouse-a',
        publicationToken: args.publicationToken,
        expectedPredecessorToken: 'absent',
      },
    },
  });
  const bytes = Buffer.from(JSON.stringify(context), 'utf8');
  const path = join(args.artifactRoot, 'run-context.json');
  await writeFile(path, bytes);
  return parseRunExecutionContextRef({
    uri: pathToFileURL(path).href,
    sha256: digest(bytes),
    schemaVersion: context.schemaVersion,
    planId: context.planId,
    planVersion: context.planVersion,
  });
}

async function executeWorkflow(args: {
  temporal: TestWorkflowEnvironment;
  connectionString: string;
  taskQueue: string;
  runId: string;
  planRef: Awaited<ReturnType<typeof storeValidPlanArtifact>>;
  runContextRef: Awaited<ReturnType<typeof writeRunContextArtifact>>;
}): Promise<PublicationEvidence> {
  const handle = await args.temporal.client.workflow.start(RUN_PLAN_WORKFLOW, {
    taskQueue: args.taskQueue,
    workflowId: args.runId,
    args: [
      {
        planRef: args.planRef,
        ctx: {
          tenantId: 'tenant-dvt-service',
          projectId: 'project-dvt-service',
          environmentId: 'test',
          runId: args.runId,
          targetAdapter: 'temporal',
          logicalAttemptId: 1,
          originRunId: args.runId,
          runExecutionContextRef: args.runContextRef,
        },
        maxContinueAsNewPayloadBytes: 500_000,
        continueAsNewAfterLayerCount: 100,
      },
    ],
  });
  await handle.result();
  const events = await waitForRunCompleted({
    connectionString: args.connectionString,
    schema: 'dvt',
    tenantId: 'tenant-dvt-service',
    runId: args.runId,
  });
  const completed = events.find(
    (event) => event.eventType === 'StepCompleted' && event.stepId === 'transform-orders'
  );
  return DvtPostgresPublicationEvidenceSchema.parse(completed?.payload?.['resultEvidence']);
}

async function waitUntilReady(port: number): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= 60_000) {
    const response = await globalThis
      .fetch(`http://127.0.0.1:${port}/readyz`)
      .catch(() => undefined);
    if (response?.status === 200) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('DVT PostgreSQL worker did not become ready before timeout.');
}

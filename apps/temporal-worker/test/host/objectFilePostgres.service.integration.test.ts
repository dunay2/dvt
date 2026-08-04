import { createHash } from 'node:crypto';

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY,
  LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
  MaterializationEvidenceSchema,
  parseExecutionPlan,
  RUN_PLAN_WORKFLOW,
  type ExecutionPlan,
  type PlanRef,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

import { runTemporalWorkerHost } from '../../src/host/runTemporalWorkerHost.js';
import { createOperationalServer } from '../../src/ops/OperationalServer.js';
import { TemporalWorkerMonitor } from '../../src/ops/TemporalWorkerMonitor.js';
import { loadEnv } from '../../src/plugins/env.js';
import {
  bootstrapRunMetadata,
  storeValidPlanArtifact,
  waitForRunCompleted,
} from '../support/temporalWorkerServiceTestSupport.js';

const describeIfServices =
  process.env['DVT_HET1_SERVICE_INTEGRATION'] === '1' ? describe : describe.skip;

describeIfServices('object-file PostgreSQL worker vertical', () => {
  it('reads a content-addressed MinIO object and replaces PostgreSQL rows idempotently', async () => {
    const connectionString =
      process.env['DVT_PG_URL'] ??
      process.env['DATABASE_URL'] ??
      'postgresql://dvt:dvt@localhost:5432/dvt';
    const endpoint = process.env['DVT_HET1_MINIO_ENDPOINT'] ?? 'http://127.0.0.1:9000';
    const accessKeyId = process.env['AWS_ACCESS_KEY_ID'] ?? 'minioadmin';
    const secretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'] ?? 'minioadmin';
    const region = process.env['AWS_REGION'] ?? 'us-east-1';
    const temporalAddress = process.env['DVT_HET1_TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233';
    const bucket = process.env['DVT_HET1_MINIO_BUCKET'] ?? 'het1-fixtures';
    const tenantId = 'tenant-het1-service';
    const projectId = 'project-het1-service';
    const environmentId = 'test';
    const namespace = 'default';
    const suffix = `${process.pid}-${Date.now()}`;
    const taskQueue = `dvt-object-file-postgres-${suffix}`;
    const relation = `orders_${suffix.replaceAll('-', '_')}`.slice(0, 63);
    const csvBytes = Buffer.from('order_id,amount,active\n1,10.25,true\n2,,false\n', 'utf8');
    const sha256 = sha256Hex(csvBytes);
    const objectKey = `tenants/${tenantId}/${sha256}`;
    const storageUri = `s3://${bucket}/${objectKey}`;
    const s3 = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
    const postgres = new Client({ connectionString });
    const shutdown = new globalThis.AbortController();
    let temporal: TestWorkflowEnvironment | undefined;
    let workerRun: Promise<void> | undefined;

    try {
      await ensureBucket(s3, bucket);
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: csvBytes,
          ContentType: 'text/csv',
        })
      );
      await postgres.connect();

      const plan = createExecutionPlan({
        tenantId,
        projectId,
        environmentId,
        storageUri,
        sha256,
        sizeBytes: csvBytes.byteLength,
        relation,
      });
      const planRef = await storeValidPlanArtifact({
        connectionString,
        schema: 'dvt',
        plan,
        tenantId,
        projectId,
        environmentId,
      });

      temporal = await TestWorkflowEnvironment.createFromExistingServer({
        address: temporalAddress,
        namespace,
      });
      const env = loadEnv({
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: connectionString,
        DVT_PG_SCHEMA: 'dvt',
        DVT_TEMPORAL_WORKER_RUN_MIGRATIONS: 'true',
        TEMPORAL_ADDRESS: temporal.address,
        TEMPORAL_NAMESPACE: namespace,
        TEMPORAL_TASK_QUEUE: taskQueue,
        DVT_TEMPORAL_ADMIN_HOST: '127.0.0.1',
        DVT_TEMPORAL_ADMIN_PORT: String(9700 + Math.floor(Math.random() * 200)),
        DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED: 'true',
        DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF: 'object-store:het1-source',
        DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF: 'postgres:het1-staging',
        DVT_OBJECT_FILE_S3_ENDPOINT: endpoint,
        DVT_OBJECT_FILE_S3_REGION: region,
        DVT_OBJECT_FILE_S3_FORCE_PATH_STYLE: 'true',
      });
      const monitor = new TemporalWorkerMonitor({
        serviceName: env.SERVICE_NAME,
        logger: { info() {}, error() {} },
        enabledCapabilities: [LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY],
      });
      const operationalServer = createOperationalServer({
        host: env.DVT_TEMPORAL_ADMIN_HOST,
        port: env.DVT_TEMPORAL_ADMIN_PORT,
        logger: { info() {} },
        monitor,
      });
      workerRun = runTemporalWorkerHost({
        env,
        logger: { info() {}, error() {} },
        monitor,
        operationalServer,
        shutdownSignal: shutdown.signal,
      });
      await waitUntilReady(env.DVT_TEMPORAL_ADMIN_PORT);

      const firstEvidence = await executePlan({
        temporal,
        connectionString,
        namespace,
        taskQueue,
        tenantId,
        projectId,
        environmentId,
        planRef,
        runId: `run-object-file-created-${suffix}`,
      });
      expect(firstEvidence).toMatchObject({
        executor: 'postgres',
        sinkTable: `staging.${relation}`,
        rowsWritten: 2,
        publicationOutcome: 'created',
        sourceArtifact: {
          sha256,
          sizeBytes: csvBytes.byteLength,
          mediaType: 'text/csv',
        },
      });

      const secondEvidence = await executePlan({
        temporal,
        connectionString,
        namespace,
        taskQueue,
        tenantId,
        projectId,
        environmentId,
        planRef,
        runId: `run-object-file-replaced-${suffix}`,
      });
      expect(secondEvidence).toMatchObject({
        rowsWritten: 2,
        publicationOutcome: 'replaced',
      });

      const result = await postgres.query<{
        order_id: string;
        amount: string | null;
        active: boolean;
      }>(
        `SELECT order_id::text, amount::text, active FROM "staging"."${relation}" ORDER BY order_id`
      );
      expect(result.rows).toEqual([
        { order_id: '1', amount: '10.25', active: true },
        { order_id: '2', amount: null, active: false },
      ]);
    } finally {
      shutdown.abort();
      await workerRun;
      await temporal?.teardown();
      await postgres.query(`DROP TABLE IF EXISTS "staging"."${relation}"`).catch(() => undefined);
      await postgres.end().catch(() => undefined);
      await s3
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }))
        .catch(() => undefined);
      s3.destroy();
    }
  }, 120_000);
});

async function executePlan(args: {
  temporal: TestWorkflowEnvironment;
  connectionString: string;
  namespace: string;
  taskQueue: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planRef: PlanRef;
  runId: string;
}): Promise<ReturnType<typeof MaterializationEvidenceSchema.parse>> {
  await bootstrapRunMetadata({
    connectionString: args.connectionString,
    schema: 'dvt',
    tenantId: args.tenantId,
    projectId: args.projectId,
    environmentId: args.environmentId,
    namespace: args.namespace,
    taskQueue: args.taskQueue,
    runId: args.runId,
    planRef: args.planRef,
  });
  const handle = await args.temporal.client.workflow.start(RUN_PLAN_WORKFLOW, {
    taskQueue: args.taskQueue,
    workflowId: args.runId,
    args: [
      {
        planRef: args.planRef,
        ctx: {
          tenantId: args.tenantId,
          projectId: args.projectId,
          environmentId: args.environmentId,
          runId: args.runId,
          targetAdapter: 'temporal',
          logicalAttemptId: 1,
          originRunId: args.runId,
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
    tenantId: args.tenantId,
    runId: args.runId,
  });
  const completed = events.find(
    (event) => event.eventType === 'StepCompleted' && event.stepId === 'load-orders'
  );
  return MaterializationEvidenceSchema.parse(completed?.payload?.['resultEvidence']);
}

function createExecutionPlan(args: {
  tenantId: string;
  projectId: string;
  environmentId: string;
  storageUri: string;
  sha256: string;
  sizeBytes: number;
  relation: string;
}): ExecutionPlan {
  const steps = [
    {
      stepId: 'load-orders',
      kind: LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
      dependsOn: [],
      stepTypeConfig: {
        scope: {
          tenantId: args.tenantId,
          projectId: args.projectId,
          environmentId: args.environmentId,
        },
        source: {
          storageUri: args.storageUri,
          sha256: args.sha256,
          sizeBytes: args.sizeBytes,
          maxBytes: 1_000_000,
          format: 'csv',
          mediaType: 'text/csv',
          encoding: 'utf-8',
          header: true,
          delimiter: ',',
          credentialRef: 'object-store:het1-source',
        },
        target: {
          dialect: 'postgres',
          schema: 'staging',
          relation: args.relation,
          loadMode: 'replace',
          credentialRef: 'postgres:het1-staging',
        },
        columns: [
          {
            sourceField: 'order_id',
            targetColumn: 'order_id',
            dataType: 'bigint',
            nullable: false,
          },
          {
            sourceField: 'amount',
            targetColumn: 'amount',
            dataType: 'numeric',
            nullable: true,
          },
          {
            sourceField: 'active',
            targetColumn: 'active',
            dataType: 'boolean',
            nullable: false,
          },
        ],
        stepTimeoutMs: 30_000,
        concurrency: { maxInFlight: 1 },
      },
    },
  ];
  const inputHashSha256 = sha256Hex(`object-file-postgres:${args.sha256}:${args.relation}`);
  const planId = sha256Hex(
    jcsCanonicalize({
      metadata: { planVersion: CURRENT_EXECUTION_PLAN_VERSION, inputHashSha256 },
      steps,
    })
  );

  return parseExecutionPlan({
    metadata: {
      planId,
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
      inputHashSha256,
      createdAtIso: '2026-08-04T00:00:00.000Z',
      ownership: {
        tenantId: args.tenantId,
        projectId: args.projectId,
        environmentId: args.environmentId,
      },
    },
    steps,
  });
}

async function ensureBucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') {
      throw error;
    }
  }
}

async function waitUntilReady(port: number): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= 60_000) {
    const response = await globalThis
      .fetch(`http://127.0.0.1:${port}/readyz`)
      .catch(() => undefined);
    if (response?.status === 200) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Temporal worker did not become ready before timeout.');
}

function sha256Hex(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}

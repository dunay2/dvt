import {
  CreateBucketCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY,
  MaterializationEvidenceSchema,
  RUN_PLAN_WORKFLOW,
  type PlanRef,
} from '@dvt/contracts';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Client } from 'pg';

import { runTemporalWorkerHost } from '../../src/host/runTemporalWorkerHost.js';
import { createOperationalServer } from '../../src/ops/OperationalServer.js';
import { TemporalWorkerMonitor } from '../../src/ops/TemporalWorkerMonitor.js';
import { loadEnv } from '../../src/plugins/env.js';

import {
  createObjectFilePostgresExecutionPlan,
  sha256Hex,
} from './objectFilePostgresPlanFixture.js';
import {
  bootstrapRunMetadata,
  storeValidPlanArtifact,
  waitForRunCompleted,
} from './temporalWorkerServiceTestSupport.js';

type MaterializationEvidence = ReturnType<typeof MaterializationEvidenceSchema.parse>;

export interface ObjectFilePostgresServiceFixture {
  readonly relation: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  execute(runLabel: string): Promise<MaterializationEvidence>;
  readRows(): Promise<readonly ObjectFilePostgresResultRow[]>;
}

export interface ObjectFilePostgresResultRow {
  readonly order_id: string;
  readonly amount: string | null;
  readonly active: boolean;
}

export async function withObjectFilePostgresServiceFixture(
  verify: (fixture: ObjectFilePostgresServiceFixture) => Promise<void>
): Promise<void> {
  const config = resolveServiceConfig();
  const suffix = `${process.pid}-${Date.now()}`;
  const taskQueue = `dvt-object-file-postgres-${suffix}`;
  const relation = `orders_${suffix.replaceAll('-', '_')}`.slice(0, 63);
  const csvBytes = Buffer.from('order_id,amount,active\n1,10.25,true\n2,,false\n', 'utf8');
  const sha256 = sha256Hex(csvBytes);
  const objectKey = `tenants/${config.tenantId}/${sha256}`;
  const storageUri = `s3://${config.bucket}/${objectKey}`;
  const s3 = createS3Client(config);
  const postgres = new Client({ connectionString: config.connectionString });
  const shutdown = new globalThis.AbortController();
  let temporal: TestWorkflowEnvironment | undefined;
  let workerRun: Promise<void> | undefined;

  try {
    await ensureBucket(s3, config.bucket);
    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        Body: csvBytes,
        ContentType: 'text/csv',
      })
    );
    await postgres.connect();

    const planRef = await storeValidPlanArtifact({
      connectionString: config.connectionString,
      schema: 'dvt',
      plan: createObjectFilePostgresExecutionPlan({
        tenantId: config.tenantId,
        projectId: config.projectId,
        environmentId: config.environmentId,
        storageUri,
        sha256,
        sizeBytes: csvBytes.byteLength,
        relation,
      }),
      tenantId: config.tenantId,
      projectId: config.projectId,
      environmentId: config.environmentId,
    });

    const serviceTemporal = await TestWorkflowEnvironment.createFromExistingServer({
      address: config.temporalAddress,
      namespace: config.namespace,
    });
    temporal = serviceTemporal;
    const env = loadEnv({
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: config.connectionString,
      DVT_PG_SCHEMA: 'dvt',
      DVT_TEMPORAL_WORKER_RUN_MIGRATIONS: 'true',
      TEMPORAL_ADDRESS: serviceTemporal.address,
      TEMPORAL_NAMESPACE: config.namespace,
      TEMPORAL_TASK_QUEUE: taskQueue,
      DVT_TEMPORAL_ADMIN_HOST: '127.0.0.1',
      DVT_TEMPORAL_ADMIN_PORT: String(9700 + Math.floor(Math.random() * 200)),
      DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED: 'true',
      DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF: 'object-store:het1-source',
      DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF: 'postgres:het1-staging',
      DVT_OBJECT_FILE_S3_ENDPOINT: config.endpoint,
      DVT_OBJECT_FILE_S3_REGION: config.region,
      DVT_OBJECT_FILE_S3_FORCE_PATH_STYLE: 'true',
    });
    const monitor = new TemporalWorkerMonitor({
      serviceName: env.SERVICE_NAME,
      logger: { info() {}, error() {} },
      enabledCapabilities: [LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY],
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

    await verify({
      relation,
      sha256,
      sizeBytes: csvBytes.byteLength,
      execute: (runLabel) =>
        executePlan({
          temporal: serviceTemporal,
          connectionString: config.connectionString,
          namespace: config.namespace,
          taskQueue,
          tenantId: config.tenantId,
          projectId: config.projectId,
          environmentId: config.environmentId,
          planRef,
          runId: `run-object-file-${runLabel}-${suffix}`,
        }),
      readRows: async () => {
        const result = await postgres.query<ObjectFilePostgresResultRow>(
          `SELECT order_id::text, amount::text, active FROM "staging"."${relation}" ORDER BY order_id`
        );
        return result.rows;
      },
    });
  } finally {
    shutdown.abort();
    await workerRun;
    await temporal?.teardown();
    await postgres.query(`DROP TABLE IF EXISTS "staging"."${relation}"`).catch(() => undefined);
    await postgres.end().catch(() => undefined);
    await s3
      .send(new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }))
      .catch(() => undefined);
    s3.destroy();
  }
}

interface ObjectFilePostgresServiceConfig {
  readonly connectionString: string;
  readonly endpoint: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly region: string;
  readonly temporalAddress: string;
  readonly bucket: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
  readonly namespace: string;
}

function resolveServiceConfig(): ObjectFilePostgresServiceConfig {
  return {
    connectionString:
      process.env['DVT_PG_URL'] ??
      process.env['DATABASE_URL'] ??
      'postgresql://dvt:dvt@localhost:5432/dvt',
    endpoint: process.env['DVT_HET1_MINIO_ENDPOINT'] ?? 'http://127.0.0.1:9000',
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] ?? 'minioadmin',
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] ?? 'minioadmin',
    region: process.env['AWS_REGION'] ?? 'us-east-1',
    temporalAddress: process.env['DVT_HET1_TEMPORAL_ADDRESS'] ?? '127.0.0.1:7233',
    bucket: process.env['DVT_HET1_MINIO_BUCKET'] ?? 'het1-fixtures',
    tenantId: 'tenant-het1-service',
    projectId: 'project-het1-service',
    environmentId: 'test',
    namespace: 'default',
  };
}

function createS3Client(config: ObjectFilePostgresServiceConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

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
}): Promise<MaterializationEvidence> {
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

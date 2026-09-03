import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

import { LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND } from '@dvt/contracts';
import type { ResolvedRunContext } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { loadEnv } from '../../src/plugins/env.js';
import type { Env } from '../../src/plugins/env.js';
import { createTemporalWorkerObjectFilePostgresProfile } from '../../src/runtime/temporalWorkerObjectFilePostgresProfile.js';

const csvBytes = Buffer.from('order_id,amount\n1,12.50\n');

vi.mock('@temporalio/activity', () => ({
  Context: {
    current: () => ({ cancellationSignal: undefined }),
  },
}));

describe('createTemporalWorkerObjectFilePostgresProfile', () => {
  it('omits the profile and its adapters when the capability is disabled', () => {
    const objectReaderFactory = vi.fn();
    const profile = createTemporalWorkerObjectFilePostgresProfile(createEnv(), {
      objectFileReaderFactory: objectReaderFactory,
    });

    expect(profile.pluginProfile).toBeUndefined();
    expect(objectReaderFactory).not.toHaveBeenCalled();
  });

  it('adapts object bytes and the shared PostgreSQL loader into the canonical activity', async () => {
    const read = vi.fn(async () => ({
      bytes: csvBytes,
      contentLength: csvBytes.byteLength,
      contentType: 'text/csv',
    }));
    const load = vi.fn(async () => ({
      rowsWritten: 1,
      publicationOutcome: 'created' as const,
      targetSchema: 'staging_scope_1',
      targetRelation: 'orders',
    }));
    const profile = createTemporalWorkerObjectFilePostgresProfile(
      createEnv({
        DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED: 'true',
        DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF: 'object-store:het1-source',
        DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF: 'postgres:het1-staging',
      }),
      {
        objectFileReaderFactory: () => ({ read }),
        postgresObjectFileLoadingCapabilityFactory: () => ({
          load,
          close: vi.fn(async () => undefined),
        }),
      }
    );

    expect([...profile.pluginProfile!.stepActivitiesByKind.keys()]).toEqual([
      LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
    ]);

    const result = await profile
      .pluginProfile!.stepActivitiesByKind.get(LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND)!
      .execute(
        {
          stepId: 'load-orders',
          kind: LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
          dependsOn: [],
          stepTypeConfig: {
            scope: {
              tenantId: 'tenant-1',
              projectId: 'project-1',
              environmentId: 'environment-1',
            },
            source: {
              storageUri: `s3://het1-fixtures/tenants/tenant-1/${createHash('sha256')
                .update(csvBytes)
                .digest('hex')}`,
              sha256: createHash('sha256').update(csvBytes).digest('hex'),
              sizeBytes: csvBytes.byteLength,
              maxBytes: 1024,
              encoding: 'utf-8',
              credentialRef: 'object-store:het1-source',
              format: 'csv',
              mediaType: 'text/csv',
              header: true,
              delimiter: ',',
            },
            target: {
              dialect: 'postgres',
              schema: 'staging',
              relation: 'orders',
              loadMode: 'replace',
              credentialRef: 'postgres:het1-staging',
            },
            columns: [
              {
                sourceField: 'order_id',
                targetColumn: 'order_id',
                dataType: 'integer',
                nullable: false,
              },
              {
                sourceField: 'amount',
                targetColumn: 'amount',
                dataType: 'numeric',
                nullable: false,
              },
            ],
            stepTimeoutMs: 30_000,
            concurrency: { maxInFlight: 1 },
          },
        },
        {
          executionIdentity: {
            tenantId: 'tenant-1',
            runId: 'run-1',
            environmentId: 'environment-1',
          },
          runContext: {
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'environment-1',
            runId: 'run-1',
            targetAdapter: 'temporal',
            logicalAttemptId: 1,
          } as ResolvedRunContext,
        }
      );

    expect(read).toHaveBeenCalledWith({
      uri: `s3://het1-fixtures/tenants/tenant-1/${createHash('sha256')
        .update(csvBytes)
        .digest('hex')}`,
      maxBytes: 1024,
    });
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: 'staging',
        scope: {
          tenantId: 'tenant-1',
          projectId: 'project-1',
          environmentId: 'environment-1',
        },
        relation: 'orders',
        rows: [{ order_id: 1, amount: '12.50' }],
      })
    );
    expect(result).toMatchObject({
      stepId: 'load-orders',
      status: 'COMPLETED',
      resultEvidence: {
        executor: 'postgres',
        rowsWritten: 1,
        publicationOutcome: 'created',
      },
    });
  });
});

function createEnv(overrides: NodeJS.ProcessEnv = {}): Env {
  return loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    TEMPORAL_ADDRESS: 'temporal:7233',
    TEMPORAL_NAMESPACE: 'default',
    TEMPORAL_TASK_QUEUE: 'dvt-temporal',
    ...overrides,
  });
}

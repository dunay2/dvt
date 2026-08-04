import { createHash } from 'node:crypto';

import type { StepDefinition } from '@dvt/adapter-temporal';
import { describe, expect, it, vi } from 'vitest';

import { ObjectFilePostgresPluginRunner } from '../src/ObjectFilePostgresPluginRunner.js';
import type {
  ContentAddressedObjectReader,
  ObjectFilePostgresPluginExecutionInput,
  ObjectFilePostgresRelationalLoader,
} from '../src/objectFilePostgresPluginTypes.js';

import { RUN_CONTEXT, SOURCE_BYTES, STEP_CONFIG } from './objectFilePostgresTestFixtures.js';

describe('ObjectFilePostgresPluginRunner', () => {
  it('passes the governed source bound to the object reader', async () => {
    const read = vi.fn(async () => ({
      bytes: SOURCE_BYTES,
      contentLength: SOURCE_BYTES.byteLength,
      contentType: 'text/csv',
    }));
    const runner = createRunner(
      { read },
      {
        load: vi.fn(async () => ({ rowsWritten: 2, publicationOutcome: 'created' as const })),
      }
    );

    await runner.execute(buildInput());

    expect(read).toHaveBeenCalledWith(
      expect.objectContaining({ maxBytes: buildInput().config.source.maxBytes })
    );
  });
  it('loads verified rows and returns a typed replacement receipt', async () => {
    const read = vi.fn(async () => ({
      bytes: SOURCE_BYTES,
      contentLength: SOURCE_BYTES.byteLength,
      contentType: 'text/csv',
    }));
    const load = vi.fn(async () => ({ rowsWritten: 2, publicationOutcome: 'replaced' as const }));
    const runner = createRunner({ read }, { load });

    await expect(runner.execute(buildInput())).resolves.toMatchObject({
      stepId: 'load.orders',
      status: 'COMPLETED',
      resultEvidence: {
        executor: 'postgres',
        environmentId: 'dev',
        sinkTable: 'staging.orders_import',
        rowsWritten: 2,
        sourceArtifact: {
          sha256: STEP_CONFIG.source.sha256,
          sizeBytes: SOURCE_BYTES.byteLength,
          mediaType: 'text/csv',
        },
        publicationOutcome: 'replaced',
      },
    });
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: 'staging',
        relation: 'orders_import',
        rows: [
          { order_id: '1', amount: '10.25', active: true },
          { order_id: '2', amount: '20.50', active: false },
        ],
      })
    );
  });

  it.each([
    ['source binding mismatch', { expectedSourceCredentialRef: 'object-store:other' }],
    ['target binding mismatch', { expectedTargetCredentialRef: 'postgres:other' }],
  ])('rejects %s before object access', async (_label, options) => {
    const read = vi.fn();
    const runner = createRunner({ read }, { load: vi.fn() }, options);

    await expect(runner.execute(buildInput())).rejects.toMatchObject({
      name: 'ObjectFileIngestionRejectedError',
    });
    expect(read).not.toHaveBeenCalled();
  });

  it('rejects changed bytes before relational mutation', async () => {
    const bytes = Buffer.from(SOURCE_BYTES);
    bytes[0] = bytes[0] === 0x78 ? 0x79 : 0x78;
    expect(createHash('sha256').update(bytes).digest('hex')).not.toBe(STEP_CONFIG.source.sha256);
    const load = vi.fn();
    const runner = createRunner(
      {
        read: vi.fn(async () => ({
          bytes,
          contentLength: bytes.byteLength,
          contentType: 'text/csv',
        })),
      },
      { load }
    );

    await expect(runner.execute(buildInput())).rejects.toMatchObject({
      code: 'OBJECT_SOURCE_INTEGRITY_MISMATCH',
    });
    expect(load).not.toHaveBeenCalled();
  });

  it.each([
    [
      'reported size drift',
      {
        bytes: SOURCE_BYTES,
        contentLength: SOURCE_BYTES.byteLength + 1,
        contentType: 'text/csv',
      },
      'OBJECT_SOURCE_SIZE_MISMATCH',
    ],
    [
      'reported media-type drift',
      {
        bytes: SOURCE_BYTES,
        contentLength: SOURCE_BYTES.byteLength,
        contentType: 'application/json',
      },
      'OBJECT_SOURCE_MEDIA_TYPE_MISMATCH',
    ],
    [
      'missing media-type evidence',
      {
        bytes: SOURCE_BYTES,
        contentLength: SOURCE_BYTES.byteLength,
      },
      'OBJECT_SOURCE_MEDIA_TYPE_MISMATCH',
    ],
  ])('rejects %s before relational mutation', async (_label, source, code) => {
    const load = vi.fn();
    const runner = createRunner({ read: vi.fn(async () => source) }, { load });

    await expect(runner.execute(buildInput())).rejects.toMatchObject({ code });
    expect(load).not.toHaveBeenCalled();
  });

  it('sanitizes a transient object-store failure and succeeds on retry', async () => {
    const read = vi
      .fn(async () => ({
        bytes: SOURCE_BYTES,
        contentLength: SOURCE_BYTES.byteLength,
        contentType: 'text/csv',
      }))
      .mockRejectedValueOnce(new Error('s3://user:secret@source/orders.csv'));
    const load = vi.fn(async () => ({ rowsWritten: 2, publicationOutcome: 'created' as const }));
    const runner = createRunner({ read }, { load });

    await expect(runner.execute(buildInput())).rejects.toMatchObject({
      code: 'OBJECT_SOURCE_READ_FAILED',
      message: 'OBJECT_SOURCE_READ_FAILED',
    });
    await expect(runner.execute(buildInput())).resolves.toMatchObject({ status: 'COMPLETED' });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('sanitizes a transient database failure and publishes only on retry', async () => {
    const read = vi.fn(async () => ({
      bytes: SOURCE_BYTES,
      contentLength: SOURCE_BYTES.byteLength,
      contentType: 'text/csv',
    }));
    const load = vi
      .fn(async () => ({ rowsWritten: 2, publicationOutcome: 'created' as const }))
      .mockRejectedValueOnce(new Error('invalid input value from source payload'));
    const runner = createRunner({ read }, { load });

    await expect(runner.execute(buildInput())).rejects.toMatchObject({
      code: 'POSTGRES_OBJECT_LOAD_FAILED',
      message: 'POSTGRES_OBJECT_LOAD_FAILED',
    });
    await expect(runner.execute(buildInput())).resolves.toMatchObject({ status: 'COMPLETED' });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('rejects plan/runtime scope drift before object access', async () => {
    const read = vi.fn();
    const runner = createRunner({ read }, { load: vi.fn() });
    const input = buildInput();

    await expect(
      runner.execute({
        ...input,
        runContext: { ...input.runContext, projectId: 'project-b' },
      })
    ).rejects.toMatchObject({ code: 'OBJECT_FILE_EXECUTION_SCOPE_MISMATCH' });
    expect(read).not.toHaveBeenCalled();
  });

  it('does not begin relational mutation when cancellation is already requested', async () => {
    const controller = new globalThis.AbortController();
    controller.abort(new Error('cancelled'));
    const load = vi.fn();
    const runner = createRunner(
      { read: vi.fn() },
      { load },
      { getCancellationSignal: () => controller.signal }
    );

    await expect(runner.execute(buildInput())).rejects.toThrow('cancelled');
    expect(load).not.toHaveBeenCalled();
  });

  it('propagates cancellation during object read without beginning relational mutation', async () => {
    const controller = new globalThis.AbortController();
    const load = vi.fn();
    const read = vi.fn(
      async ({ signal }: { signal?: globalThis.AbortSignal }) =>
        new Promise<never>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
        })
    );
    const runner = createRunner(
      { read },
      { load },
      { getCancellationSignal: () => controller.signal }
    );

    const execution = runner.execute(buildInput());
    controller.abort(new Error('cancelled'));

    await expect(execution).rejects.toThrow('cancelled');
    expect(load).not.toHaveBeenCalled();
  });
});

function createRunner(
  objectReader: ContentAddressedObjectReader,
  relationalLoader: ObjectFilePostgresRelationalLoader,
  overrides: Partial<ConstructorParameters<typeof ObjectFilePostgresPluginRunner>[0]> = {}
): ObjectFilePostgresPluginRunner {
  const instants = [new Date('2026-08-04T10:00:00.000Z'), new Date('2026-08-04T10:00:01.000Z')];
  return new ObjectFilePostgresPluginRunner({
    objectReader,
    relationalLoader,
    expectedSourceCredentialRef: 'object-store:het1-fixture',
    expectedTargetCredentialRef: 'postgres:het1-staging',
    now: () => instants.shift() ?? new Date('2026-08-04T10:00:01.000Z'),
    ...overrides,
  });
}

function buildInput(): ObjectFilePostgresPluginExecutionInput {
  return {
    step: {
      stepId: 'load.orders',
      kind: 'LOAD_OBJECT_FILE_TO_POSTGRES',
      dependsOn: [],
      stepTypeConfig: STEP_CONFIG,
    } as StepDefinition,
    config: STEP_CONFIG,
    executionIdentity: {
      tenantId: 'tenant-a',
      runId: 'run-a',
      environmentId: 'dev',
    },
    runContext: RUN_CONTEXT,
  };
}

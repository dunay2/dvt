import { createHash } from 'node:crypto';

import type { StepResult } from '@dvt/adapter-temporal';
import { MaterializationEvidenceSchema } from '@dvt/contracts';

import {
  ObjectFileIngestionRejectedError,
  ObjectFileIngestionRuntimeError,
} from './objectFilePostgresPluginErrors.js';
import type {
  ContentAddressedObjectReader,
  ObjectFilePostgresPluginExecutionInput,
  ObjectFilePostgresPluginRunner,
  ObjectFilePostgresRelationalLoader,
} from './objectFilePostgresPluginTypes.js';
import { parseObjectFileRows } from './objectFileRows.js';

export interface ObjectFilePostgresPluginRunnerOptions {
  readonly objectReader: ContentAddressedObjectReader;
  readonly relationalLoader: ObjectFilePostgresRelationalLoader;
  readonly expectedSourceCredentialRef: string;
  readonly expectedTargetCredentialRef: string;
  readonly getCancellationSignal?: () => globalThis.AbortSignal | undefined;
  readonly now?: () => Date;
}

export class ObjectFilePostgresPluginRunnerImpl implements ObjectFilePostgresPluginRunner {
  private readonly getCancellationSignal: () => globalThis.AbortSignal | undefined;
  private readonly now: () => Date;

  public constructor(private readonly options: ObjectFilePostgresPluginRunnerOptions) {
    this.getCancellationSignal = options.getCancellationSignal ?? (() => undefined);
    this.now = options.now ?? (() => new Date());
  }

  public async execute(input: ObjectFilePostgresPluginExecutionInput): Promise<StepResult> {
    this.assertScope(input);
    this.assertBindings(input);
    const signal = this.getCancellationSignal();
    assertNotAborted(signal);
    const startedAt = this.now();
    const source = await readSourceSafely(this.options.objectReader, input, signal);

    this.assertSourceIntegrity(input, source);
    assertNotAborted(signal);
    const rows = await parseObjectFileRows(
      source.bytes,
      input.config.source,
      input.config.columns,
      signal
    );
    assertNotAborted(signal);
    const loaded = await loadRowsSafely(this.options.relationalLoader, input, rows, signal);
    assertNotAborted(signal);
    const completedAt = this.now();

    return {
      stepId: input.step.stepId,
      status: 'COMPLETED',
      resultEvidence: MaterializationEvidenceSchema.parse({
        executor: 'postgres',
        environmentId: input.runContext.environmentId,
        sinkTable: `${input.config.target.schema}.${input.config.target.relation}`,
        rowsWritten: loaded.rowsWritten,
        sourceArtifact: {
          sha256: input.config.source.sha256,
          sizeBytes: source.bytes.byteLength,
          mediaType: input.config.source.mediaType,
        },
        publicationOutcome: loaded.publicationOutcome,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
      }),
    };
  }

  private assertScope(input: ObjectFilePostgresPluginExecutionInput): void {
    const expected = input.config.scope;
    const actual = input.runContext;
    if (
      expected.tenantId !== actual.tenantId ||
      expected.projectId !== actual.projectId ||
      expected.environmentId !== actual.environmentId ||
      input.executionIdentity.tenantId !== actual.tenantId ||
      input.executionIdentity.environmentId !== actual.environmentId
    ) {
      reject('OBJECT_FILE_EXECUTION_SCOPE_MISMATCH');
    }
  }

  private assertBindings(input: ObjectFilePostgresPluginExecutionInput): void {
    if (input.config.source.credentialRef !== this.options.expectedSourceCredentialRef) {
      reject('OBJECT_SOURCE_BINDING_MISMATCH');
    }
    if (input.config.target.credentialRef !== this.options.expectedTargetCredentialRef) {
      reject('POSTGRES_TARGET_BINDING_MISMATCH');
    }
  }

  private assertSourceIntegrity(
    input: ObjectFilePostgresPluginExecutionInput,
    source: {
      readonly bytes: Uint8Array;
      readonly contentLength?: number;
      readonly contentType?: string;
    }
  ): void {
    const actualSize = source.bytes.byteLength;
    if (
      actualSize !== input.config.source.sizeBytes ||
      actualSize > input.config.source.maxBytes ||
      (source.contentLength !== undefined && source.contentLength !== actualSize)
    ) {
      reject('OBJECT_SOURCE_SIZE_MISMATCH');
    }

    if (
      source.contentType === undefined ||
      normalizeMediaType(source.contentType) !== input.config.source.mediaType
    ) {
      reject('OBJECT_SOURCE_MEDIA_TYPE_MISMATCH');
    }

    const actualSha256 = createHash('sha256').update(source.bytes).digest('hex');
    if (actualSha256 !== input.config.source.sha256) {
      reject('OBJECT_SOURCE_INTEGRITY_MISMATCH');
    }
  }
}

export { ObjectFilePostgresPluginRunnerImpl as ObjectFilePostgresPluginRunner };

function normalizeMediaType(value: string): string {
  return value.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

function reject(code: string): never {
  throw new ObjectFileIngestionRejectedError(code);
}

function assertNotAborted(signal: globalThis.AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw signal.reason ?? new Error('Object-file ingestion was cancelled.');
  }
}

async function readSourceSafely(
  reader: ContentAddressedObjectReader,
  input: ObjectFilePostgresPluginExecutionInput,
  signal: globalThis.AbortSignal | undefined
): Promise<Awaited<ReturnType<ContentAddressedObjectReader['read']>>> {
  try {
    return await reader.read({
      uri: input.config.source.storageUri,
      maxBytes: input.config.source.maxBytes,
      ...(signal === undefined ? {} : { signal }),
    });
  } catch (error) {
    rethrowCancellation(signal, error);
    if (
      error instanceof ObjectFileIngestionRejectedError ||
      error instanceof ObjectFileIngestionRuntimeError
    ) {
      throw error;
    }
    throw new ObjectFileIngestionRuntimeError('OBJECT_SOURCE_READ_FAILED');
  }
}

async function loadRowsSafely(
  loader: ObjectFilePostgresRelationalLoader,
  input: ObjectFilePostgresPluginExecutionInput,
  rows: Parameters<ObjectFilePostgresRelationalLoader['load']>[0]['rows'],
  signal: globalThis.AbortSignal | undefined
): Promise<Awaited<ReturnType<ObjectFilePostgresRelationalLoader['load']>>> {
  try {
    return await loader.load({
      schema: input.config.target.schema,
      relation: input.config.target.relation,
      columns: input.config.columns,
      rows,
      ...(signal === undefined ? {} : { signal }),
    });
  } catch (error) {
    rethrowCancellation(signal, error);
    if (
      error instanceof ObjectFileIngestionRejectedError ||
      error instanceof ObjectFileIngestionRuntimeError
    ) {
      throw error;
    }
    throw new ObjectFileIngestionRuntimeError('POSTGRES_OBJECT_LOAD_FAILED');
  }
}

function rethrowCancellation(
  signal: globalThis.AbortSignal | undefined,
  operationError: unknown
): void {
  if (signal?.aborted === true) {
    throw signal.reason ?? operationError;
  }
}

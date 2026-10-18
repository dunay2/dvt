/**
 * Owned concern: coordinate acquisition, sequential persistence and publication through application ports.
 * @baseline #3394 / ADR-0058: capture is an explicit command, never a display query.
 * @decision Delegate evidence policy and access lifetime; promote only after successful source closure.
 * @consequence No HTTP composition, provider imports, retry or cross-store transaction.
 */
import { LocalDataGenerationIdV1Schema, WorkspaceGraphDraftScopeSchema,
  createLocalDataSchemaDigestV1, isIsoUtcString } from '@dvt/contracts';

import type { IRemoteDatasetCursor, IRemoteDatasetReader, ILocalDataCaptureWriter,
  LocalDataCaptureLimits, LocalDataCaptureReceipt, LocalDataCaptureWriterFactory } from '../ports/localDataAcquisition.js';
import type { ILocalDataOperationAccess } from '../ports/localDataPlane.js';

import { withCaptureSourceAccess, type CaptureAccessContext, type CaptureAccessDependencies } from './localDataCaptureAccess.js';
import { LocalDataCaptureError, parseCaptureCommand, createCaptureRequest, snapshotCaptureBatch,
  createCaptureManifest, type CaptureCommand, type CaptureEvidence } from './localDataCapturePolicy.js';

// Preserve the established error import for callers; implementation has a single owner.
export { LocalDataCaptureError } from './localDataCapturePolicy.js';

type Dependencies = CaptureAccessDependencies & Readonly<{
  reader: IRemoteDatasetReader;
  createWriter: LocalDataCaptureWriterFactory;
  limits: LocalDataCaptureLimits;
  batchRows: number;
}>;
type Acquisition = Readonly<{
  command: CaptureCommand;
  providerContextSha256: string;
  cursor: IRemoteDatasetCursor;
  writer: ILocalDataCaptureWriter;
  access: ILocalDataOperationAccess;
  startedAt: number;
}>;

export class CaptureLocalDatasetUseCase {
  private readonly deps: Dependencies;

  public constructor(deps: Dependencies) {
    for (const value of [deps.limits.maxRows, deps.limits.maxLogicalBytes, deps.batchRows, deps.timeoutMs]) {
      if (!Number.isSafeInteger(value) || value < 1) throw new LocalDataCaptureError('INVALID_INPUT');
    }
    this.deps = Object.freeze({
      authorizer: Object.freeze({ authorizeMany: deps.authorizer.authorizeMany.bind(deps.authorizer) }),
      catalog: Object.freeze({ getConnection: deps.catalog.getConnection.bind(deps.catalog) }),
      reader: Object.freeze({ withCursor: deps.reader.withCursor.bind(deps.reader) }),
      createWriter: deps.createWriter, clock: deps.clock,
      limits: Object.freeze({ maxRows: deps.limits.maxRows, maxLogicalBytes: deps.limits.maxLogicalBytes }),
      batchRows: deps.batchRows, timeoutMs: deps.timeoutMs,
    });
  }

  public async execute(input: unknown, context: CaptureAccessContext, callerSignal?: AbortSignal): Promise<LocalDataCaptureReceipt> {
    const command = parseCaptureCommand(input);
    const parsedScope = WorkspaceGraphDraftScopeSchema.safeParse(context.scope);
    if (!parsedScope.success || typeof context.requestId !== 'string' || !context.requestId.trim()) {
      throw new LocalDataCaptureError('INVALID_INPUT');
    }
    const scope = Object.freeze(parsedScope.data);
    if (command.policy.kind === 'sample' && BigInt(command.policy.requestedRows) > BigInt(this.deps.limits.maxRows)) {
      throw new LocalDataCaptureError('CAPTURE_BUDGET');
    }
    return withCaptureSourceAccess(this.deps, command,
      { scope, principal: context.principal, requestId: context.requestId }, callerSignal,
      async ({ access, target, providerContextSha256, startedAt }) => {
        const writer = this.deps.createWriter(scope, access, this.deps.limits);
        const evidence = await this.deps.reader.withCursor({
          target, access, limits: this.deps.limits, timeoutMs: this.deps.timeoutMs,
        }, (cursor) => this.acquire({ command, providerContextSha256, cursor, writer, access, startedAt }));
        // Resolving the callback is not closing the source: await the reader's whole resource scope.
        await access.beforePromotion();
        const manifest = createCaptureManifest(command, evidence, this.deps.clock().toISOString());
        // A lost confirmation after commit must not be reported as rollback or silently retried.
        return writer.promote(manifest);
      });
  }

  private async acquire(input: Acquisition): Promise<CaptureEvidence> {
    const { command, providerContextSha256, cursor, writer, access, startedAt } = input;
    await access.checkpoint();
    const observedAt = cursor.observedAt;
    if (!isIsoUtcString(observedAt) || Date.parse(observedAt) < startedAt) {
      throw new LocalDataCaptureError('INVALID_EVIDENCE');
    }
    const request = createCaptureRequest(command, cursor.schema, providerContextSha256);
    const schemaDigest = createLocalDataSchemaDigestV1(request.schema);
    await writer.initialize();
    const stage = await writer.begin({
      localDatasetId: command.localDatasetId, captureId: command.captureId,
      request, expectedHeadGenerationId: command.expectedHeadGenerationId,
    });
    if (stage.captureId !== command.captureId || !LocalDataGenerationIdV1Schema.safeParse(stage.generationId).success) {
      throw new LocalDataCaptureError('INVALID_EVIDENCE');
    }
    const generationId = stage.generationId;
    const target = command.policy.kind === 'sample' ? BigInt(command.policy.requestedRows) : undefined;
    const maxRows = BigInt(this.deps.limits.maxRows);
    const maxBytes = BigInt(this.deps.limits.maxLogicalBytes);
    const batchRows = BigInt(this.deps.batchRows);
    let rows = 0n;
    let bytes = 0n;
    let eof = false;
    while (!eof && (target === undefined || rows < target)) {
      await access.checkpoint();
      const remaining = (target ?? maxRows) - rows;
      // FULL at its ceiling requires an empty EOF probe; an additional row is not publishable data.
      const requested = Number(remaining === 0n ? 1n : remaining < batchRows ? remaining : batchRows);
      const batch = snapshotCaptureBatch(await cursor.read(requested), requested, request.schema.columns.length);
      if (createLocalDataSchemaDigestV1(cursor.schema) !== schemaDigest) {
        throw new LocalDataCaptureError('INVALID_EVIDENCE');
      }
      await access.checkpoint();
      const nextRows = rows + BigInt(batch.rows.length);
      const nextBytes = bytes + BigInt(batch.logicalBytes);
      if (nextRows > maxRows || nextBytes > maxBytes) throw new LocalDataCaptureError('CAPTURE_BUDGET');
      if (batch.rows.length) await writer.append(command.captureId, batch.rows);
      await access.checkpoint();
      rows = nextRows;
      bytes = nextBytes;
      eof = batch.endOfSource;
    }
    return { request, generationId, observedAt, rows, bytes, eof };
  }
}

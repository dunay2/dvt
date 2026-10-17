/**
 * Owned concern: coordinate one authorized raw-source capture and derive its publication evidence.
 * @baseline #3394 / ADR-0058: capture is a command, separate from display queries and graph layout.
 * @decision Use application ports, current grants and binding checks; promote only after source closure.
 * @consequence Internal command only. No HTTP composition, automatic retry or distributed transaction.
 */
import {
  ConnectedSourceRefSchema,
  LocalDataAcquisitionPolicyV1Schema,
  LocalDataAcquisitionRequestV1Schema,
  LocalDataCaptureIdV1Schema,
  LocalDataGenerationIdV1Schema,
  LocalDataGenerationManifestV1Schema,
  LocalDatasetIdV1Schema,
  PostgresCredentialRefSchema,
  WorkspaceGraphDraftScopeSchema,
  createLocalDataRequestFingerprintV1,
  createLocalDataSchemaDigestV1,
  isIsoUtcString,
  type LocalDataAcquisitionRequestV1,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { z } from 'zod';

import { EnvironmentId, ProjectId, TenantId, type AuthenticatedPrincipal } from '../../domain/auth/types.js';
import { buildEnvironmentAccessScope } from '../ports/accessDecision.js';
import type {
  IRemoteDatasetCursor,
  IRemoteDatasetReader,
  LocalDataCaptureLimits,
  LocalDataCaptureReceipt,
  LocalDataCaptureWriterFactory,
  ILocalDataCaptureWriter,
  RemoteDatasetBatch,
} from '../ports/localDataAcquisition.js';
import type { ILocalDataOperationAccess } from '../ports/localDataPlane.js';
import type { IWarehouseConnectionCatalog, WarehouseSourceObjectProbeTarget } from '../ports/warehouseSourceImport.js';

import type { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';
import { LocalDataAuthorizationLease } from './localDataAuthorizationLease.js';

const CommandSchema = z.object({
  localDatasetId: LocalDatasetIdV1Schema,
  captureId: LocalDataCaptureIdV1Schema,
  sourceRef: ConnectedSourceRefSchema,
  policy: LocalDataAcquisitionPolicyV1Schema,
  expectedHeadGenerationId: LocalDataGenerationIdV1Schema.nullable(),
  expectedPublicationToken: z.string().regex(/^[0-9a-f]{64}$/u).optional(),
}).strict();
type Command = z.infer<typeof CommandSchema>;
type Context = Readonly<{ principal: AuthenticatedPrincipal; scope: WorkspaceGraphDraftScope; requestId: string }>;
type Dependencies = Readonly<{
  authorizer: Pick<AuthorizeCommandScopeService, 'authorizeMany'>;
  catalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
  reader: IRemoteDatasetReader;
  createWriter: LocalDataCaptureWriterFactory;
  clock: () => Date;
  limits: LocalDataCaptureLimits;
  batchRows: number;
  timeoutMs: number;
}>;
type CaptureFailure = 'INVALID_INPUT' | 'SOURCE_REJECTED' | 'SOURCE_BINDING_CHANGED' | 'CANCELLED'
  | 'CAPTURE_BUDGET' | 'CAPTURE_TIMEOUT' | 'INVALID_BATCH' | 'INVALID_EVIDENCE';

export class LocalDataCaptureError extends Error {
  public constructor(readonly code: CaptureFailure) {
    super(`LOCAL capture rejected: ${code}`);
    this.name = 'LocalDataCaptureError';
  }
}

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
      createWriter: deps.createWriter,
      clock: deps.clock,
      limits: Object.freeze({ maxRows: deps.limits.maxRows, maxLogicalBytes: deps.limits.maxLogicalBytes }),
      batchRows: deps.batchRows,
      timeoutMs: deps.timeoutMs,
    });
  }

  public async execute(input: unknown, context: Context, callerSignal?: AbortSignal): Promise<LocalDataCaptureReceipt> {
    const parsed = CommandSchema.safeParse(input);
    const parsedScope = WorkspaceGraphDraftScopeSchema.safeParse(context.scope);
    if (!parsed.success || !parsedScope.success || typeof context.requestId !== 'string' || !context.requestId.trim()) {
      throw new LocalDataCaptureError('INVALID_INPUT');
    }
    const command = parsed.data;
    const scope = Object.freeze(parsedScope.data);
    if (command.policy.kind === 'sample' && BigInt(command.policy.requestedRows) > BigInt(this.deps.limits.maxRows)) {
      throw new LocalDataCaptureError('CAPTURE_BUDGET');
    }
    if (callerSignal?.aborted) throw new LocalDataCaptureError('CANCELLED');
    const startedAt = this.deps.clock().getTime();
    if (!Number.isFinite(startedAt)) throw new LocalDataCaptureError('INVALID_EVIDENCE');
    // No bearer/token/secret is included. Snapshot before the first await, not from mutable context later.
    const principalContext = {
      principalId: context.principal.principalId, principalType: context.principal.principalType,
      subjectId: context.principal.subjectId, issuer: context.principal.issuer, audience: context.principal.audience,
    };
    const lease = await LocalDataAuthorizationLease.open({
      principal: context.principal, operation: 'capture', requestId: context.requestId,
      scope: buildEnvironmentAccessScope(TenantId.unsafe(scope.tenantId), ProjectId.unsafe(scope.projectId), EnvironmentId.unsafe(scope.environmentId)),
    }, { authorizer: this.deps.authorizer, clock: this.deps.clock });
    const signal = callerSignal ? AbortSignal.any([lease.signal, callerSignal]) : lease.signal;
    const assertActive = () => {
      if (signal.aborted) throw new LocalDataCaptureError('CANCELLED');
      const now = this.deps.clock().getTime();
      if (!Number.isFinite(now) || now < startedAt) throw new LocalDataCaptureError('INVALID_EVIDENCE');
      if (now - startedAt >= this.deps.timeoutMs) throw new LocalDataCaptureError('CAPTURE_TIMEOUT');
    };
    try {
      assertActive();
      const target = await this.resolveTarget(scope, command);
      assertActive();
      const binding = jcsCanonicalize(target);
      const check = async (promotion: boolean) => {
        assertActive();
        await (promotion ? lease.beforePromotion() : lease.checkpoint());
        assertActive();
        const current = await this.resolveTarget(scope, command);
        assertActive();
        if (jcsCanonicalize(current) !== binding) throw new LocalDataCaptureError('SOURCE_BINDING_CHANGED');
      };
      const access: ILocalDataOperationAccess = Object.freeze({ signal,
        checkpoint: () => check(false), beforePromotion: () => check(true) });
      // Admission-context digest is not a grant, a credential-version certificate or a remote snapshot ID.
      const providerContextSha256 = sha256HexUtf8(jcsCanonicalize({ profile: 'local-capture-admission.v1', scope, principal: principalContext, target }));
      const writer = this.deps.createWriter(scope, access, this.deps.limits);
      const evidence = await this.deps.reader.withCursor({ target, access, limits: this.deps.limits, timeoutMs: this.deps.timeoutMs },
        async cursor => this.acquire(command, providerContextSha256, cursor, writer, access, startedAt));
      // Resolving the consumer callback is NOT source closure. Only withCursor resolution admits this step.
      await access.beforePromotion();
      const manifest = LocalDataGenerationManifestV1Schema.parse({
        schemaVersion: 'local-data-generation.v1', localDatasetId: command.localDatasetId,
        captureId: command.captureId, generationId: evidence.generationId,
        request: evidence.request, requestFingerprint: createLocalDataRequestFingerprintV1(evidence.request),
        schemaSha256: createLocalDataSchemaDigestV1(evidence.request.schema),
        coverage: command.policy.kind === 'full' ? { kind: 'full', eofObserved: true } : { kind: 'sample' },
        completionReason: evidence.eof ? 'source-exhausted' : 'sample-target-reached',
        rowCount: evidence.rows.toString(), logicalByteCount: evidence.bytes.toString(),
        sourceObservation: { observedAt: evidence.observedAt }, createdAt: this.deps.clock().toISOString(),
      });
      // No catch/retry here: a lost confirmation after commit must not be reported as rollback or replayed.
      return await writer.promote(manifest);
    } finally {
      lease.close();
    }
  }

  private async resolveTarget(scope: WorkspaceGraphDraftScope, command: Command): Promise<WarehouseSourceObjectProbeTarget> {
    const connection = await this.deps.catalog.getConnection(scope, command.sourceRef.connectionRef.connectionId);
    if (connection.id !== command.sourceRef.connectionRef.connectionId ||
        connection.type !== command.sourceRef.connectionRef.provider || connection.type !== 'postgres' ||
        typeof connection.database !== 'string' || !connection.database.trim() ||
        !PostgresCredentialRefSchema.safeParse(connection.credentialRef).success) {
      throw new LocalDataCaptureError('SOURCE_REJECTED');
    }
    return Object.freeze({ type: connection.type, database: connection.database, credentialRef: connection.credentialRef!,
      objectId: command.sourceRef.sourceObjectId,
      ...(command.expectedPublicationToken === undefined ? {} : { expectedPublicationToken: command.expectedPublicationToken }) });
  }

  private async acquire(command: Command, providerContextSha256: string, cursor: IRemoteDatasetCursor,
                        writer: ILocalDataCaptureWriter, access: ILocalDataOperationAccess, startedAt: number) {
    await access.checkpoint();
    const observedAt = cursor.observedAt;
    if (!isIsoUtcString(observedAt) || Date.parse(observedAt) < startedAt) throw new LocalDataCaptureError('INVALID_EVIDENCE');
    const request: LocalDataAcquisitionRequestV1 = LocalDataAcquisitionRequestV1Schema.parse({
      schemaVersion: 'local-data-acquisition-request.v1', sourceRef: command.sourceRef,
      policy: command.policy, schema: cursor.schema, providerContextSha256,
    });
    freezeAcquisitionRequest(request);
    const schemaDigest = createLocalDataSchemaDigestV1(request.schema);
    await writer.initialize();
    const stage = await writer.begin({ localDatasetId: command.localDatasetId, captureId: command.captureId,
      request, expectedHeadGenerationId: command.expectedHeadGenerationId });
    if (stage.captureId !== command.captureId || !LocalDataGenerationIdV1Schema.safeParse(stage.generationId).success) {
      throw new LocalDataCaptureError('INVALID_EVIDENCE');
    }
    const generationId = stage.generationId;
    const target = command.policy.kind === 'sample' ? BigInt(command.policy.requestedRows) : undefined;
    let rows = 0n; let bytes = 0n; let eof = false;
    while (!eof && (target === undefined || rows < target)) {
      await access.checkpoint();
      const remaining = (target ?? BigInt(this.deps.limits.maxRows)) - rows;
      // FULL at its row ceiling requires one empty EOF probe; a returned row is a budget error, not data.
      const requested = Number(remaining === 0n ? 1n : remaining < BigInt(this.deps.batchRows) ? remaining : BigInt(this.deps.batchRows));
      const batch = await cursor.read(requested);
      await access.checkpoint();
      validateBatch(batch, requested);
      if (createLocalDataSchemaDigestV1(cursor.schema) !== schemaDigest) throw new LocalDataCaptureError('INVALID_EVIDENCE');
      const nextRows = rows + BigInt(batch.rows.length); const nextBytes = bytes + BigInt(batch.logicalBytes);
      if (nextRows > BigInt(this.deps.limits.maxRows) || nextBytes > BigInt(this.deps.limits.maxLogicalBytes)) {
        throw new LocalDataCaptureError('CAPTURE_BUDGET');
      }
      if (batch.rows.length) await writer.append(command.captureId, batch.rows);
      await access.checkpoint();
      rows = nextRows; bytes = nextBytes; eof = batch.endOfSource;
    }
    return { request, generationId, observedAt, rows, bytes, eof };
  }
}

function validateBatch(batch: RemoteDatasetBatch, requested: number): void {
  if (!batch || !Array.isArray(batch.rows) || batch.rows.length > requested ||
      typeof batch.endOfSource !== 'boolean' || !Number.isSafeInteger(batch.logicalBytes) || batch.logicalBytes < 0 ||
      (batch.rows.length === 0 && (!batch.endOfSource || batch.logicalBytes !== 0))) {
    throw new LocalDataCaptureError('INVALID_BATCH');
  }
}

/** Only schema-parsed, plain metadata is frozen; no adapters or authorization objects are traversed. */
function freezeAcquisitionRequest(request: LocalDataAcquisitionRequestV1): void {
  Object.freeze(request.sourceRef.connectionRef);
  Object.freeze(request.sourceRef);
  Object.freeze(request.policy);
  request.schema.columns.forEach(Object.freeze);
  Object.freeze(request.schema.columns);
  Object.freeze(request.schema);
  Object.freeze(request);
}

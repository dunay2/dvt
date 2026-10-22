/**
 * @sourceResponsibilities v1
 * @component SYS-API-INFRASTRUCTURE
 * @responsibility RESP-LOCAL-CAPTURE-APPEND "Append a validated batch within capture budgets."
 * @implements DuckDbGenerationStore.append
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.appender.test.ts"
 * @responsibility RESP-LOCAL-CAPTURE-STAGING "Create a bounded capture staging relation with its request identity."
 * @implements DuckDbGenerationStore.begin
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.test.ts"
 * @responsibility RESP-LOCAL-GENERATION-BOOTSTRAP "Initialize only a genuinely absent generation metadata catalog."
 * @delegates DuckDbGenerationStore.initialize
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.catalog.test.ts"
 * @responsibility RESP-LOCAL-GENERATION-CONSISTENCY "Read a generation manifest only when its sealed capture and relation agree."
 * @delegates DuckDbGenerationStore.readCapture
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.catalog.test.ts"
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.test.ts"
 * @responsibility RESP-LOCAL-GENERATION-CONSISTENCY "Read a generation manifest only when its sealed capture and relation agree."
 * @delegates DuckDbGenerationStore.readGeneration
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.catalog.test.ts"
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.test.ts"
 * @responsibility RESP-LOCAL-GENERATION-CONSISTENCY "Read a generation manifest only when its sealed capture and relation agree."
 * @delegates DuckDbGenerationStore.readHead
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.catalog.test.ts"
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.test.ts"
 * @responsibility RESP-LOCAL-GENERATION-PUBLICATION "Publish a sealed generation and its expected head atomically."
 * @implements DuckDbGenerationStore.promote
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.recovery.test.ts"
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.test.ts"
 * @responsibility RESP-LOCAL-GENERATION-TRANSACTION "Keep generation operations within an authorized storage transaction."
 * @implements DuckDbGenerationStore.transaction
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.catalog.test.ts"
 * @test "apps/api/test/infrastructure/DuckDbGenerationStore.test.ts"
 */
/**
 * Owned concern: bounded staging and atomic READY/head publication inside one workspace DuckDB file.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Reuse the native runtime, #3391 manifests and #3392 checkpoints; no file swap or new registry.
 * @consequence The composed infrastructure adapter does not expose a public capture/Preview API or certify source EOF.
 */
import { randomUUID } from 'node:crypto';

import type { DuckDBConnection } from '@duckdb/node-api';
import {
  LocalDataAcquisitionRequestV1Schema,
  LocalDataGenerationManifestV1Schema,
  LocalDataCaptureIdV1Schema,
  LocalDataGenerationIdV1Schema,
  LocalDatasetIdV1Schema,
  createLocalDataGenerationIdV1,
  createLocalDataRequestFingerprintV1,
  type LocalDataGenerationManifestV1,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

import type { ILocalDataOperationAccess } from '../../application/ports/localDataPlane.js';
import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import {
  MAX_BATCH_ROWS,
  MAX_BATCH_COLUMNS,
  type GenerationLimits,
} from '../../domain/localDataBatch.js';

import {
  initializeGenerationMetadata,
  readGenerationStage,
  readStoredGeneration,
  validateGenerationRelation,
  validateGenerationRelationSchema,
  validateGenerationStorageIdentity,
} from './duckDbGenerationMetadata.js';
import {
  DuckDbGenerationError,
  generationColumnSql,
  internalGenerationRelation,
  validateGenerationBatch,
  validateGenerationLimits,
  type GenerationFailure,
} from './duckDbGenerationProfile.js';
import type { DuckDbLocalDataRuntime } from './DuckDbLocalDataRuntime.js';

type BeginInput = Readonly<{
  localDatasetId: string;
  captureId: string;
  request: unknown;
  expectedHeadGenerationId: string | null;
}>;
type Receipt = Readonly<{
  disposition: 'published' | 'already_published';
  generation: LocalDataGenerationManifestV1;
}>;

/** Trusted infrastructure caller must bind this scope to the supplied authorization lease. */
export class DuckDbGenerationStore {
  private readonly scope: WorkspaceStorageScope;
  private readonly scopeJson: string;
  private readonly access: ILocalDataOperationAccess;
  private readonly limits: GenerationLimits;

  public constructor(
    private readonly runtime: DuckDbLocalDataRuntime,
    scope: WorkspaceStorageScope,
    access: ILocalDataOperationAccess,
    limits: GenerationLimits
  ) {
    if (
      [scope.tenantId, scope.projectId, scope.environmentId].some(
        (v) => typeof v !== 'string' || !v.length || v !== v.trim()
      )
    ) {
      throw new DuckDbGenerationError('INVALID_INPUT');
    }
    this.scope = Object.freeze({
      tenantId: scope.tenantId,
      projectId: scope.projectId,
      environmentId: scope.environmentId,
    });
    this.scopeJson = jcsCanonicalize(this.scope);
    this.access = Object.freeze({
      signal: access.signal,
      checkpoint: access.checkpoint.bind(access),
      beforePromotion: access.beforePromotion.bind(access),
    });
    this.limits = validateGenerationLimits(limits);
  }
  /** Explicit bootstrap; no migration/repair of existing incompatible metadata. */
  public initialize(): Promise<void> {
    return this.transaction(true, (c) => initializeGenerationMetadata(c, this.scopeJson), false);
  }
  public async begin(input: BeginInput) {
    const dataset = LocalDatasetIdV1Schema.safeParse(input.localDatasetId);
    const capture = LocalDataCaptureIdV1Schema.safeParse(input.captureId);
    const request = LocalDataAcquisitionRequestV1Schema.safeParse(input.request);
    const expected =
      input.expectedHeadGenerationId === null
        ? null
        : LocalDataGenerationIdV1Schema.safeParse(input.expectedHeadGenerationId);
    if (
      !dataset.success ||
      !capture.success ||
      !request.success ||
      (expected !== null && !expected.success)
    ) {
      throw new DuckDbGenerationError('INVALID_INPUT');
    }
    const columnSql = generationColumnSql(request.data.schema.columns);
    const fingerprint = createLocalDataRequestFingerprintV1(request.data);
    const requestJson = jcsCanonicalize(request.data);
    const expectedId = expected === null ? null : expected.data!;
    const generation = createLocalDataGenerationIdV1();
    const key = `r_${randomUUID().replaceAll('-', '')}`;
    return this.transaction(true, async (c) => {
      const prior = (
        await c.runAndReadAll(
          'SELECT capture_id FROM dvt_meta.staged_captures WHERE capture_id=$1',
          [capture.data]
        )
      ).getRows();
      if (prior.length) throw new DuckDbGenerationError('CAPTURE_EXISTS');
      await c.run(`CREATE TABLE ${internalGenerationRelation(key)} (${columnSql})`);
      await c.run('INSERT INTO dvt_meta.staged_captures VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,false)', [
        capture.data,
        dataset.data,
        generation,
        requestJson,
        fingerprint,
        expectedId,
        key,
      ]);
      return { captureId: capture.data, generationId: generation };
    });
  }
  public async append(captureId: string, input: readonly (readonly unknown[])[]): Promise<void> {
    const id = LocalDataCaptureIdV1Schema.safeParse(captureId);
    if (!id.success || !Array.isArray(input) || input.length > MAX_BATCH_ROWS)
      throw new DuckDbGenerationError('INVALID_INPUT');
    // Copy a bounded outer shape before the first await; values must later be immutable primitives.
    const rows = input.map((row) => {
      if (!Array.isArray(row) || row.length > MAX_BATCH_COLUMNS)
        throw new DuckDbGenerationError('INVALID_BATCH');
      return [...row];
    });
    await this.transaction(true, async (c) => {
      const stage = await readGenerationStage(c, id.data);
      if (stage.sealed) throw new DuckDbGenerationError('CAPTURE_SEALED');
      const batch = validateGenerationBatch(stage.request.schema.columns, rows);
      const rowCount = stage.rows + BigInt(batch.rows.length);
      const bytes = stage.bytes + BigInt(batch.logicalBytes);
      if (
        rowCount > BigInt(this.limits.maxRows) ||
        bytes > BigInt(this.limits.maxLogicalBytes) ||
        (stage.request.policy.kind === 'sample' &&
          rowCount > BigInt(stage.request.policy.requestedRows))
      ) {
        throw new DuckDbGenerationError('CAPTURE_BUDGET');
      }
      // Appenders may cast values: reject physical schema drift before any native write.
      await validateGenerationRelationSchema(c, stage);
      this.checkAbort();
      const { DuckDBDataChunk, BIGINT, BOOLEAN, VARCHAR } = await import('@duckdb/node-api');
      const types = stage.request.schema.columns.map((column) => {
        if (column.localType === 'BIGINT') return BIGINT;
        if (column.localType === 'BOOLEAN') return BOOLEAN;
        if (column.localType === 'VARCHAR') return VARCHAR;
        throw new DuckDbGenerationError('UNSUPPORTED_SCHEMA');
      });
      const chunk = DuckDBDataChunk.create(types);
      chunk.setRows(batch.rows);
      const appender = await c.createAppender(stage.key, 'dvt_store');
      try {
        this.checkAbort();
        appender.appendDataChunk(chunk);
        appender.flushSync();
      } finally {
        // Close also flushes. Any failure reaches the enclosing transaction's rollback.
        appender.closeSync();
      }
      this.checkAbort();
      // Updating this same capture row makes concurrent append/promotion conflict rather than race.
      await c.run(
        'UPDATE dvt_meta.staged_captures SET row_count=$1, logical_bytes=$2 WHERE capture_id=$3',
        [rowCount, bytes, id.data]
      );
    });
  }
  public async promote(input: unknown): Promise<Receipt> {
    const parsed = LocalDataGenerationManifestV1Schema.safeParse(input);
    if (!parsed.success) throw new DuckDbGenerationError('INVALID_MANIFEST');
    const manifest = parsed.data;
    const json = jcsCanonicalize(manifest);
    return this.transaction<Receipt>(true, async (c) => {
      const stage = await readGenerationStage(c, manifest.captureId);
      if (
        stage.dataset !== manifest.localDatasetId ||
        stage.generation !== manifest.generationId ||
        stage.fingerprint !== manifest.requestFingerprint
      )
        throw new DuckDbGenerationError('MANIFEST_MISMATCH');
      if (stage.sealed) {
        const prior = await readStoredGeneration(c, stage.dataset, stage.generation);
        if (!prior || jcsCanonicalize(prior) !== json)
          throw new DuckDbGenerationError('MANIFEST_MISMATCH');
        return { disposition: 'already_published', generation: prior };
      }
      if (
        stage.rows !== BigInt(manifest.rowCount) ||
        (manifest.logicalByteCount !== undefined &&
          stage.bytes !== BigInt(manifest.logicalByteCount))
      ) {
        throw new DuckDbGenerationError('ROW_COUNT_MISMATCH');
      }
      await validateGenerationRelation(c, stage);
      await c.run('INSERT INTO dvt_meta.generation_manifests VALUES ($1,$2,$3,$4,$5,$6)', [
        manifest.generationId,
        stage.dataset,
        stage.capture,
        stage.fingerprint,
        stage.key,
        json,
      ]);
      await c.run('UPDATE dvt_meta.staged_captures SET sealed=true WHERE capture_id=$1', [
        stage.capture,
      ]);
      const head =
        stage.expected === null
          ? await c.runAndReadAll(
              `INSERT INTO dvt_meta.dataset_heads SELECT $1,$2
            WHERE NOT EXISTS (SELECT 1 FROM dvt_meta.dataset_heads WHERE local_dataset_id=$1) RETURNING generation_id`,
              [stage.dataset, stage.generation]
            )
          : await c.runAndReadAll(
              `UPDATE dvt_meta.dataset_heads SET generation_id=$1
            WHERE local_dataset_id=$2 AND generation_id=$3 RETURNING generation_id`,
              [stage.generation, stage.dataset, stage.expected]
            );
      if (head.getRows().length !== 1) throw new DuckDbGenerationError('HEAD_CONFLICT');
      return { disposition: 'published', generation: manifest };
    });
  }
  public readGeneration(
    datasetId: string,
    generationId: string
  ): Promise<LocalDataGenerationManifestV1 | null> {
    const dataset = LocalDatasetIdV1Schema.safeParse(datasetId);
    const generation = LocalDataGenerationIdV1Schema.safeParse(generationId);
    if (!dataset.success || !generation.success)
      return Promise.reject(new DuckDbGenerationError('INVALID_INPUT'));
    return this.transaction(false, (c) => readStoredGeneration(c, dataset.data, generation.data));
  }
  public readHead(datasetId: string): Promise<LocalDataGenerationManifestV1 | null> {
    const id = LocalDatasetIdV1Schema.safeParse(datasetId);
    if (!id.success) return Promise.reject(new DuckDbGenerationError('INVALID_INPUT'));
    return this.transaction(false, async (c) => {
      const rows = (
        await c.runAndReadAll(
          'SELECT generation_id FROM dvt_meta.dataset_heads WHERE local_dataset_id=$1',
          [id.data]
        )
      ).getRows();
      if (!rows.length) return null;
      const manifest = await readStoredGeneration(c, id.data, String(rows[0]![0]));
      if (!manifest || rows.length !== 1) throw new DuckDbGenerationError('CORRUPT_METADATA');
      return manifest;
    });
  }
  public readCapture(
    datasetId: string,
    captureId: string
  ): Promise<LocalDataGenerationManifestV1 | null> {
    const dataset = LocalDatasetIdV1Schema.safeParse(datasetId);
    const capture = LocalDataCaptureIdV1Schema.safeParse(captureId);
    if (!dataset.success || !capture.success)
      return Promise.reject(new DuckDbGenerationError('INVALID_INPUT'));
    return this.transaction(false, async (c) => {
      const rows = (
        await c.runAndReadAll(
          `SELECT generation_id FROM dvt_meta.generation_manifests
        WHERE local_dataset_id=$1 AND capture_id=$2`,
          [dataset.data, capture.data]
        )
      ).getRows();
      if (!rows.length) return null;
      const manifest = await readStoredGeneration(c, dataset.data, String(rows[0]![0]));
      if (!manifest || rows.length !== 1) throw new DuckDbGenerationError('CORRUPT_METADATA');
      return manifest;
    });
  }
  private checkAbort(): void {
    if (this.access.signal.aborted) throw new DuckDbGenerationError('ACCESS_REJECTED');
  }
  private async authorize(promotion: boolean): Promise<void> {
    this.checkAbort();
    try {
      await (promotion ? this.access.beforePromotion() : this.access.checkpoint());
    } catch {
      throw new DuckDbGenerationError('ACCESS_REJECTED');
    }
    this.checkAbort();
  }
  private async transaction<T>(
    write: boolean,
    action: (c: DuckDBConnection) => Promise<T>,
    verify = true
  ): Promise<T> {
    await this.authorize(write);
    const outcome = await this.runtime.withSession(this.scope, async (c) => {
      await c.run('BEGIN TRANSACTION');
      try {
        if (verify) await validateGenerationStorageIdentity(c, this.scopeJson);
        const value = await action(c);
        await this.authorize(write);
        await c.run('COMMIT');
        return { ok: true, value } as const;
      } catch (error) {
        await c.run('ROLLBACK'); // A rollback failure is propagated through the native runtime, never suppressed.
        const code: GenerationFailure =
          error instanceof DuckDbGenerationError ? error.code : 'TRANSACTION_FAILED';
        return { ok: false, code } as const;
      }
    });
    if (!outcome.ok) throw new DuckDbGenerationError(outcome.code);
    return outcome.value;
  }
}

/**
 * Owned concern: application-facing, scoped acquisition and generation-writing ports.
 * @baseline #3394: capture coordinates existing source and LOCAL adapters, never Preview DTOs.
 * @decision Keep provider/native types, credentials and SQL behind the adapter boundary.
 * @consequence withCursor resolves only after successful provider closure; no transaction spans stores.
 */
import type {
  LocalDataAcquisitionRequestV1,
  LocalDataGenerationManifestV1,
  LocalDataSchemaV1,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { ILocalDataOperationAccess } from './localDataPlane.js';
import type { WarehouseSourceObjectProbeTarget } from './warehouseSourceImport.js';

export type LocalDataCaptureLimits = Readonly<{ maxRows: number; maxLogicalBytes: number }>;
export type RemoteDatasetBatch = Readonly<{
  rows: readonly (readonly unknown[])[];
  logicalBytes: number;
  endOfSource: boolean;
}>;

/** Typed rows remain positional; adapters validate their own admitted value profile. */
export interface IRemoteDatasetCursor {
  readonly schema: LocalDataSchemaV1;
  readonly observedAt: string;
  read(maxRows: number): Promise<RemoteDatasetBatch>;
}

export type RemoteDatasetReadInput = Readonly<{
  target: WarehouseSourceObjectProbeTarget;
  access: ILocalDataOperationAccess;
  limits: LocalDataCaptureLimits;
  timeoutMs: number;
}>;

export interface IRemoteDatasetReader {
  /** Closure failure rejects even when consume resolved. Consumers must await this before promotion. */
  withCursor<T>(input: RemoteDatasetReadInput, consume: (cursor: IRemoteDatasetCursor) => Promise<T>): Promise<T>;
}

export type LocalDataCaptureReceipt = Readonly<{
  disposition: 'published' | 'already_published';
  generation: LocalDataGenerationManifestV1;
}>;

/** Bound once to the authorized workspace/access/budget by the server-owned factory. */
export interface ILocalDataCaptureWriter {
  initialize(): Promise<void>;
  begin(input: Readonly<{
    localDatasetId: string;
    captureId: string;
    request: LocalDataAcquisitionRequestV1;
    expectedHeadGenerationId: string | null;
  }>): Promise<Readonly<{ captureId: string; generationId: string }>>;
  append(captureId: string, rows: readonly (readonly unknown[])[]): Promise<void>;
  /** Atomic promotion and final authorization belong to the writer, not this port. */
  promote(manifest: LocalDataGenerationManifestV1): Promise<LocalDataCaptureReceipt>;
}

export type LocalDataCaptureWriterFactory = (
  scope: WorkspaceGraphDraftScope,
  access: ILocalDataOperationAccess,
  limits: LocalDataCaptureLimits
) => ILocalDataCaptureWriter;

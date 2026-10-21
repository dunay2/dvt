/**
 * Owned concern: describe an authorized, row-free read of one LOCAL generation.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Current principal/workspace authorization belongs to the application query.
 * @consequence No ID, hash, stored manifest or checkpoint can act as an authorization token.
 * @version 1.0.0
 */
import type {
  DataAccessSelection,
  LocalDataGenerationManifestV1,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';

export type LocalDataOperationContext = Readonly<{
  principal: AuthenticatedPrincipal;
  scope: WorkspaceGraphDraftScope;
  requestId: string;
}>;

/** An exact committed outcome selector; it never requests another acquisition. */
export type LocalDataCaptureSelection = Readonly<{
  localDatasetId: string;
  captureId: string;
}>;

export interface ILocalDataGenerationReader {
  /**
   * The application query authorizes context before lookup and rechecks before returning.
   * null means absent within that authorized scope; adapter failures must not return null.
   * The returned manifest must match both selection IDs; no fallback to the latest head.
   */
  readGeneration(
    context: LocalDataOperationContext,
    selection: Extract<DataAccessSelection, { mode: 'local' }>
  ): Promise<LocalDataGenerationManifestV1 | null>;
  /** Same current view authorization; unpublished stages are not committed generations. */
  readCapture(
    context: LocalDataOperationContext,
    selection: LocalDataCaptureSelection
  ): Promise<LocalDataGenerationManifestV1 | null>;
}

/**
 * Narrow application-owned checkpoint port shared by the source and local store.
 * Implementations revalidate the current operation; beforePromotion additionally
 * requires capture permission. This is not a grant, token or commit certificate.
 */
export interface ILocalDataOperationAccess {
  readonly signal: globalThis.AbortSignal;
  checkpoint(): Promise<void>;
  beforePromotion(): Promise<void>;
}

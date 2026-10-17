/**
 * Owned concern: describe an authorized, row-free read of one LOCAL generation.
 * Authorization remains with the API use case, not an ID, hash or this port.
 * No implementation is composed by #3391; #3392/#3393 own authorization/persistence.
 */
import type {
  DataAccessSelection,
  LocalDataGenerationManifestV1,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

export interface ILocalDataGenerationReader {
  /**
   * Call only after current scope/action authorization. Recheck as required by #3392.
   * null means absent within that authorized scope; adapter failures must not return null.
   * The returned manifest must match both selection IDs; no fallback to the latest head.
   */
  readGeneration(
    scope: WorkspaceGraphDraftScope,
    selection: Extract<DataAccessSelection, { mode: 'local' }>
  ): Promise<LocalDataGenerationManifestV1 | null>;
}

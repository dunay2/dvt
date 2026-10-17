/** Owned concern: expose catalogue recovery without coupling presentation to a hook or port. */
import type { SourceImportRequestState } from './sourceImportRequestState';

export interface SourceImportCatalogRecoveryBinding {
  readonly model: SourceImportRequestState<void>;
  retry(): void;
}

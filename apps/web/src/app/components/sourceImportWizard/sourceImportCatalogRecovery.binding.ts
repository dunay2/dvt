/** Owned concern: expose catalogue failure and explicit recovery to a passive view. */
import type { SourceImportFailure } from './types';

export interface SourceImportCatalogRecoveryBinding {
  readonly failure: SourceImportFailure | null;
  retry(): void;
}

/** Owned concern: decide whether Canvas document creation commands can be exposed. */
import type { GraphDraftQueryState } from './canvasDraftLifecycle.types';

export type CanvasCreateCanvasDocumentAvailabilityInput = Readonly<{
  canPersistGraphDraft: boolean;
  graphDraftQuery: Pick<GraphDraftQueryState, 'data' | 'isPending' | 'isError'>;
}>;

export function deriveCanCreateCanvasDocument({
  canPersistGraphDraft,
  graphDraftQuery,
}: CanvasCreateCanvasDocumentAvailabilityInput): boolean {
  return canPersistGraphDraft && !graphDraftQuery.isPending && !graphDraftQuery.isError;
}

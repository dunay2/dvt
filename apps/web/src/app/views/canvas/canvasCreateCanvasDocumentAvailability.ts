/** Owned concern: decide whether the first Canvas document creation command can be exposed. */
import type { GraphDraftQueryState } from './canvasDraftLifecycle.types';

export type CanvasCreateCanvasDocumentAvailabilityInput = Readonly<{
  canPersistGraphDraft: boolean;
  graphDraftQuery: Pick<GraphDraftQueryState, 'data' | 'isPending' | 'isError'>;
}>;

export function deriveCanCreateCanvasDocument({
  canPersistGraphDraft,
  graphDraftQuery,
}: CanvasCreateCanvasDocumentAvailabilityInput): boolean {
  return (
    canPersistGraphDraft &&
    graphDraftQuery.data?.record == null &&
    !graphDraftQuery.isPending &&
    !graphDraftQuery.isError
  );
}

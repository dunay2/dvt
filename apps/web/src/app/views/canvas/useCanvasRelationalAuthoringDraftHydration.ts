/** Hydrate persisted incomplete authoring without making it semantic authority. */
import { useEffect, useMemo } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import {
  readCanvasRelationalAuthoringDraft,
  restoreCanvasRelationalAuthoringDraft,
} from './canvasRelationalAuthoringDraft';

type DraftState = Pick<
  ReturnType<typeof useCanvasRelationalTreeDraftState>,
  'reset' | 'restoreIncomplete'
>;

export function useCanvasRelationalAuthoringDraftHydration(
  args: Readonly<{
    enabled: boolean;
    transformNode: CanonicalNode;
    inputs: readonly CanvasDvtCompositionInput[];
    hydrateExisting: () => boolean;
    state: DraftState;
  }>
): void {
  const { reset, restoreIncomplete } = args.state;
  const persisted = useMemo(
    () => readCanvasRelationalAuthoringDraft(args.transformNode),
    [args.transformNode]
  );
  const restored = useMemo(
    () =>
      persisted == null ? null : restoreCanvasRelationalAuthoringDraft(persisted, args.inputs),
    [args.inputs, persisted]
  );
  useEffect(() => {
    reset();
    if (!args.enabled || restored == null) return;
    args.hydrateExisting();
    restoreIncomplete(restored);
  }, [args.enabled, args.hydrateExisting, reset, restoreIncomplete, restored]);
}

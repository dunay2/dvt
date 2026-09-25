/** Reopen a document unchanged; hydration is never a composition command. */
import { useCallback, useMemo, useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import {
  resolveCanvasRelationalTreeExistingDraft,
  type CanvasRelationalTreeExistingDraft,
} from './canvasRelationalTreeExistingDraft';
import type { CanvasRelationalTreeProjection } from './canvasRelationalTreeProjection';

export type CanvasRelationalTreeSeedHydration = CanvasRelationalTreeExistingDraft &
  Readonly<{ appendInputId: string | null }>;

export function useCanvasRelationalTreeExistingSeed(
  args: Readonly<{
    document: SubstraitDocument | null;
    projection: CanvasRelationalTreeProjection | null;
    onHydrate: (seed: CanvasRelationalTreeSeedHydration) => void;
  }>
) {
  const { document, projection, onHydrate } = args;
  const [baselineDraft, setBaselineDraft] = useState<SubstraitDocument | null>(null);
  const seed = useMemo(
    () => resolveCanvasRelationalTreeExistingDraft({ document, projection }),
    [projection, document]
  );
  const hydrateExisting = useCallback((): boolean => {
    if (seed == null) return false;
    setBaselineDraft(seed.draft);
    onHydrate({ ...seed, appendInputId: null });
    return true;
  }, [onHydrate, seed]);
  return { hydrateExisting, baselineDraft, seed };
}

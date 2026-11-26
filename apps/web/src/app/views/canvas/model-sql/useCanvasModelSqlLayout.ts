/**
 * Own the one-shot presentation intention of an accepted contextual Generate command.
 * @baseline GH-3747: Model placement belongs to the existing scoped local layout rail.
 * @decision Capture privately and retain only the matching accepted Generate transition.
 * @consequence Cancellation and ordinary Apply create no automatic placement anchors.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { jcsCanonicalize } from '@dvt/crypto';
import type { CanonicalNode } from '../../../types/canonical';
import { useCanvasInteractionStore } from '../../../stores/canvasInteractionStore';
import { readDvtTransformAuthoringAuthority } from '../canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from '../canvasDvtSubstraitSemanticDocument';
import { captureCanvasModelLayout } from '../canvasModelLayoutReconciliation';
import type {
  CanvasModelLayoutCapture,
  CanvasModelLayoutRetention,
  CanvasModelLayoutTransition,
} from '../canvasRelationalTreeWorkbench.types';

type CanvasModelLayoutOwner = {
  layoutKey: string | undefined;
  document: SubstraitDocument | null;
  epoch: number;
};

function readModelLayoutDocument(node: CanonicalNode): SubstraitDocument | null {
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    return authority == null
      ? null
      : decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
  } catch {
    return null;
  }
}

function createCanvasModelLayoutRetention({
  before,
  target,
  owner,
  live,
  publish,
}: Readonly<{
  before: CanvasModelLayoutOwner;
  target: Parameters<CanvasModelLayoutCapture>[0];
  owner: RefObject<CanvasModelLayoutOwner>;
  live: RefObject<boolean>;
  publish: (value: Readonly<{ epoch: number; value: CanvasModelLayoutRetention }>) => void;
}>): ReturnType<CanvasModelLayoutCapture> {
  if (before.layoutKey == null || before.document == null) return undefined;
  const sourceIdentity = jcsCanonicalize(before.document.sidecar);
  const targetIdentity = jcsCanonicalize(target.sidecar);
  if (sourceIdentity === targetIdentity) return undefined;
  const stored =
    useCanvasInteractionStore.getState().canvasLayouts[before.layoutKey]?.nodePositions;
  const value: CanvasModelLayoutRetention = {
    layoutKey: before.layoutKey,
    sourceDocumentIdentity: sourceIdentity,
    targetDocumentIdentity: targetIdentity,
    positions: captureCanvasModelLayout(before.document, new Map(Object.entries(stored ?? {}))),
  };
  let published = false;
  return () => {
    if (published || !live.current) return;
    if (
      owner.current == null ||
      !canPublishCanvasModelLayoutRetention(owner.current, before, value)
    )
      return;
    published = true;
    publish({ epoch: before.epoch, value });
  };
}

function canPublishCanvasModelLayoutRetention(
  current: CanvasModelLayoutOwner,
  before: Readonly<{ epoch: number }>,
  retention: CanvasModelLayoutRetention
): boolean {
  if (current.epoch !== before.epoch) return false;
  const identity = current.document == null ? null : jcsCanonicalize(current.document.sidecar);
  return (
    identity === retention.sourceDocumentIdentity || identity === retention.targetDocumentIdentity
  );
}

export function useCanvasModelSqlLayout({
  layoutKey,
  node,
  pending,
}: Readonly<{
  layoutKey?: string;
  node: CanonicalNode;
  pending: boolean;
}>): Readonly<{ capture: CanvasModelLayoutCapture; transition: CanvasModelLayoutTransition }> {
  const document = useMemo(() => readModelLayoutDocument(node), [node]);
  const owner = useRef<CanvasModelLayoutOwner>({ layoutKey, document, epoch: 0 });
  const epoch = owner.current.epoch + (owner.current.layoutKey === layoutKey ? 0 : 1);
  owner.current = { layoutKey, document, epoch };
  const live = useRef(true);
  const [retained, setRetained] = useState<Readonly<{
    epoch: number;
    value: CanvasModelLayoutRetention;
  }> | null>(null);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      owner.current.epoch += 1;
    };
  }, []);
  useEffect(() => {
    setRetained((previous) => {
      if (previous == null) return previous;
      return canPublishCanvasModelLayoutRetention(owner.current, previous, previous.value)
        ? previous
        : null;
    });
  }, [document, layoutKey]);
  const capture = useCallback<CanvasModelLayoutCapture>((target) => {
    return createCanvasModelLayoutRetention({
      before: owner.current,
      target,
      owner,
      live,
      publish: setRetained,
    });
  }, []);
  const consume = useCallback((value: CanvasModelLayoutRetention) => {
    setRetained((previous) => (previous?.value === value ? null : previous));
  }, []);
  const transition = useMemo<CanvasModelLayoutTransition>(
    () => ({
      pending,
      accepted: retained?.epoch === epoch ? retained.value : null,
      consume,
    }),
    [pending, retained, epoch, consume]
  );
  return { capture, transition };
}

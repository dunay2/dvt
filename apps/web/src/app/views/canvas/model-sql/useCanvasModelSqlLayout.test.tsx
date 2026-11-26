// @vitest-environment jsdom
/**
 * Generate owns a scoped, one-shot presentation snapshot rather than another save or cache.
 * @baseline GH-3747: The scoped local layout rail retains presentation independently of semantics.
 * @decision Exercise acceptance, disposal, document and Model identity fences with the real hook.
 * @consequence The proof never adds another persistence path or semantic write.
 */
import React, { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { jcsCanonicalize } from '@dvt/crypto';
import type { CanonicalNode } from '../../../types/canonical';
import { useCanvasInteractionStore } from '../../../stores/canvasInteractionStore';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from '../canvasDvtTransformAuthoringAuthority';
import { projectionTarget } from '../CanvasRelationalTreeWorkbench.operation-drag.test-support';
import {
  root,
  setupWorkbenchTest,
  sourceNode,
} from '../CanvasRelationalTreeWorkbench.test-support';
import { useCanvasModelSqlLayout } from './useCanvasModelSqlLayout';

describe('accepted contextual Generate layout intention', () => {
  setupWorkbenchTest();
  const source = sourceNode('customers', 'customers');
  const original = projectionTarget(source);
  const originalDocument = readDvtTransformAuthoringAuthority(original)!.semanticDocument;
  const targetDocument = readDvtTransformAuthoringAuthority(
    projectionTarget(source)
  )!.semanticDocument;
  let state: ReturnType<typeof useCanvasModelSqlLayout>;
  function Observe({
    layoutKey,
    node,
  }: Readonly<{ layoutKey?: string; node: CanonicalNode }>): null {
    state = useCanvasModelSqlLayout({ layoutKey, node, pending: false });
    return null;
  }
  const show = async (layoutKey: string | undefined = 'first', node = original): Promise<void> => {
    await act(async () => root.render(<Observe layoutKey={layoutKey} node={node} />));
  };
  beforeEach(() => useCanvasInteractionStore.setState({ _hasHydrated: true, canvasLayouts: {} }));

  it('captures privately, publishes once on acceptance and consumes without touching persistence', async () => {
    await show();
    const accept = state.capture(targetDocument)!;
    expect(state.transition.accepted).toBeNull();
    expect(useCanvasInteractionStore.getState().canvasLayouts).toEqual({});
    await act(async () => accept());
    const retained = state.transition.accepted!;
    expect(targetDocument.semanticPlan.sha256).toBe(originalDocument.semanticPlan.sha256);
    expect(targetDocument.sidecar).not.toEqual(originalDocument.sidecar);
    expect(retained.layoutKey).toBe('first');
    expect(retained.targetDocumentIdentity).toBe(jcsCanonicalize(targetDocument.sidecar));
    expect(retained.positions.size).toBe(3);
    await act(async () => state.transition.consume(retained));
    expect(state.transition.accepted).toBeNull();
    await act(async () => accept());
    expect(state.transition.accepted).toBeNull();
    expect(useCanvasInteractionStore.getState().canvasLayouts).toEqual({});
  });
  it('does not publish after a binding changes away and back to the same layout key', async () => {
    await show();
    const accept = state.capture(targetDocument)!;
    await show('other');
    await show('first');
    await act(async () => accept());
    expect(state.transition.accepted).toBeNull();
    expect(useCanvasInteractionStore.getState().canvasLayouts).toEqual({});
  });
  it('does not attach a prepared snapshot to an unrelated accepted document', async () => {
    await show();
    const accept = state.capture(targetDocument)!;
    await show('first', projectionTarget(source));
    await act(async () => accept());
    expect(state.transition.accepted).toBeNull();
    expect(useCanvasInteractionStore.getState().canvasLayouts).toEqual({});
  });
  it('invalidates a prepared acknowledgement on unmount', async () => {
    await show();
    const accept = state.capture(targetDocument)!;
    await act(async () => root.render(null));
    await act(async () => accept());
    expect(state.transition.accepted).toBeNull();
    expect(useCanvasInteractionStore.getState().canvasLayouts).toEqual({});
  });
  it('keeps an accepted intention available when its exact target arrives before consumption', async () => {
    await show();
    const accept = state.capture(targetDocument)!;
    await show('first', applyDvtSubstraitSemanticDocument(original, targetDocument));
    await act(async () => accept());
    expect(state.transition.accepted?.targetDocumentIdentity).toBe(
      jcsCanonicalize(targetDocument.sidecar)
    );
  });
  it('does not create a persistent key for an unscoped Model', async () => {
    await act(async () => root.render(<Observe node={original} />));
    expect(state.capture(targetDocument)).toBeUndefined();
    expect(useCanvasInteractionStore.getState().canvasLayouts).toEqual({});
  });
});

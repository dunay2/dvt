/** Prove Model Apply awaits its existing atomic command before changing the local transaction. */
import { describe, expect, it, vi } from 'vitest';
import { createCanvasRelationalTreeApplyCommand } from './canvasRelationalTreeApplyCommand';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import type { CanvasInspectorNodeDraftApplyResult } from './canvasInspectorAuthoring.types';

describe('Model Apply with staged Input changes', () => {
  it.each([false, true])(
    'awaits accepted or rejected atomic Apply before resetting (rejected: %s)',
    async (rejected) => {
      const graph = occurrenceGraph();
      let finish!: (result: CanvasInspectorNodeDraftApplyResult) => void;
      const pending = new Promise<CanvasInspectorNodeDraftApplyResult>((resolve) => {
        finish = resolve;
      });
      const onApplyNodeDraft = vi.fn(() => pending);
      const reset = vi.fn();
      const reject = vi.fn();
      const inputChanges = { inputAdditions: [{ nodeId: graph.source.id, columnId: 'parent_id' }] };
      const apply = createCanvasRelationalTreeApplyCommand({
        authoring: { canEditNode: true, onApplyNodeDraft },
        editable: true,
        joinDraft: graph.draft,
        operation: 'left_join',
        transformNode: graph.targetNode,
        inputChanges,
        reset,
        reject,
      });
      const result = apply();
      expect(reset).not.toHaveBeenCalled();
      expect(reject).not.toHaveBeenCalled();
      expect(onApplyNodeDraft).toHaveBeenCalledWith(
        graph.targetNode.id,
        expect.any(Object),
        inputChanges
      );
      const outcome = rejected
        ? ({ outcome: 'rejected', reason: 'invalid_draft' } as const)
        : ({ outcome: 'no_changes' } as const);
      finish(outcome);
      expect(await result).toEqual(outcome);
      if (rejected) {
        expect(reject).toHaveBeenCalledWith(outcome);
        expect(reset).not.toHaveBeenCalled();
      } else expect(reset).toHaveBeenCalledOnce();
    }
  );
});

/** Apply persists the edited document; it never silently authors a replacement. */
import { describe, expect, it, vi } from 'vitest';
import { graphModel } from './canvasRelationGraph.test-support';
import { useCanvasRelationalTreeApplyCommand } from './useCanvasRelationalTreeApplyCommand';

describe('canonical draft apply', () => {
  it.each(['projection', 'union_all'] as const)(
    'rejects missing %s documents instead of inventing one',
    (operation) => {
      const transformNode = graphModel();
      const onApplyNodeDraft = vi.fn();
      const apply = useCanvasRelationalTreeApplyCommand({
        editable: true,
        authoring: { canEditNode: true, onApplyNodeDraft },
        transformNode,
        operation,
        joinDraft: null,
        reject: vi.fn(),
        reset: vi.fn(),
      });
      expect(apply().outcome).toBe('rejected');
      expect(onApplyNodeDraft).not.toHaveBeenCalled();
    }
  );
});

import { describe, expect, it } from 'vitest';
import type { NodePropertiesReadModel } from '../../components/inspector/nodePropertiesReadModel';
import { buildNodeWorkbenchReadModel } from './canvasNodeWorkbenchReadModel';
import { transformNode } from './CanvasRelationalTreeWorkbench.test-support';

describe('node code section ownership', () => {
  it.each([true, false])(
    'preserves an invalid canonical authority diagnostic with editor access %s',
    (canEditNode) => {
      const section = {
        id: 'code',
        label: 'Code',
        rows: [],
        tableRows: [],
        emptyState: 'Invalid canonical document',
      } as const;
      const model: NodePropertiesReadModel = {
        nodeId: 'transform',
        nodeName: 'Model',
        sections: [section],
      };
      const result = buildNodeWorkbenchReadModel({
        model,
        node: transformNode(),
        canEditNode,
        supersededRowIdsBySection: new Map(),
        supersededSectionIds: new Set(),
        contributedSectionIds: new Set(),
        codeTruth: { kind: 'unavailable', reason: 'invalid-canonical-substrait-document' },
      });
      expect(result.sections[0]?.emptyState).toBe(section.emptyState);
    }
  );
});

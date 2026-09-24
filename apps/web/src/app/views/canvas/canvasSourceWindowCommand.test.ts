import { describe, expect, it } from 'vitest';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { inspectDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyCanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorCommands';
import { removeCanvasRelationalTreeNode } from './canvasRelationalTreeRemoval';

describe('source ROW_NUMBER command', () => {
  it('roundtrips a window output without altering its source, and rejects an unknown field', () => {
    const draft = connectedNamesProjectionDraft();
    const initial = inspectDvtSubstraitProjectionDraft(draft);
    if (!initial.ok) throw new Error('Expected source projection');
    const baseline = encodeDvtSubstraitSemanticDocument(draft);
    const window = applyCanvasRelationalOperatorTool(draft, {
      tool: 'window',
      fieldId: initial.projection.outputs[0]!.fieldId,
      alias: 'position',
    });
    const inspected = inspectDvtSubstraitProjectionDraft(window);
    if (!inspected.ok) throw new Error('Expected window projection');
    expect(inspected.projection.outputs.at(-1)?.calculation?.kind).toBe('row-number');
    const retired = removeCanvasRelationalTreeNode({
      draft: window,
      relationId: inspected.projection.targetRelationId,
      targetNodeId: 'model',
    });
    expect(retired.ok).toBe(true);
    if (retired.ok) expect(retired.draft.sidecar.fields).toEqual(draft.sidecar.fields);
    expect(
      applyCanvasRelationalOperatorTool(draft, {
        tool: 'window',
        fieldId: 'missing',
        alias: 'position',
      })
    ).toBe(draft);
    expect(encodeDvtSubstraitSemanticDocument(draft)).toEqual(baseline);
  });
});

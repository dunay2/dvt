import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import {
  projectGraphNodeColumn,
  projectInteractiveCanvasColumns,
  selectGraphNodeCardColumns,
} from './canvasGraphNodeColumnProjection';
import { canvasColumnTruth } from './canvasPresentationColumns';
import type { CanvasNodePresentationColumn } from '../../components/canvas/canvasNodePresentationTruth.contract';

describe('pending composition field identities', () => {
  it.each([2, 3])('keeps selected and pending homonyms distinct across %i inputs', (count) => {
    const inputs: CanvasNodePresentationColumn[] = Array.from({ length: count }, (_, index) => ({
      name: 'shared_id',
      type: 'string',
      provenance: 'inherited',
      sourceNodeId: `source-${index}`,
      reference: `source-${index}:field`,
    }));
    const output: CanvasNodePresentationColumn = {
      ...inputs[0]!,
      provenance: 'declared',
      sourceFieldName: 'shared_id',
      reference: 'output:field',
      selected: true,
    };
    const presentationTruth = {
      code: { kind: 'unavailable' as const },
      columns: canvasColumnTruth([output], inputs, [output]),
      relationalComposition: {
        state: 'pending' as const,
        connectedInputCount: count,
        pendingInputCount: count - 1,
      },
    };
    const card = selectGraphNodeCardColumns(presentationTruth).map((column) =>
      projectGraphNodeColumn(column, column.selected ?? false)
    );
    const node: Node = {
      id: 'model',
      position: { x: 0, y: 0 },
      data: { role: 'transform', presentationTruth, columns: card },
    };
    const interactive = projectInteractiveCanvasColumns(node, new Map());
    expect(interactive.map((column) => column.id)).toEqual(card.map((column) => column.id));
    expect(new Set(interactive.map((column) => column.id)).size).toBe(count);
    expect(interactive.filter((column) => column.output).map((column) => column.id)).toEqual([
      'output:field',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { source } from './canvasRelationalOperator.test-support';
import {
  createDvtSubstraitJoinDraft,
  inspectDvtSubstraitJoinAcceptedDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitSetDraft,
  inspectDvtSubstraitUnionAllAcceptedDraft,
  type DvtSubstraitUnionAllDraft,
} from './canvasDvtSubstraitSetComposition';
import {
  encodeDvtSubstraitSemanticDocument,
  decodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasRelationalOperatorTools } from './canvasRelationalTreeOperatorModel';
import { applyCanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorCommands';

describe('canvasGroupedOperationRoundtrip', () => {
  for (const shape of [
    'inner_join',
    'union_all',
    'intersect_distinct',
    'except_distinct',
    'intersect_all',
    'except_all',
  ] as const) {
    const fixture = (): DvtSubstraitUnionAllDraft =>
      shape === 'inner_join'
        ? createDvtSubstraitJoinDraft({
            left: source('customers'),
            right: source('orders'),
            targetNodeId: 'model',
          })
        : createDvtSubstraitSetDraft({
            inputs: [source('north'), source('south'), source('west')],
            targetNodeId: 'model',
            operation: shape,
          });
    it(`${shape}: groups, windows, persists and removes without replacing source identities`, () => {
      const original = fixture();
      const group = resolveCanvasRelationalOperatorTools(original).find(
        (tool) => tool.id === 'aggregate'
      )!;
      expect(group.enabled).toBe(true);
      const grouped = applyCanvasRelationalOperatorTool(original, {
        tool: 'aggregate',
        fieldId: group.fields[0]!.fieldId,
        alias: 'total',
      });
      expect(grouped).not.toBe(original);
      const window = resolveCanvasRelationalOperatorTools(grouped).find(
        (tool) => tool.id === 'window'
      )!;
      expect(window.enabled).toBe(true);
      const windowed = applyCanvasRelationalOperatorTool(grouped, {
        tool: 'window',
        alias: 'position',
      });
      const reloaded = decodeDvtSubstraitSemanticDocument(
        encodeDvtSubstraitSemanticDocument(windowed)
      );
      const inspect =
        shape === 'inner_join'
          ? inspectDvtSubstraitJoinAcceptedDraft
          : inspectDvtSubstraitUnionAllAcceptedDraft;
      expect(inspect(reloaded).ok).toBe(true);
      expect(reloaded.sidecar.relations).toEqual(windowed.sidecar.relations);
      expect(reloaded.sidecar.fields).toEqual(windowed.sidecar.fields);
      expect(
        resolveCanvasRelationalOperatorTools(reloaded).find((tool) => tool.id === 'window')?.active
      ).toBe(true);
      const unwindowed = applyCanvasRelationalOperatorTool(reloaded, {
        tool: 'window',
        remove: true,
      });
      const ungrouped = applyCanvasRelationalOperatorTool(unwindowed, {
        tool: 'aggregate',
        remove: true,
      });
      expect(inspect(ungrouped).ok).toBe(true);
      expect(ungrouped.sidecar.relations.map((r) => r.relationId)).toEqual(
        original.sidecar.relations.map((r) => r.relationId)
      );
    });
    it(`${shape}: rejects stale fields, duplicate/invalid aliases and premature windows`, () => {
      const draft = fixture();
      const group = resolveCanvasRelationalOperatorTools(draft).find(
        (tool) => tool.id === 'aggregate'
      )!;
      expect(
        applyCanvasRelationalOperatorTool(draft, {
          tool: 'aggregate',
          fieldId: 'missing',
          alias: 'total',
        })
      ).toBe(draft);
      expect(
        applyCanvasRelationalOperatorTool(draft, {
          tool: 'aggregate',
          fieldId: group.fields[0]!.fieldId,
          alias: group.fields[0]!.name,
        })
      ).toBe(draft);
      expect(
        applyCanvasRelationalOperatorTool(draft, {
          tool: 'aggregate',
          fieldId: group.fields[0]!.fieldId,
          alias: '\u0000',
        })
      ).toBe(draft);
      expect(applyCanvasRelationalOperatorTool(draft, { tool: 'window', alias: 'rn' })).toBe(draft);
    });
  }
});

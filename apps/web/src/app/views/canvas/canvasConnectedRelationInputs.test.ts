import { describe, expect, it } from 'vitest';
import { hasConnectedRelationInputs } from './canvasConnectedRelationInputs';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';

describe('physical source binding for composed occurrences', () => {
  it('binds repeated occurrences to one physical dependency without changing their identities', () => {
    const graph = occurrenceGraph();
    const snapshot = structuredClone(graph.draft);
    const inputs = resolveCanvasDvtCompositionInputs({
      ...graph,
      targetNodeId: graph.targetNode.id,
    });
    expect(hasConnectedRelationInputs(graph.draft, inputs)).toBe(true);
    expect(graph.draft).toEqual(snapshot);
  });
  it.each(['missing', 'duplicate', 'unused', 'type', 'nullability', 'field-order'] as const)(
    'rejects %s source mismatch without rebinding a retained occurrence',
    (fault) => {
      const graph = occurrenceGraph();
      const inputs = resolveCanvasDvtCompositionInputs({
        ...graph,
        targetNodeId: graph.targetNode.id,
      });
      const source = inputs[0]!;
      const actual =
        fault === 'missing'
          ? []
          : fault === 'duplicate'
            ? [source, source]
            : fault === 'unused'
              ? [source, { ...source, sourceRef: { ...source.sourceRef, sourceObjectId: 'other' } }]
              : [
                  {
                    ...source,
                    fields:
                      fault === 'field-order'
                        ? [...source.fields].reverse()
                        : source.fields.map((field, ordinal) =>
                            ordinal > 0
                              ? field
                              : {
                                  ...field,
                                  ...(fault === 'type'
                                    ? { joinDataType: 'string' as const }
                                    : { nullable: !field.nullable }),
                                }
                          ),
                  },
                ];
      expect(hasConnectedRelationInputs(graph.draft, actual)).toBe(false);
    }
  );
});

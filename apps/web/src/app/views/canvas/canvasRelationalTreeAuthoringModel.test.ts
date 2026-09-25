import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasRelationalTreeAuthoringChoices } from './canvasRelationalTreeAuthoringModel';
import { createCanvasRelationalTreeOperationDraft } from './canvasRelationalTreeOperationDraft';
import { sourceNode, transformNode, edge } from './CanvasRelationalTreeWorkbench.test-support';

function fixture(): Omit<
  Parameters<typeof resolveCanvasRelationalTreeAuthoringChoices>[0],
  'selectedInputIds' | 'readOnly'
> {
  const target = transformNode();
  const sources = ['east', 'west', 'north'].map((id) => sourceNode(id, id));
  const nodes = [...sources, target];
  const edges = sources.map((node) => edge(node.id));
  const inputs = resolveCanvasDvtCompositionInputs({ nodes, edges, targetNodeId: target.id });
  return { targetNodeId: target.id, nodes, edges, inputs };
}

describe('initial relation authoring', () => {
  it('requires two selected inputs for binary composition and denies every write in read-only mode', () => {
    const args = fixture();
    for (const readOnly of [false, true]) {
      const choices = resolveCanvasRelationalTreeAuthoringChoices({
        ...args,
        selectedInputIds: ['east'],
        readOnly,
      });
      expect(choices.find((choice) => choice.operation === 'projection')?.selectable).toBe(
        !readOnly
      );
      expect(
        choices
          .filter((choice) => choice.operation !== 'projection')
          .every((choice) => !choice.selectable)
      ).toBe(true);
      const binary = resolveCanvasRelationalTreeAuthoringChoices({
        ...args,
        selectedInputIds: ['east', 'west'],
        readOnly,
      });
      expect(binary.length).toBeGreaterThan(0);
      expect(binary.every((choice) => choice.selectable === !readOnly)).toBe(true);
    }
  });

  it.each([
    'projection',
    'inner_join',
    'cross_join',
    'union_all',
    'union_distinct',
    'intersect_distinct',
    'except_distinct',
    'intersect_all',
    'except_all',
  ] as const)('constructs %s using exactly the explicit input order', (operation) => {
    const args = fixture();
    const selectedInputIds =
      operation === 'projection'
        ? ['west']
        : operation === 'inner_join'
          ? ['west', 'east']
          : ['west', 'north', 'east'];
    const document = createCanvasRelationalTreeOperationDraft({
      ...args,
      operation,
      selectedInputIds,
    });
    expect(document).not.toBeNull();
    const { index } = deriveSubstraitSchemas(document!);
    const reads = index.postorder
      .map((id) => index.relations.get(id)!)
      .filter((entry) => entry.relation.relType.case === 'read');
    expect(reads.map((entry) => entry.binding.sourceRef)).toEqual(
      selectedInputIds.map((id) => args.inputs.find((input) => input.nodeId === id)!.sourceRef)
    );
    expect(new Set(reads.map((entry) => entry.binding.relationId)).size).toBe(reads.length);
  });

  it('rejects stale selections instead of composing a different source', () => {
    expect(
      createCanvasRelationalTreeOperationDraft({
        ...fixture(),
        operation: 'cross_join',
        selectedInputIds: ['east', 'missing'],
      })
    ).toBeNull();
  });
});

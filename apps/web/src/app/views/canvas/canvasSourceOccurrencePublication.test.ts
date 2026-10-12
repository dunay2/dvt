import { describe, expect, it } from 'vitest';

import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { projectCanvasSourceOccurrencePublication } from './canvasRelationalTreeWorkbenchModel';
import {
  projectPendingCanvasRelationalTreeCatalogue,
  projectCanvasRelationalCatalogueSelection,
} from './canvasRelationalTreeCatalogue';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasPhysicalCompositionInput } from './canvasPhysicalCompositionInput';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';

describe('Source occurrence publication projection', () => {
  it('projects catalogue selection independently from configured participation', () => {
    const graph = occurrenceGraph();
    const input = resolveCanvasPhysicalCompositionInput(graph.source, graph.edges[0]!)!;
    const first = createPendingSourceOccurrence(input);
    const second = createPendingSourceOccurrence(input);
    const catalogue = projectPendingCanvasRelationalTreeCatalogue([input], graph.nodes);
    const args = {
      catalogue,
      authoringAvailable: true,
      selectedLocator: null,
      pending: [first, second],
      selectedOccurrenceId: second.read.binding.relationId,
      operations: [
        {
          id: 'join',
          operation: 'inner_join' as const,
          inputs: [first.read.binding.relationId, null],
        },
      ],
    };
    expect(projectCanvasRelationalCatalogueSelection(args)[0]).toMatchObject({
      state: 'pending',
      selected: true,
      selectable: true,
    });
    expect(
      projectCanvasRelationalCatalogueSelection({
        ...args,
        operations: [
          {
            ...args.operations[0]!,
            semanticDocument: encodeDvtSubstraitSemanticDocument(graph.draft),
          },
        ],
      })[0]
    ).toMatchObject({ state: 'participating', selected: true });
    expect(catalogue[0]).not.toHaveProperty('selected');
  });

  it('uses applied locators in read-only mode and disables empty sources in authoring', () => {
    const item = {
      key: 'empty',
      label: 'Empty',
      sourceNodeId: 'empty',
      state: 'pending' as const,
      treeLocator: 'read:empty',
      fieldCount: 0,
    };
    const args = {
      catalogue: [item],
      authoringAvailable: false,
      selectedLocator: item.treeLocator,
      pending: [],
      selectedOccurrenceId: null,
      operations: [],
    };
    expect(projectCanvasRelationalCatalogueSelection(args)[0]).toEqual({ ...item, selected: true });
    expect(
      projectCanvasRelationalCatalogueSelection({ ...args, authoringAvailable: true })[0]
    ).toMatchObject({ selected: false, selectable: false });
  });

  it('uses the producer publication for applied and pending instances, not physical fields', () => {
    const graph = occurrenceGraph();
    const source = graph.source;
    const projectionSource = resolveDvtSubstraitProjectionSource(source)!;
    const published = applyDvtSubstraitSemanticDocument(
      source,
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: projectionSource,
          targetNodeId: source.id,
          outputs: [{ fieldId: 'id', name: 'id', sourceFieldName: 'id' }],
        })
      )
    );
    const input = resolveCanvasPhysicalCompositionInput(published, graph.edges[0]!);
    if (input == null) throw new Error('Expected an admitted Source input.');
    const pending = createPendingSourceOccurrence(input);
    const fields = projectCanvasSourceOccurrencePublication(
      [
        {
          sourceNodeId: source.id,
          sourceRef: projectionSource.sourceRef,
          relationId: 'applied',
          state: 'participating',
        },
      ],
      [pending],
      [published]
    );
    expect(fields.get('applied')).toEqual(['id']);
    expect(fields.get(pending.read.binding.relationId)).toEqual(['id']);
    expect(projectPendingCanvasRelationalTreeCatalogue([input], [published])[0]?.fieldCount).toBe(
      1
    );
  });
});

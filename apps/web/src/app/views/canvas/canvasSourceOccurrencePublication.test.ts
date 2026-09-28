import { describe, expect, it } from 'vitest';

import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import {
  projectCanvasSourceOccurrencePublication,
  projectPendingCanvasRelationalTreeCatalogue,
} from './canvasRelationalTreeWorkbenchModel';
import { resolveCanvasPhysicalCompositionInput } from './canvasPhysicalCompositionInput';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';

describe('Source occurrence publication projection', () => {
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

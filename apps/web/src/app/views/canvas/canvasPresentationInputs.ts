/** Resolve connected producers by canonical identity, never by a coincident field name. */
import { ConnectedSourceRefSchema } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasPresentationAnalysisEntry } from './canvasPresentationAnalysis';
import { canvasSourceReferenceKey } from './canvasRelationalAnalysis';

export function resolveCanvasPresentationInputs(
  consumer: CanvasPresentationAnalysisEntry,
  inputs: readonly CanonicalNode[]
): CanonicalNode[] {
  const reads = new Set(
    [...consumer.index.relations.values()].flatMap(({ binding }) =>
      binding.sourceRef == null ? [] : [canvasSourceReferenceKey(binding.sourceRef)]
    )
  );
  return inputs.filter((node) => {
    if (node.role !== 'input')
      return [...consumer.index.relations.values()].some(
        ({ binding }) => binding.producerRef?.nodeId === node.id
      );
    const source = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
    return source.success && reads.has(canvasSourceReferenceKey(source.data));
  });
}

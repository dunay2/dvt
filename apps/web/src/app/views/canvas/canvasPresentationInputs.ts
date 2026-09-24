/** Resolve connected producers by canonical identity, never by a coincident field name. */
import { ConnectedSourceRefSchema } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type {
  CanvasPresentationAnalysis,
  CanvasPresentationAnalysisEntry,
} from './canvasPresentationAnalysis';
import { matchesCanvasSubstraitUpstream } from './canvasSubstraitUpstreamBinding';
import { canvasSourceReferenceKey } from './canvasRelationalAnalysis';

export function resolveCanvasPresentationInputs(
  consumer: CanvasPresentationAnalysisEntry,
  inputs: readonly CanonicalNode[],
  analysis: CanvasPresentationAnalysis
): CanonicalNode[] {
  const reads = new Set(
    [...consumer.index.relations.values()].flatMap(({ binding }) =>
      binding.sourceRef == null ? [] : [canvasSourceReferenceKey(binding.sourceRef)]
    )
  );
  return inputs.filter((node) => {
    const producer = analysis.receive(node);
    if (producer != null && node.role !== 'input')
      return matchesCanvasSubstraitUpstream(consumer, producer);
    const source = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
    return source.success && reads.has(canvasSourceReferenceKey(source.data));
  });
}

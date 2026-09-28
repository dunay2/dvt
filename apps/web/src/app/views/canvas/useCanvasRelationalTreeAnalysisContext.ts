/** Derive the revision-bound analysis inputs consumed by authoring commands. */
import { useMemo } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveUnmappedCanvasReadFields } from './canvasInputFieldEligibility';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { useCanvasRelationFields } from './useCanvasRelationFields';

export function useCanvasRelationalTreeAnalysisContext(
  args: Readonly<{
    document: SubstraitDocument | null;
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
  }>
) {
  const connection = useMemo(() => {
    try {
      return resolveCanvasSubstraitGraphBindings({
        node: args.transformNode,
        nodes: args.nodes,
        edges: args.edges,
      }).connection;
    } catch {
      return undefined;
    }
  }, [args.transformNode, args.nodes, args.edges]);
  const deniedInputs = useMemo(
    () =>
      resolveUnmappedCanvasReadFields({
        document: args.document,
        nodeId: args.transformNode.id,
        nodes: args.nodes,
        edges: args.edges,
      }),
    [args.document, args.transformNode.id, args.nodes, args.edges]
  );
  const analysis = useCanvasRelationAnalysisSession(
    args.document,
    args.transformNode.id,
    connection,
    deniedInputs
  );
  return { analysis, output: useCanvasRelationFields(null, analysis).result } as const;
}

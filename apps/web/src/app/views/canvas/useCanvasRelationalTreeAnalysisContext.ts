/**
 * Owned concern: derive graph-bound eligibility consumed by the canonical authoring session.
 * @baseline GH-3596: absent dependencies are not connected-but-excluded Input mappings.
 * @decision Read both facts together from the existing eligibility owner.
 * @consequence Model Output can edit retained selection without changing publication authority.
 * @version 1.1.0
 */
import { useMemo } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasReadFieldEligibility } from './canvasInputFieldEligibility';
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
  const eligibility = useMemo(
    () =>
      resolveCanvasReadFieldEligibility({
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
    eligibility.denied,
    eligibility.disconnected
  );
  return { analysis, output: useCanvasRelationFields(null, analysis).result } as const;
}

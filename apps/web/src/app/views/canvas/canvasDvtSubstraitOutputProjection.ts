/** Explicit target projection; Substrait and connected identities remain authoritative. */
import { projectSubstraitProducerGraph } from '@dvt/postgres-projection';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';

export type DvtSubstraitTransformOutputProjectionArgs = Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}>;

export async function projectDvtSubstraitTransformOutputToPostgresSql(
  args: DvtSubstraitTransformOutputProjectionArgs
): Promise<string> {
  const { graph } = resolveCanvasSubstraitGraphBindings({
    node: args.transformNode,
    nodes: args.nodes,
    edges: args.edges,
  });
  return (await projectSubstraitProducerGraph(graph)).sql;
}

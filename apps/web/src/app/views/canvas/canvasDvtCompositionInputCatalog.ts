/**
 * Owned concern: read connected composition Inputs and their independently valid model publications.
 * @baseline ADR-0064 / GH-3628: edge selection is not producer semantic authority.
 * @decision Retain publication before filtering stale Input bindings and share one catalog per query.
 * @consequence Classification does not repeat producer resolution or lose explicit stale-edge facts.
 * @version 1.1.0
 */
import type { ConnectedSourceRef, ConnectionRef, DvtInputBindingsV1 } from '@dvt/contracts';
import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInputBindingEdge } from './canvasInputBindings';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import {
  readCanvasModelCompositionPublication,
  projectCanvasModelCompositionInput,
  type CanvasModelCompositionPublication,
} from './canvasModelCompositionInput';
import { resolveCanvasPhysicalCompositionInput } from './canvasPhysicalCompositionInput';

export type CanvasDvtCompositionField = Readonly<{
  id?: string;
  name: string;
  dataType: string;
  joinDataType: DvtSubstraitJoinDataType | null;
  nullable?: boolean;
}>;

export type CanvasDvtCompositionInput = Readonly<{
  nodeId: string;
  schema: string;
  table: string;
  fields: readonly CanvasDvtCompositionField[];
  inputBindings?: DvtInputBindingsV1;
}> &
  (
    | Readonly<{ sourceRef: ConnectedSourceRef; producer?: never }>
    | Readonly<{
        sourceRef: null;
        producer: Readonly<{
          nodeId: string;
          name: string;
          document: SubstraitDocument;
          connection: ConnectionRef;
        }>;
      }>
  );

type CatalogArgs = Readonly<{
  targetNodeId: string;
  nodes: readonly CanonicalNode[];
  edges: readonly CanvasInputBindingEdge[];
}>;

export type CanvasDvtCompositionInputCatalog = Readonly<{
  inputs: readonly CanvasDvtCompositionInput[];
  publicationsByProducerId: ReadonlyMap<string, CanvasModelCompositionPublication>;
}>;

export function readCanvasDvtCompositionInputCatalog(
  args: CatalogArgs
): CanvasDvtCompositionInputCatalog {
  const sourceIds = new Set(
    args.edges.filter((edge) => edge.targetId === args.targetNodeId).map((edge) => edge.sourceId)
  );
  const inputs: CanvasDvtCompositionInput[] = [];
  const publicationsByProducerId = new Map<string, CanvasModelCompositionPublication>();
  for (const node of args.nodes.filter((candidate) => sourceIds.has(candidate.id))) {
    const edge = args.edges.find(
      (candidate) => candidate.sourceId === node.id && candidate.targetId === args.targetNodeId
    )!;
    const physical = resolveCanvasPhysicalCompositionInput(node, edge);
    if (physical != null) {
      inputs.push(physical);
      continue;
    }
    const publication = readCanvasModelCompositionPublication(node, args.nodes, args.edges);
    if (publication == null) continue;
    publicationsByProducerId.set(node.id, publication);
    const input = projectCanvasModelCompositionInput(publication, edge);
    if (input != null) inputs.push(input);
  }
  return { inputs, publicationsByProducerId };
}

export function resolveCanvasDvtCompositionInputs(
  args: CatalogArgs
): readonly CanvasDvtCompositionInput[] {
  return readCanvasDvtCompositionInputCatalog(args).inputs;
}

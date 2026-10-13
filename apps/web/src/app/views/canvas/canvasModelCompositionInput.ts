/**
 * Owned concern: read one connected model publication independently from edge binding usability.
 * @baseline ADR-0064 / GH-3628: retained inspection and composition share producer facts.
 * @decision Resolve and project publication once, then apply the explicit edge-binding filter.
 * @consequence Stale edge slots cannot erase a valid producer document needed for classification.
 * @version 1.1.0
 */
import {
  deriveSubstraitPublication,
  deriveSubstraitSchemas,
  type SubstraitDocument,
  type SubstraitRelationIndex,
  type RelationPublication,
} from '@dvt/substrait-analysis';
import type { ConnectionRef } from '@dvt/contracts';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { resolveCanvasDvtJoinDataType } from './canvasDvtJoinTypeAdmission';
import { readCanvasInputBindings, type CanvasInputBindingEdge } from './canvasInputBindings';
import { resolveUnmappedCanvasReadFields } from './canvasInputFieldEligibility';

export type CanvasModelCompositionPublication = Readonly<{
  nodeId: string;
  name: string;
  document: SubstraitDocument;
  index: SubstraitRelationIndex;
  connection: ConnectionRef;
  fields: CanvasDvtCompositionInput['fields'];
  publishedFieldIds: ReadonlySet<string>;
  rootPublication: RelationPublication;
}>;

export function readCanvasModelCompositionPublication(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[],
  edges: readonly CanvasInputBindingEdge[]
): CanvasModelCompositionPublication | null {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform' || node.role !== 'transform')
    return null;
  try {
    const { document, connection, index } = resolveCanvasSubstraitGraphBindings({
      node,
      nodes,
      edges,
    });
    const { schemas } = deriveSubstraitSchemas(document);
    const root = index.relations.get(index.rootId)!;
    const schema = schemas.get(index.rootId)!;
    const fields = root.fields
      .filter((field) => field.parentFieldId == null)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
      .map((field) => {
        const type = schema[field.outputOrdinal]!.type.kind;
        return {
          id: field.fieldId,
          name: field.displayName ?? field.fieldId,
          dataType: type.case ?? 'unknown',
          joinDataType: resolveCanvasDvtJoinDataType(type.case ?? ''),
          nullable:
            type.value == null ||
            !('nullability' in type.value) ||
            type.value.nullability !== Type_Nullability.REQUIRED,
        };
      });
    const denied = resolveUnmappedCanvasReadFields({ nodeId: node.id, nodes, edges, document });
    const publication = deriveSubstraitPublication(document, denied).get(index.rootId)!;
    const unavailable = new Set(publication.unavailableFieldIds);
    const publishedFieldIds = new Set(
      root.fields.filter((field) => !unavailable.has(field.fieldId)).map((field) => field.fieldId)
    );
    return {
      nodeId: node.id,
      name: node.name,
      document,
      index,
      connection,
      fields,
      publishedFieldIds,
      rootPublication: publication,
    };
  } catch {
    return null;
  }
}

export function projectCanvasModelCompositionInput(
  publication: CanvasModelCompositionPublication,
  edge: CanvasInputBindingEdge
): CanvasDvtCompositionInput | null {
  if (publication.rootPublication.rowUnavailable) return null;
  const inputBindings = readCanvasInputBindings(edge);
  const fields = publication.fields.filter(
    (field) => field.id != null && publication.publishedFieldIds.has(field.id)
  );
  if (
    inputBindings?.fields.some(
      (field) => !fields.some((published) => published.id === field.producerFieldId)
    )
  )
    return null;
  const { nodeId, name, document, connection } = publication;
  return {
    nodeId,
    schema: '',
    table: name,
    sourceRef: null,
    producer: { nodeId, name, document, connection },
    fields,
    ...(inputBindings == null ? {} : { inputBindings }),
  };
}

export function resolveCanvasModelCompositionInput(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[],
  edge: CanvasInputBindingEdge,
  edges: readonly CanvasInputBindingEdge[]
): CanvasDvtCompositionInput | null {
  const publication = readCanvasModelCompositionPublication(node, nodes, edges);
  return publication == null ? null : projectCanvasModelCompositionInput(publication, edge);
}

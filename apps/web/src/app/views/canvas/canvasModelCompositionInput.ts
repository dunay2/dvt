/** Read a connected model's published schema, without embedding its operations. */
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { resolveCanvasDvtJoinDataType } from './canvasDvtJoinTypeAdmission';
import { readCanvasInputBindings, type CanvasInputBindingEdge } from './canvasInputBindings';

export function resolveCanvasModelCompositionInput(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[],
  edge: CanvasInputBindingEdge,
  edges: readonly CanvasInputBindingEdge[]
): CanvasDvtCompositionInput | null {
  if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform' || node.role !== 'transform')
    return null;
  try {
    const { document, connection } = resolveCanvasSubstraitGraphBindings({ node, nodes, edges });
    const { index, schemas } = deriveSubstraitSchemas(document);
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
    const inputBindings = readCanvasInputBindings(edge);
    if (
      inputBindings?.fields.some(
        (field) => !fields.some((published) => published.id === field.producerFieldId)
      )
    )
      return null;
    return {
      nodeId: node.id,
      schema: '',
      table: node.name,
      sourceRef: null,
      producer: { nodeId: node.id, name: node.name, document, connection },
      fields,
      ...(inputBindings == null ? {} : { inputBindings }),
    };
  } catch {
    return null;
  }
}

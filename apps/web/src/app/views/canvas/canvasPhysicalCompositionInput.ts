/** Resolve one physical catalogue entry with the shared Input publication policy. */
import { ConnectedSourceRefSchema } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type {
  CanvasDvtCompositionField,
  CanvasDvtCompositionInput,
} from './canvasDvtCompositionInputCatalog';
import { resolveCanvasDvtJoinDataType } from './canvasDvtJoinTypeAdmission';
import type { CanvasInputBindingEdge } from './canvasInputBindings';
import { resolveCanvasPhysicalInputBindings } from './canvasInputComposition';

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readFields(node: CanonicalNode): readonly CanvasDvtCompositionField[] | null {
  if (!Array.isArray(node.metadata?.columns)) return null;
  const fields = node.metadata.columns.map((candidate) => {
    if (candidate == null || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
    const record = candidate as Record<string, unknown>;
    const name = readText(record.name);
    const dataType = readText(record.type ?? record.dataType);
    return name == null || dataType == null
      ? null
      : {
          name,
          dataType,
          joinDataType: resolveCanvasDvtJoinDataType(dataType),
          nullable: typeof record.nullable === 'boolean' ? record.nullable : true,
        };
  });
  if (fields.some((field) => field == null)) return null;
  const resolved = fields.filter((field) => field != null);
  return resolved.length > 0 &&
    new Set(resolved.map((field) => field.name)).size === resolved.length
    ? resolved
    : null;
}

export function resolveCanvasPhysicalCompositionInput(
  node: CanonicalNode,
  edge: CanvasInputBindingEdge
): CanvasDvtCompositionInput | null {
  if (node.kind !== 'dvt:source' || node.role !== 'input') return null;
  const sourceRef = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
  const schema = readText(node.metadata?.schema);
  const table = readText(node.metadata?.tableName);
  const fields = readFields(node);
  if (!sourceRef.success || schema == null || table == null || fields == null) return null;
  try {
    const inputBindings = resolveCanvasPhysicalInputBindings(node, edge);
    return {
      nodeId: node.id,
      schema,
      table,
      sourceRef: sourceRef.data,
      fields,
      ...(inputBindings == null ? {} : { inputBindings }),
    };
  } catch {
    return null;
  }
}

/** Map the shared schema and stable identities into field presentation, independently of plan shape. */
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';
import { ConnectedSourceRefSchema } from '@dvt/contracts';
import {
  isSchemaTypeNullable,
  type SchemaField,
  type RelationAnalysisResult,
} from '@dvt/substrait-analysis';
import type { CanvasNodePresentationColumn } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasPresentationAnalysisEntry } from './canvasPresentationAnalysis';
import { canvasSourceReferenceKey } from './canvasRelationalAnalysis';
import { presentFieldOperations } from './canvasSubstraitFieldLabels';

type FieldSource = Readonly<{ nodeId: string; fieldId: string; name: string; nodeName: string }>;
type Context = Readonly<{
  entry: CanvasPresentationAnalysisEntry;
  result: RelationAnalysisResult;
  sources: readonly CanonicalNode[];
  inherited: readonly CanvasNodePresentationColumn[];
  signal?: AbortSignal;
}>;

const TYPE_LABELS: Readonly<Record<string, string>> = {
  string: 'string',
  i8: 'tinyint',
  i16: 'smallint',
  i32: 'integer',
  i64: 'bigint',
  fp32: 'real',
  fp64: 'double precision',
  bool: 'boolean',
  precisionTimestampTz: 'timestamp with time zone',
  precisionTimestamp: 'timestamp',
  decimal: 'numeric',
  struct: 'struct',
  unbound: 'unknown',
};

function resolveFieldSource(context: Context, fieldId: string): FieldSource | null {
  const field = context.entry.index.fields.get(fieldId);
  if (field == null) return null;
  const inherited = context.inherited.filter((column) => column.reference === fieldId);
  if (inherited.length === 1 && inherited[0]!.sourceNodeId != null) {
    const column = inherited[0]!;
    return {
      nodeId: column.sourceNodeId!,
      fieldId,
      name: column.name,
      nodeName: column.sourceNodeName!,
    };
  }
  const relation = context.entry.index.relations.get(field.relationId)!;
  const sourceRef = relation.binding.sourceRef;
  if (sourceRef == null || relation.relation.relType.case !== 'read') return null;
  const sources = context.sources.filter((node) => {
    const reference = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
    return (
      reference.success &&
      canvasSourceReferenceKey(reference.data) === canvasSourceReferenceKey(sourceRef)
    );
  });
  const source = sources.length === 1 ? sources[0] : undefined;
  if (source == null || field.displayName == null) return null;
  return { nodeId: source.id, fieldId, name: field.displayName, nodeName: source.name };
}

async function fieldSources(
  context: Context,
  binding: DvtSubstraitFieldBindingV1,
  field: SchemaField
): Promise<FieldSource[]> {
  // Immediate producer identity wins over physical ancestry for chained model handles.
  let current: DvtSubstraitFieldBindingV1 | undefined = binding;
  const visited = new Set<string>();
  while (current?.sourceFieldId != null && !visited.has(current.fieldId)) {
    visited.add(current.fieldId);
    const source = resolveFieldSource(context, current.sourceFieldId);
    if (source != null) {
      const candidate = context.entry.index.fields.get(current.sourceFieldId)!;
      const schema = await context.entry.session.query(candidate.relationId, context.signal);
      const path = [candidate.outputOrdinal];
      let parent = candidate.parentFieldId;
      while (parent != null) {
        const field = context.entry.index.fields.get(parent)!;
        path.unshift(field.outputOrdinal);
        parent = field.parentFieldId;
      }
      let candidateField = schema.fields[path.shift()!];
      for (const ordinal of path) candidateField = candidateField?.children?.[ordinal];
      const dependencies = new Set(candidateField?.sourceFieldIds);
      if (
        dependencies.size === field.sourceFieldIds.length &&
        field.sourceFieldIds.every((id) => dependencies.has(id))
      )
        return [source];
    }
    current = context.entry.index.fields.get(current.sourceFieldId);
  }
  const sources = field.sourceFieldIds.map((id) => resolveFieldSource(context, id));
  return sources.every((source): source is FieldSource => source != null) ? sources : [];
}

async function presentFields(
  context: Context,
  fields: readonly SchemaField[],
  parentFieldId?: string
): Promise<CanvasNodePresentationColumn[]> {
  const bindings = context.result.bindings
    .filter((field) => field.parentFieldId === parentFieldId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  if (bindings.length !== fields.length)
    throw new Error('Output field identities do not cover the derived schema.');
  return Promise.all(
    fields.map(async (field, ordinal) => {
      const binding = bindings[ordinal]!;
      if (binding.outputOrdinal !== ordinal)
        throw new Error('Output field identities are not contiguous.');
      const sources = await fieldSources(context, binding, field);
      const source = sources.length === 1 ? sources[0] : undefined;
      const physical =
        source == null
          ? undefined
          : context.inherited.find(
              (column) => column.sourceNodeId === source.nodeId && column.name === source.name
            );
      const operations = await presentFieldOperations(context.entry, binding, context.signal);
      const type = field.type.kind.case!;
      return {
        name: binding.displayName ?? binding.fieldId,
        reference: binding.fieldId,
        type:
          physical?.type != null &&
          (type === 'unbound' ||
            (type === 'string' && ['text', 'string', 'varchar'].includes(physical.type)))
            ? physical.type
            : (TYPE_LABELS[type] ?? type),
        nullable: isSchemaTypeNullable(field.type),
        provenance: 'declared' as const,
        ...(binding.description == null ? {} : { description: binding.description }),
        ...(operations.length === 0 ? {} : { operations }),
        ...(source == null
          ? {}
          : {
              sourceNodeId: source.nodeId,
              sourceNodeName: source.nodeName,
              sourceFieldName: source.name,
              sourceReference: source.fieldId,
            }),
        sources,
        ...(field.children == null
          ? {}
          : { children: await presentFields(context, field.children, binding.fieldId) }),
      };
    })
  );
}

export function presentCanvasSubstraitFields(
  context: Context
): Promise<CanvasNodePresentationColumn[]> {
  return presentFields(context, context.result.fields);
}

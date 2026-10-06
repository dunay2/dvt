/**
 * Owned concern: distinguish retained-document editing from Input publication eligibility.
 * @baseline GH-3180: disconnected final JOIN selection remains an authoring operation.
 * @decision Derive disconnected provenance beside the unchanged publication denial.
 * @consequence Connected exclusions and new expressions never inherit the retained-output permission.
 * @version 1.1.0
 */
import { jcsCanonicalize } from '@dvt/crypto';
import type { SchemaField, SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { readCanvasInputBindings, type CanvasInputBindingEdge } from './canvasInputBindings';
import { resolveCanvasPhysicalInputBindings } from './canvasInputComposition';

export function resolveCanvasReadFieldEligibility(
  args: Readonly<{
    document: SubstraitDocument | null;
    nodeId: string;
    nodes: readonly CanonicalNode[];
    edges: readonly CanvasInputBindingEdge[];
  }>
): Readonly<{ denied: ReadonlySet<string>; disconnected: ReadonlySet<string> }> {
  const denied = new Set<string>();
  const disconnected = new Set<string>();
  if (args.document == null) return { denied, disconnected };
  const edges = args.edges.filter((edge) => edge.targetId === args.nodeId);
  for (const relation of args.document.sidecar.relations) {
    if (relation.sourceRef == null && relation.producerRef == null) continue;
    const edge = edges.find((candidate) => {
      if (relation.producerRef != null) return candidate.sourceId === relation.producerRef.nodeId;
      const sourceRef = args.nodes.find((node) => node.id === candidate.sourceId)?.metadata
        ?.connectedSourceRef;
      return (
        sourceRef != null && jcsCanonicalize(sourceRef) === jcsCanonicalize(relation.sourceRef)
      );
    });
    let bindings;
    try {
      const node = args.nodes.find((candidate) => candidate.id === edge?.sourceId);
      bindings =
        edge == null
          ? { version: 'v1' as const, fields: [] }
          : relation.producerRef == null && node != null
            ? resolveCanvasPhysicalInputBindings(node, edge)
            : readCanvasInputBindings(edge);
    } catch {
      bindings = { version: 'v1' as const, fields: [] };
    }
    if (bindings == null) continue;
    const allowed = new Set(bindings?.fields.map((field) => field.producerFieldId));
    for (const field of args.document.sidecar.fields.filter(
      (entry) => entry.relationId === relation.relationId
    )) {
      const publishedId =
        relation.producerRef == null
          ? field.displayName
          : relation.producerRef.fields.find((entry) => entry.fieldId === field.fieldId)
              ?.producerFieldId;
      if (publishedId == null || !allowed.has(publishedId)) denied.add(field.fieldId);
      if (edge == null && publishedId != null) disconnected.add(field.fieldId);
    }
  }
  return { denied, disconnected };
}

export function resolveUnmappedCanvasReadFields(
  args: Parameters<typeof resolveCanvasReadFieldEligibility>[0]
): ReadonlySet<string> {
  return resolveCanvasReadFieldEligibility(args).denied;
}

export function canvasInputSchemaIsEligible(
  field: SchemaField,
  denied: ReadonlySet<string>
): boolean {
  return (
    field.sourceFieldIds.every((id) => !denied.has(id)) &&
    (field.children?.every((child) => canvasInputSchemaIsEligible(child, denied)) ?? true)
  );
}

export function canvasRetainedOutputSchemaIsEligible(
  field: SchemaField,
  denied: ReadonlySet<string>,
  disconnected: ReadonlySet<string>
): boolean {
  return (
    field.sourceFieldIds.every((id) => !denied.has(id) || disconnected.has(id)) &&
    (field.children?.every((child) =>
      canvasRetainedOutputSchemaIsEligible(child, denied, disconnected)
    ) ??
      true)
  );
}

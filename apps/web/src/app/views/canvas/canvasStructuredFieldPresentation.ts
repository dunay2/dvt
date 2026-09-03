/** Owned concern: project canonical structured fields for Canvas presentation. */
import type { ConnectedSourceRef, DvtSubstraitFieldBindingV1 } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  resolveDvtSubstraitProjectionSource,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  inspectDvtSubstraitStructuredFieldDraft,
  orderedDvtSubstraitFields,
  resolveDvtSubstraitStructuredProjectionParts,
} from './canvasDvtSubstraitStructuredField';

export type CanvasStructuredPresentedOutput = Readonly<{
  name: string;
  fieldId: string;
  dataType: string;
  sourceNodeId?: string;
  sourceFieldId?: string;
  sourceFieldName?: string;
  children?: readonly CanvasStructuredPresentedOutput[];
}>;

function sameSourceIdentity(
  relation: Readonly<{ sourceRef?: ConnectedSourceRef }>,
  node: CanonicalNode
): boolean {
  const source = resolveDvtSubstraitProjectionSource(node);
  const expected = relation.sourceRef;
  return (
    source != null &&
    expected != null &&
    source.sourceRef.sourceObjectId === expected.sourceObjectId &&
    source.sourceRef.connectionRef.connectionId === expected.connectionRef.connectionId &&
    source.sourceRef.connectionRef.provider === expected.connectionRef.provider
  );
}

function presentField(args: {
  binding: DvtSubstraitFieldBindingV1;
  bindings: readonly DvtSubstraitFieldBindingV1[];
  sourceNode: CanonicalNode;
}): CanvasStructuredPresentedOutput | null {
  const children = orderedDvtSubstraitFields(
    args.bindings,
    args.binding.relationId,
    args.binding.fieldId
  ).map((binding) => presentField({ ...args, binding }));
  if (children.some((child) => child == null)) return null;
  if (children.length > 0) {
    return {
      name: args.binding.displayName ?? args.binding.fieldId,
      fieldId: args.binding.fieldId,
      dataType: 'struct',
      children: children.filter((child) => child != null),
    };
  }

  const sourceBinding = args.bindings.find(
    (candidate) => candidate.fieldId === args.binding.sourceFieldId
  );
  const source = resolveDvtSubstraitProjectionSource(args.sourceNode);
  const sourceFieldName = sourceBinding?.displayName;
  const sourceField = source?.fields.find((field) => field.name === sourceFieldName);
  if (sourceFieldName == null || sourceField == null) return null;
  return {
    name: args.binding.displayName ?? args.binding.fieldId,
    fieldId: args.binding.fieldId,
    dataType: sourceField.dataType,
    sourceNodeId: args.sourceNode.id,
    sourceFieldId: args.binding.sourceFieldId,
    sourceFieldName,
  };
}

export function projectCanvasStructuredFieldOutputs(
  args: Readonly<{
    node: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
    draft: DvtSubstraitProjectionDraft;
  }>
): readonly CanvasStructuredPresentedOutput[] | null {
  const inspection = inspectDvtSubstraitStructuredFieldDraft(args.draft);
  const parts = resolveDvtSubstraitStructuredProjectionParts(args.draft);
  if (!inspection.ok || parts == null || parts.targetRelation.displayName !== args.node.id) {
    return null;
  }
  const incomingIds = new Set(
    args.edges.filter((edge) => edge.targetId === args.node.id).map((edge) => edge.sourceId)
  );
  const sourceNode = args.nodes.find(
    (node) => incomingIds.has(node.id) && sameSourceIdentity(parts.sourceRelation, node)
  );
  if (sourceNode == null) return null;
  const roots = orderedDvtSubstraitFields(
    args.draft.sidecar.fields,
    parts.targetRelation.relationId
  ).map((binding) => presentField({ binding, bindings: args.draft.sidecar.fields, sourceNode }));
  return roots.some((field) => field == null) ? null : roots.filter((field) => field != null);
}

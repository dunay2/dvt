/**
 * Owned concern: protect source columns used by canonical connected computations.
 * @baseline ADR-0064: canonical expressions own dependencies, not presentation profiles.
 * @decision Reuse schema provenance and publication analysis, including hidden definitions.
 * @consequence Internal passthrough columns alone do not prevent source output edits.
 * @version 1.0.0
 */
import { jcsCanonicalize } from '@dvt/crypto';
import {
  deriveExpressionSchema,
  deriveSubstraitPublication,
  deriveSubstraitSchemas,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { ConnectedSourceRef } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import { readDvtSourceOutputProjection } from './canvasDvtSourceSemanticAuthoring';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

function documentUsesSourceColumn(
  document: SubstraitDocument,
  sourceRef: ConnectedSourceRef,
  columnName: string
): boolean {
  const { index, schemas } = deriveSubstraitSchemas(document);
  const sourceKey = jcsCanonicalize(sourceRef);
  const reads = [...index.relations.values()].filter(
    (entry) =>
      entry.relation.relType.case === 'read' &&
      entry.binding.sourceRef != null &&
      jcsCanonicalize(entry.binding.sourceRef) === sourceKey
  );
  if (reads.length === 0) return true;
  const denied = new Set(
    reads.flatMap((read) =>
      read.fields.filter((field) => field.displayName === columnName).map((field) => field.fieldId)
    )
  );
  const published = deriveSubstraitPublication(document, denied).get(index.rootId)!;
  if (published.rowUnavailable || published.unavailableFieldIds.length > 0) return true;
  return [...index.relations.values()].some((entry) => {
    if (entry.relation.relType.case !== 'project') return false;
    const input = entry.inputs.flatMap((id) => schemas.get(id)!);
    return entry.relation.relType.value.expressions.some((expression) =>
      deriveExpressionSchema(expression, input).sourceFieldIds.some((id) => denied.has(id))
    );
  });
}

export function sourceOutputIsRequired(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  sourceNode: CanonicalNode;
  columnName: string;
}): boolean {
  try {
    const source = readDvtSourceOutputProjection(args.sourceNode);
    if (source == null) return true;
    const nodes = resolveCanvasDraftNodes(args.draftSession, args.canonicalNodesById);
    const targets = new Set(
      args.draftSession.workingSet.visibleEdges
        .filter((edge) => edge.sourceId === args.sourceNode.id)
        .map((edge) => edge.targetId)
    );
    return [...targets].some((id) => {
      const node = nodes.find((candidate) => candidate.id === id);
      if (node?.pluginId !== 'dvt' || node.kind !== 'dvt:transform') return true;
      const authority = readDvtTransformAuthoringAuthority(node);
      return (
        authority != null &&
        documentUsesSourceColumn(
          decodeDvtSubstraitSemanticDocument(authority.semanticDocument),
          source.source.sourceRef,
          args.columnName
        )
      );
    });
  } catch {
    return true;
  }
}

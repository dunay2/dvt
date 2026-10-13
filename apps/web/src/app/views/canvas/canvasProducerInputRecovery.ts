/**
 * Owned concern: inspect retained producer inputs without granting executable resolution.
 * @baseline ADR-0064: saved consumer identities remain the semantic authority.
 * @decision Admit inspection only for missing publications on valid connected producers.
 * @consequence Malformed, cyclic, foreign or type-incompatible documents still fail closed.
 * @version 1.0.0
 */
import {
  deriveSubstraitPublication,
  deriveSubstraitSchemas,
  resolveProducerInput,
  SubstraitAnalysisError,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInputBindingEdge } from './canvasInputBindings';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { resolveUnmappedCanvasReadFields } from './canvasInputFieldEligibility';
import { canonicalInputFieldsAreRequired } from './canvasCanonicalInputDependencyPolicy';

export type CanvasMissingProducerField = Readonly<{
  producerNodeId: string;
  producerFieldId: string;
  fieldId: string;
  name: string;
}>;

export type CanvasProducerInputRecovery = Readonly<{
  document: SubstraitDocument;
  denied: ReadonlySet<string>;
  missing: readonly CanvasMissingProducerField[];
}>;

type RecoveryArgs = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanvasInputBindingEdge[];
}>;

function readProducerPublication(producer: CanonicalNode, args: RecoveryArgs) {
  const { document } = resolveCanvasSubstraitGraphBindings({ ...args, node: producer });
  const analysis = deriveSubstraitSchemas(document);
  const denied = resolveUnmappedCanvasReadFields({ ...args, nodeId: producer.id, document });
  const publication = deriveSubstraitPublication(document, denied).get(analysis.index.rootId);
  if (publication?.rowUnavailable) return null;
  const unavailable = new Set(publication?.unavailableFieldIds);
  const published = new Set(
    analysis.index.relations
      .get(analysis.index.rootId)!
      .fields.filter((field) => !unavailable.has(field.fieldId))
      .map((field) => field.fieldId)
  );
  return { document, published };
}

function readMissingFields(
  entry: IndexedRelation,
  published: ReadonlySet<string>
): readonly CanvasMissingProducerField[] {
  const reference = entry.binding.producerRef!;
  return reference.fields
    .filter((mapping) => !published.has(mapping.producerFieldId))
    .map((mapping) => {
      const field = entry.fields.find((candidate) => candidate.fieldId === mapping.fieldId);
      if (field == null)
        throw new SubstraitAnalysisError(
          'invalid_binding',
          'A retained producer mapping has no local field.'
        );
      return {
        producerNodeId: reference.nodeId,
        producerFieldId: mapping.producerFieldId,
        fieldId: field.fieldId,
        name: field.displayName ?? field.fieldId,
      };
    });
}

export function readCanvasProducerInputRecovery(
  args: RecoveryArgs
): CanvasProducerInputRecovery | null {
  try {
    const authority = readDvtTransformAuthoringAuthority(args.node);
    if (authority == null) return null;
    const document = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
    const analysis = deriveSubstraitSchemas(document);
    const connected = new Set(
      args.edges.filter((edge) => edge.targetId === args.node.id).map((edge) => edge.sourceId)
    );
    const nodes = new Map(args.nodes.map((node) => [node.id, node]));
    const missing: CanvasMissingProducerField[] = [];
    for (const entry of analysis.index.relations.values()) {
      const reference = entry.binding.producerRef;
      if (reference == null) continue;
      const producer = nodes.get(reference.nodeId);
      if (producer == null || !connected.has(producer.id)) return null;
      const publication = readProducerPublication(producer, args);
      if (publication == null) return null;
      const { published } = publication;
      resolveProducerInput(
        {
          ...entry,
          binding: {
            ...entry.binding,
            producerRef: {
              ...reference,
              fields: reference.fields.filter((field) => published.has(field.producerFieldId)),
            },
          },
        },
        publication.document
      );
      missing.push(...readMissingFields(entry, published));
    }
    const denied = new Set(missing.map((field) => field.fieldId));
    return missing.length === 0 || !canonicalInputFieldsAreRequired(document, denied)
      ? null
      : { document, missing, denied };
  } catch {
    return null;
  }
}

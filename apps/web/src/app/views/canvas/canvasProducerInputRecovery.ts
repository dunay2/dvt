/**
 * Owned concern: inspect retained producer inputs without granting executable resolution.
 * @baseline ADR-0064: saved consumer identities remain the semantic authority.
 * @decision Classify required references against connected publications and existing root repair slots.
 * @consequence Rejection cannot become a healthy refresh; normal reads do not repeat producer resolution.
 * @version 1.1.0
 */
import {
  deriveSubstraitSchemas,
  resolveProducerInput,
  SubstraitAnalysisError,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { readCanvasInputBindings, type CanvasInputBindingEdge } from './canvasInputBindings';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { canonicalInputFieldsAreRequired } from './canvasCanonicalInputDependencyPolicy';
import {
  readCanvasDvtCompositionInputCatalog,
  type CanvasDvtCompositionInputCatalog,
} from './canvasDvtCompositionInputCatalog';
import type { DvtSubstraitRelationBindingV1, DvtSubstraitFieldBindingV1 } from '@dvt/contracts';

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

export type CanvasProducerInputRecoveryRead =
  | Readonly<{ kind: 'not-needed' }>
  | (Readonly<{ kind: 'retained' }> & CanvasProducerInputRecovery)
  | Readonly<{
      kind: 'rejected';
      failure: 'invalid-semantic-authority' | 'input-identity-unavailable';
    }>;

type RecoveryArgs = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanvasInputBindingEdge[];
}>;

function readMissingFields(
  binding: DvtSubstraitRelationBindingV1,
  fields: ReadonlyMap<string, DvtSubstraitFieldBindingV1>,
  published: ReadonlySet<string>
): readonly CanvasMissingProducerField[] {
  const reference = binding.producerRef!;
  return reference.fields
    .filter((mapping) => !published.has(mapping.producerFieldId))
    .map((mapping) => {
      const field = fields.get(mapping.fieldId);
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

function readRepairableRootIds(
  args: RecoveryArgs,
  fields: ReadonlyMap<string, DvtSubstraitFieldBindingV1>,
  missing: readonly CanvasMissingProducerField[]
): ReadonlySet<string> {
  return new Set(
    missing
      .filter((field) => {
        if (fields.get(field.fieldId)!.parentFieldId != null) return false;
        const edge = args.edges.find(
          (candidate) =>
            candidate.targetId === args.node.id && candidate.sourceId === field.producerNodeId
        );
        if (edge == null) return false;
        const explicit = readCanvasInputBindings(edge);
        return (
          explicit == null ||
          explicit.fields.some((slot) => slot.producerFieldId === field.producerFieldId)
        );
      })
      .map((field) => field.fieldId)
  );
}

function retainedRootId(
  fieldId: string,
  fields: ReadonlyMap<string, DvtSubstraitFieldBindingV1>
): string {
  let field = fields.get(fieldId)!;
  while (field.parentFieldId != null) field = fields.get(field.parentFieldId)!;
  return field.fieldId;
}

function readUnrepairableMissingFields(
  args: RecoveryArgs,
  fields: ReadonlyMap<string, DvtSubstraitFieldBindingV1>,
  missing: readonly CanvasMissingProducerField[]
): ReadonlySet<string> {
  const repairableRoots = readRepairableRootIds(args, fields, missing);
  return new Set(
    missing
      .filter((field) => !repairableRoots.has(retainedRootId(field.fieldId, fields)))
      .map((field) => field.fieldId)
  );
}

export function readCanvasProducerInputRecovery(
  args: RecoveryArgs,
  preparedCatalog?: CanvasDvtCompositionInputCatalog
): CanvasProducerInputRecoveryRead {
  try {
    const authority = readDvtTransformAuthoringAuthority(args.node);
    if (authority == null) return { kind: 'not-needed' };
    const sidecar = authority.semanticDocument.sidecar;
    const references = sidecar.relations.filter((binding) => binding.producerRef != null);
    if (references.length === 0) return { kind: 'not-needed' };
    const catalog =
      preparedCatalog ??
      readCanvasDvtCompositionInputCatalog({
        targetNodeId: args.node.id,
        nodes: args.nodes,
        edges: args.edges,
      });
    const fields = new Map(sidecar.fields.map((field) => [field.fieldId, field]));
    const missing: CanvasMissingProducerField[] = [];
    for (const binding of references) {
      const publication = catalog.publicationsByProducerId.get(binding.producerRef!.nodeId);
      if (publication == null || publication.rootPublication.rowUnavailable)
        return { kind: 'rejected', failure: 'input-identity-unavailable' };
      missing.push(...readMissingFields(binding, fields, publication.publishedFieldIds));
    }
    if (missing.length === 0) return { kind: 'not-needed' };
    const document = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
    const denied = new Set(missing.map((field) => field.fieldId));
    if (!canonicalInputFieldsAreRequired(document, denied)) return { kind: 'not-needed' };
    if (
      canonicalInputFieldsAreRequired(
        document,
        readUnrepairableMissingFields(args, fields, missing)
      )
    )
      return { kind: 'rejected', failure: 'input-identity-unavailable' };
    const { index } = deriveSubstraitSchemas(document);
    for (const binding of references) {
      const entry: IndexedRelation = index.relations.get(binding.relationId)!;
      const reference = binding.producerRef!;
      const publication = catalog.publicationsByProducerId.get(reference.nodeId)!;
      resolveProducerInput(
        {
          ...entry,
          binding: {
            ...entry.binding,
            producerRef: {
              ...reference,
              fields: reference.fields.filter((field) =>
                publication.publishedFieldIds.has(field.producerFieldId)
              ),
            },
          },
        },
        publication.document
      );
    }
    return { kind: 'retained', document, missing, denied };
  } catch {
    return { kind: 'rejected', failure: 'invalid-semantic-authority' };
  }
}

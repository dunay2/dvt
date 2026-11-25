/** Validate a physical Read against its connected catalogue, independently of its consumers. */
import { clone } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { ReadRel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  allocateDvtFieldId,
  encodeDvtSubstraitPlanV1,
  type ConnectedSourceRef,
} from '@dvt/contracts';
import {
  indexSubstraitRelations,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { physicalReadMatches } from './canvasPhysicalReadMatching';
export { physicalReadMatches };

type PhysicalInput = Extract<CanvasDvtCompositionInput, { sourceRef: ConnectedSourceRef }>;
type NamedInputClone = Readonly<{
  plan: SubstraitDocument['plan'];
  sidecar: SubstraitDocument['sidecar'];
  entry: IndexedRelation;
  table: Extract<ReadRel['readType'], { case: 'namedTable' }>['value'];
}>;

function isUnboundNamedCanvasRead(entry: IndexedRelation): boolean {
  if (entry.binding.sourceRef != null || entry.binding.producerRef != null) return false;
  const read = entry.relation.relType;
  return read.case === 'read' && read.value.readType.case === 'namedTable';
}

function requireExplicitCanvasInput(
  unbound: readonly IndexedRelation[],
  sources: readonly CanvasDvtCompositionInput[]
): PhysicalInput {
  const source = sources.length === 1 ? sources[0] : undefined;
  if (unbound.length !== 1 || source?.sourceRef == null)
    throw new Error('An unbound named input requires one explicit connected source.');
  return source;
}

function populateMissingCanvasReadFields(
  entry: IndexedRelation,
  sidecar: SubstraitDocument['sidecar'],
  source: PhysicalInput
): void {
  if (entry.fields.length !== 0) return;
  sidecar.fields.push(
    ...source.fields.map((field, outputOrdinal) => ({
      relationId: entry.binding.relationId,
      fieldId: allocateDvtFieldId(),
      outputOrdinal,
      displayName: field.name,
    }))
  );
}

function cloneCanvasNamedInput(document: SubstraitDocument, relationId: string): NamedInputClone {
  const plan = clone(PlanSchema, document.plan);
  const sidecar = globalThis.structuredClone(document.sidecar);
  const indexed = indexSubstraitRelations({ plan, sidecar });
  if (!indexed.ok) throw indexed.error;
  const entry = indexed.index.relations.get(relationId)!;
  const read = entry.relation.relType;
  if (read.case !== 'read' || read.value.readType.case !== 'namedTable')
    throw new Error('Expected a named input.');
  return { plan, sidecar, entry, table: read.value.readType.value };
}

function bindExplicitCanvasNamedInput(
  document: SubstraitDocument,
  relationId: string,
  source: PhysicalInput
): SubstraitDocument {
  const { plan, sidecar, entry, table } = cloneCanvasNamedInput(document, relationId);
  table.names = [source.schema, source.table];
  entry.binding.sourceRef = source.sourceRef;
  if (!physicalReadMatches(entry, source))
    throw new Error('Connected input schema does not match the canonical Read.');
  populateMissingCanvasReadFields(entry, sidecar, source);
  sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(plan).sha256;
  return { plan, sidecar };
}

/** Resolve an explicitly connected, unbound named input before target projection; never overwrite a bound Read. */
export function bindCanvasSubstraitInputs(
  document: SubstraitDocument,
  sources: readonly CanvasDvtCompositionInput[]
): SubstraitDocument {
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  const unbound = [...indexed.index.relations.values()].filter(isUnboundNamedCanvasRead);
  if (unbound.length === 0) return document;
  return bindExplicitCanvasNamedInput(
    document,
    unbound[0]!.binding.relationId,
    requireExplicitCanvasInput(unbound, sources)
  );
}

/** Validate a physical Read against its connected catalogue, independently of its consumers. */
import { clone } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { allocateDvtFieldId, encodeDvtSubstraitPlanV1 } from '@dvt/contracts';
import {
  indexSubstraitRelations,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { canvasSourceReferenceKey } from './canvasRelationalAnalysis';

export function physicalReadMatches(
  entry: IndexedRelation,
  source: CanvasDvtCompositionInput
): boolean {
  const read = entry.relation.relType;
  if (
    read.case !== 'read' ||
    entry.binding.sourceRef == null ||
    read.value.readType.case !== 'namedTable'
  )
    return false;
  return (
    canvasSourceReferenceKey(entry.binding.sourceRef) ===
      canvasSourceReferenceKey(source.sourceRef) &&
    JSON.stringify(read.value.readType.value.names) ===
      JSON.stringify([source.schema, source.table]) &&
    read.value.baseSchema?.names.length === source.fields.length &&
    source.fields.every((field, ordinal) => {
      const type = read.value.baseSchema?.struct?.types[ordinal]?.kind;
      return (
        field.name === read.value.baseSchema?.names[ordinal] &&
        (type?.case === 'unbound' || type?.case === field.joinDataType)
      );
    })
  );
}

/** Resolve an explicitly connected, unbound named input before target projection; never overwrite a bound Read. */
export function bindCanvasSubstraitInputs(
  document: SubstraitDocument,
  sources: readonly CanvasDvtCompositionInput[]
): SubstraitDocument {
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  const unbound = [...indexed.index.relations.values()].filter(
    (entry) => entry.relation.relType.case === 'read' && entry.binding.sourceRef == null
  );
  if (unbound.length === 0) return document;
  const source = sources.length === 1 ? sources[0] : undefined;
  if (unbound.length !== 1 || source == null)
    throw new Error('An unbound named input requires one explicit connected source.');
  const plan = clone(PlanSchema, document.plan);
  const sidecar = globalThis.structuredClone(document.sidecar);
  const boundIndex = indexSubstraitRelations({ plan, sidecar });
  if (!boundIndex.ok) throw boundIndex.error;
  const entry = boundIndex.index.relations.get(unbound[0]!.binding.relationId)!;
  const read = entry.relation.relType;
  if (read.case !== 'read' || read.value.readType.case !== 'namedTable')
    throw new Error('Expected a named input.');
  read.value.readType.value.names = [source.schema, source.table];
  entry.binding.sourceRef = source.sourceRef;
  if (!physicalReadMatches(entry, source))
    throw new Error('Connected input schema does not match the canonical Read.');
  if (entry.fields.length === 0) {
    sidecar.fields.push(
      ...source.fields.map((field, outputOrdinal) => ({
        relationId: entry.binding.relationId,
        fieldId: allocateDvtFieldId(),
        outputOrdinal,
        displayName: field.name,
      }))
    );
  }
  sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(plan).sha256;
  return { plan, sidecar };
}

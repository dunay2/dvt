/** Resolve exactly the requested occurrence and the branch explicitly retained by the user. */
import {
  cloneLocalRelation,
  readRelationStructure,
  SubstraitAnalysisError,
  type RelationChangeSet,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { retainedOperandProjection } from './canvasRetainedOperandProjection';

type Entry = RelationChangeSet['upserts'][number];

export function removalTarget(
  session: CanvasRelationAnalysisSession,
  relationId: string,
  revision: number,
  keep?: 'left' | 'right'
) {
  let target = session.locate(relationId, revision);
  let dropPort: number | undefined;
  if (target.inputs.length === 0) {
    while (target.consumers.length === 1) {
      const parent = session.locate(target.consumers[0]!, revision);
      if (parent.inputs.length > 1) {
        dropPort = parent.inputs.indexOf(target.binding.relationId);
        target = parent;
        break;
      }
      target = parent;
    }
    if (dropPort == null)
      throw new SubstraitAnalysisError('invalid_binding', 'The last source cannot be removed.');
  }
  const removed = new Set<string>();
  const common = readRelationStructure(target.relation).common;
  if (
    target.inputs.length === 1 &&
    ['filter', 'sort', 'fetch'].includes(target.relation.relType.case ?? '') &&
    common?.emitKind.case === 'emit'
  ) {
    const input = session.locate(target.inputs[0]!, revision);
    const width = input.fields.filter((field) => field.parentFieldId == null).length;
    const mapping = common.emitKind.value.outputMapping;
    if (mapping.length !== width || mapping.some((slot, ordinal) => slot !== ordinal)) {
      const replacement: Entry = {
        binding: { ...target.binding, displayName: 'project' },
        fields: target.fields,
        relation: create(RelSchema, {
          relType: { case: 'project', value: { common, input: input.relation } },
        }),
      };
      return { target, replacement, removed };
    }
  }
  const removeBranch = (id: string) => {
    const pending = [id];
    while (pending.length > 0) {
      const next = pending.pop()!;
      if (removed.has(next)) continue;
      removed.add(next);
      pending.push(...session.locate(next, revision).inputs);
    }
  };
  if (dropPort != null && target.relation.relType.case === 'set' && target.inputs.length > 2) {
    removeBranch(target.inputs[dropPort]!);
    const inputs = readRelationStructure(target.relation).inputs;
    const relation = cloneLocalRelation(target.relation, inputs);
    if (relation.relType.case !== 'set')
      throw new SubstraitAnalysisError('invalid_structure', 'Expected the selected SET.');
    relation.relType.value.inputs = inputs.filter((_, port) => port !== dropPort);
    const replacement: Entry = {
      relation,
      binding: target.binding,
      fields: target.fields.map((field) => ({
        ...field,
        operandFieldIds: field.operandFieldIds?.filter((_, port) => port !== dropPort),
      })),
    };
    return { target, replacement, removed };
  }
  const port =
    target.inputs.length === 1
      ? 0
      : dropPort != null
        ? 1 - dropPort
        : keep === 'left'
          ? 0
          : keep === 'right'
            ? 1
            : undefined;
  if (port == null || target.inputs[port] == null || target.inputs.length > 2)
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Retiring a composition requires an explicit surviving operand.'
    );
  target.inputs.forEach((id, index) => {
    if (index !== port) removeBranch(id);
  });
  if (target.inputs.length === 2) {
    const survivor = session.locate(target.inputs[port]!, revision);
    return { target, replacement: retainedOperandProjection(target, survivor, port), removed };
  }
  removed.add(target.binding.relationId);
  return { target, replacement: session.locate(target.inputs[port]!, revision), removed };
}

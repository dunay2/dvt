/** Resolve exactly the requested occurrence and the branch explicitly retained by the user. */
import {
  cloneLocalRelation,
  readRelationStructure,
  SubstraitAnalysisError,
  type RelationChangeSet,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

type Entry = RelationChangeSet['upserts'][number];

export function removalTarget(
  session: CanvasRelationAnalysisSession,
  relationId: string,
  revision: number,
  keep?: 'left' | 'right'
) {
  let target = session.locate(relationId, revision);
  let dropPort: number | undefined;
  const operations: string[] = [];
  if (target.inputs.length === 0) {
    while (target.consumers.length === 1) {
      const parent = session.locate(target.consumers[0]!, revision);
      if (parent.inputs.length > 1) {
        dropPort = parent.inputs.indexOf(target.binding.relationId);
        target = parent;
        break;
      }
      target = parent;
      operations.push(parent.relation.relType.case!.toUpperCase());
    }
    if (dropPort == null)
      return { target, replacement: null, removed: new Set<string>(), operations };
  }
  const removed = new Set<string>();
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
  removed.add(target.binding.relationId);
  return { target, replacement: session.locate(target.inputs[port]!, revision), removed };
}

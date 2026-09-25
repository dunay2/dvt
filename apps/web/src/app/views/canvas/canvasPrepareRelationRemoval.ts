/** Prepare one atomic Substrait delta. Dependent unary retirement is explicit, never a render side effect. */
import {
  readRelationStructure,
  SubstraitAnalysisError,
  type RelationChangeSet,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { removalTarget } from './canvasRelationRemovalTarget';
import { inputIdentityMap, rebaseRelationInput } from './canvasRelationInputRemap';
import { retainCompositionOutputs } from './canvasCompositionOutputs';
import { rebindSelectedFieldReferences } from './canvasSelectedRelationChange';
import { validateRelationChanges } from './canvasRelationChangeValidation';
import {
  orderedDvtSubstraitFields,
  buildDvtSubstraitFieldTree,
  flattenDvtSubstraitFieldNames,
} from './canvasDvtSubstraitStructuredField';

type Entry = RelationChangeSet['upserts'][number];
export type RelationRemovalProposal = Readonly<{
  change: RelationChangeSet;
  operations: readonly string[];
}>;

export async function prepareRelationRemoval(
  session: CanvasRelationAnalysisSession,
  args: {
    relationId: string;
    expectedRevision: number;
    keep?: 'left' | 'right';
    signal?: AbortSignal;
  }
): Promise<RelationRemovalProposal> {
  args.signal?.throwIfAborted();
  const { expectedRevision: revision } = args;
  const { target, replacement, removed } = removalTarget(
    session,
    args.relationId,
    revision,
    args.keep
  );
  let before = target;
  let after: Entry = replacement;
  const upserts = new Map<string, Entry>();
  upserts.set(replacement.binding.relationId, replacement);
  const replacements = new Map<string, string>();
  const operations: string[] = [];
  const rebind = () => {
    for (const [oldId, newId] of inputIdentityMap(before.fields, after.fields))
      replacements.set(oldId, newId);
  };
  rebind();
  while (before.consumers.length > 0) {
    const parent = session.locate(before.consumers[0]!, revision);
    const schemas = await Promise.all(parent.inputs.map((id) => session.query(id, args.signal)));
    const inputs = readRelationStructure(parent.relation).inputs.map((input, port) =>
      parent.inputs[port] === before.binding.relationId ? after.relation : input
    );
    const fields = schemas.map((schema) => schema.bindings);
    const changed = fields.map((input, port) =>
      parent.inputs[port] === before.binding.relationId ? after.fields : input
    );
    const retained: number[] = [];
    try {
      const relation = rebaseRelationInput(parent.relation, inputs, fields, changed, retained);
      const variant = parent.relation.relType.case;
      after = {
        relation,
        binding: parent.binding,
        fields:
          variant === 'aggregate' || variant === 'set'
            ? parent.fields
            : retainCompositionOutputs(parent.fields, retained),
      };
      upserts.set(parent.binding.relationId, after);
    } catch (error) {
      if (
        !(error instanceof SubstraitAnalysisError) ||
        error.code !== 'invalid_binding' ||
        parent.inputs.length !== 1
      )
        throw error;
      operations.push(
        parent.relation.relType.case === 'project'
          ? 'WINDOW / PROJECT'
          : parent.relation.relType.case!.toUpperCase()
      );
      removed.add(parent.binding.relationId);
    }
    before = parent;
    rebind();
  }
  // Resolve chains created by retiring multiple consecutive operators.
  for (const [id, value] of replacements) {
    let current = value;
    const seen = new Set([id]);
    while (
      replacements.has(current) &&
      replacements.get(current) !== current &&
      !seen.has(current)
    ) {
      seen.add(current);
      current = replacements.get(current)!;
    }
    replacements.set(id, current);
  }
  const rebound = rebindSelectedFieldReferences(
    session,
    replacements,
    [...upserts.values()],
    revision
  ).filter((entry) => !removed.has(entry.binding.relationId));
  const change: RelationChangeSet = {
    expectedRevision: revision,
    removed: [...removed],
    upserts: rebound,
    rootId: after.binding.relationId,
    rootNames: flattenDvtSubstraitFieldNames(
      orderedDvtSubstraitFields(after.fields, after.binding.relationId).map((field) =>
        buildDvtSubstraitFieldTree(field, after.fields)
      )
    ),
  };
  await validateRelationChanges(session, change, new Map(), args.signal);
  args.signal?.throwIfAborted();
  session.locate(session.rootId, revision);
  return { change, operations };
}

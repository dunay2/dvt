/** Reconnect and validate a local canonical edit; all operator commands share this commit boundary. */
import { readRelationStructure, type RelationChangeSet } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  reconnectSelectedRelation,
  rebindSelectedFieldReferences,
} from './canvasSelectedRelationChange';
import { inputIdentityMap, rebaseRelationInput } from './canvasRelationInputRemap';
import { validateRelationChanges } from './canvasRelationChangeValidation';
import {
  orderedDvtSubstraitFields,
  buildDvtSubstraitFieldTree,
  flattenDvtSubstraitFieldNames,
} from './canvasDvtSubstraitStructuredField';

export async function commitSelectedRelation(
  session: CanvasRelationAnalysisSession,
  args: Readonly<{
    relationId: string;
    expectedRevision: number;
    intent: 'insert' | 'edit';
    signal?: AbortSignal;
    replacement: RelationChangeSet['upserts'][number];
    dependencies?: RelationChangeSet['upserts'];
    createdInputs?: ReadonlyMap<string, readonly string[]>;
    extensions?: RelationChangeSet['extensions'];
  }>
) {
  args.signal?.throwIfAborted();
  const target = session.locate(args.relationId, args.expectedRevision);
  const { replacement } = args;
  const { relation, binding, fields } = replacement;
  const reconnected = reconnectSelectedRelation(
    session,
    args.relationId,
    relation,
    binding.relationId,
    args.expectedRevision
  );
  const upserts = [replacement, ...reconnected.upserts, ...(args.dependencies ?? [])];
  if (reconnected.upserts.length > 0) {
    const parent = reconnected.upserts[0]!;
    const location = session.locate(parent.binding.relationId, args.expectedRevision);
    const inputs = await Promise.all(location.inputs.map((id) => session.query(id, args.signal)));
    const before = inputs.map((input) => input.bindings);
    const after = before.map((input, port) =>
      location.inputs[port] === args.relationId ? fields : input
    );
    upserts[1] = {
      ...parent,
      relation: rebaseRelationInput(
        parent.relation,
        readRelationStructure(parent.relation).inputs,
        before,
        after
      ),
    };
  }
  const change: RelationChangeSet = {
    expectedRevision: args.expectedRevision,
    removed: [],
    ...reconnected,
    upserts: rebindSelectedFieldReferences(
      session,
      inputIdentityMap(target.fields, fields),
      upserts,
      args.expectedRevision
    ),
    ...(target.consumers.length === 0
      ? {
          rootNames: flattenDvtSubstraitFieldNames(
            orderedDvtSubstraitFields(fields, binding.relationId).map((field) =>
              buildDvtSubstraitFieldTree(field, fields)
            )
          ),
        }
      : {}),
    ...(args.extensions == null ? {} : { extensions: args.extensions }),
  };
  await validateRelationChanges(session, change, args.createdInputs ?? new Map(), args.signal);
  args.signal?.throwIfAborted();
  return session.apply(change);
}

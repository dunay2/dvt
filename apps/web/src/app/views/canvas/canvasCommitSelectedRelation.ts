/** Reconnect and validate a local canonical edit; all operator commands share this commit boundary. */
import { readRelationStructure, type RelationChangeSet } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  reconnectSelectedRelation,
  rebindSelectedFieldReferences,
} from './canvasSelectedRelationChange';
import { inputIdentityMap, rebaseRelationInput } from '@dvt/substrait-analysis';
import { retainCompositionOutputs } from './canvasCompositionOutputs';
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
    pruneForwardedOutputs?: boolean;
    dependencies?: RelationChangeSet['upserts'];
    removed?: RelationChangeSet['removed'];
    createdInputs?: ReadonlyMap<string, readonly string[]>;
    extensions?: RelationChangeSet['extensions'];
  }>
) {
  args.signal?.throwIfAborted();
  const target = session.locate(args.relationId, args.expectedRevision);
  const { replacement } = args;
  const { binding, fields } = replacement;
  const upserts = [replacement];
  let previous = target;
  let updated = replacement;
  while (previous.consumers.length > 0) {
    const [parent] = reconnectSelectedRelation(
      session,
      previous.binding.relationId,
      updated.relation,
      updated.binding.relationId,
      args.expectedRevision
    ).upserts;
    if (parent == null) break;
    const location = session.locate(parent.binding.relationId, args.expectedRevision);
    const inputs = await Promise.all(location.inputs.map((id) => session.query(id, args.signal)));
    const before = inputs.map((input) => input.bindings);
    const after = before.map((input, port) =>
      location.inputs[port] === previous.binding.relationId ? updated.fields : input
    );
    // Only intermediate emit mappings may shrink. Predicates and the final output stay strict.
    const variant = location.relation.relType.case;
    const retained: number[] | undefined =
      args.pruneForwardedOutputs &&
      location.consumers.length > 0 &&
      variant !== 'aggregate' &&
      variant !== 'set'
        ? []
        : undefined;
    updated = {
      ...parent,
      relation: rebaseRelationInput(
        parent.relation,
        readRelationStructure(parent.relation).inputs,
        before,
        after,
        retained
      ),
      fields: retained == null ? parent.fields : retainCompositionOutputs(parent.fields, retained),
    };
    upserts.push(updated);
    if (updated.fields.length === parent.fields.length) break;
    previous = location;
  }
  const change: RelationChangeSet = {
    expectedRevision: args.expectedRevision,
    removed: args.removed ?? [],
    upserts: rebindSelectedFieldReferences(
      session,
      inputIdentityMap(target.fields, fields),
      [...upserts, ...(args.dependencies ?? [])],
      args.expectedRevision
    ),
    ...(target.consumers.length === 0
      ? {
          rootId: binding.relationId,
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

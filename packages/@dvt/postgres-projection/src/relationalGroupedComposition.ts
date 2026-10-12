/** A disposable read model of admitted wrappers, never an authoring authority. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { unsupportedProfile, type ProfileInspection } from './substrait-profile/inspection.js';
import { inspectAggregateWrapper } from './substraitAggregateWrapper.js';
import {
  hasCurrentJoinSemanticHash,
  hasUniqueJoinSidecarIdentity,
} from './substraitJoinInspectionGuards.js';
import type { DvtSubstraitJoinDraft } from './substraitJoinReadModel.js';
import { inspectWindowWrapper } from './substraitWindowWrapper.js';

export type RelationalCompositionOutput = Readonly<{
  name: string;
  fieldId: string;
  dataType: string;
  nullable: boolean;
  outputOrdinal: number;
}>;
export type InspectCompositionBase = (
  draft: DvtSubstraitJoinDraft
) =>
  | Readonly<{ ok: true; projection: { outputs: readonly RelationalCompositionOutput[] } }>
  | Readonly<{ ok: false }>;
export type RelationalGroupedComposition = Readonly<{
  kind: 'aggregate' | 'window';
  baseDraft: DvtSubstraitJoinDraft;
  resultRelationId: string;
  outputs: readonly RelationalCompositionOutput[];
  groupFieldName: string;
  measureName: string;
  windowName?: string;
}>;

type WrapperInspector = (
  draft: DvtSubstraitJoinDraft,
  inspectBase: InspectCompositionBase
) => ProfileInspection<RelationalGroupedComposition>;

const registrations = {
  aggregate: inspectAggregateWrapper,
  project: inspectWindowWrapper,
} satisfies Partial<Record<NonNullable<Rel['relType']['case']>, WrapperInspector>>;
const inspectors: ReadonlyMap<string, WrapperInspector> = new Map(Object.entries(registrations));

export function inspectRelationalGroupedComposition(
  draft: DvtSubstraitJoinDraft,
  inspectBase: InspectCompositionBase
): ProfileInspection<RelationalGroupedComposition> {
  if (!hasUniqueJoinSidecarIdentity(draft)) return unsupportedProfile('ambiguous-sidecar-identity');
  if (!hasCurrentJoinSemanticHash(draft)) return unsupportedProfile('stale-semantic-hash');
  const root = draft.plan.relations[0]?.relType;
  if (draft.plan.relations.length !== 1 || root?.case !== 'root')
    return unsupportedProfile('unsupported-plan-root');
  const kind = root.value.input?.relType.case;
  const inspect = kind == null ? undefined : inspectors.get(kind);
  return inspect == null
    ? unsupportedProfile('unsupported-wrapper-kind')
    : inspect(draft, inspectBase);
}

/** A disposable read model of admitted wrappers, never an authoring authority. */
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

export function inspectRelationalGroupedComposition(
  draft: DvtSubstraitJoinDraft,
  inspectBase: InspectCompositionBase
): RelationalGroupedComposition | null {
  if (!hasUniqueJoinSidecarIdentity(draft) || !hasCurrentJoinSemanticHash(draft)) return null;
  return inspectWindowWrapper(draft, inspectBase) ?? inspectAggregateWrapper(draft, inspectBase);
}

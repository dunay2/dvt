/** Owns the read-only projection shape for the admitted binary CrossRel chain. */
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { ConnectedSourceRef, DvtSubstraitAuthoringSidecarV1 } from '@dvt/contracts';

import type { DvtSubstraitJoinDataType } from './substraitJoinReadModel.js';
import type { DvtSubstraitNInputJoinProjection } from './substraitJoinReadModel.js';

export type DvtSubstraitCrossDraft = Readonly<{
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

export type DvtSubstraitCrossProjection = Readonly<{
  inputs: readonly Readonly<{
    relationId: string;
    schema: string;
    table: string;
    sourceRef: ConnectedSourceRef;
    fields: readonly Readonly<{
      name: string;
      fieldId: string;
      dataType: DvtSubstraitJoinDataType;
      nullable: boolean;
    }>[];
  }>[];
  crossRelations: readonly Readonly<{ relationId: string; relAnchor: number }>[];
  stageOutputs: readonly (readonly Readonly<{ sourceFieldId: string }>[])[];
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    dataType: DvtSubstraitJoinDataType;
    nullable: boolean;
    outputOrdinal: number;
    source: Readonly<{ inputIndex: number; name: string; fieldId: string }>;
  }>[];
}>;

export type DvtSubstraitCrossInspection =
  Readonly<{ ok: true; projection: DvtSubstraitCrossProjection }> | Readonly<{ ok: false }>;

export type DvtSubstraitMixedCrossProjection = Readonly<{
  projection: DvtSubstraitCrossProjection;
  leftJoin: DvtSubstraitNInputJoinProjection;
  rightInput: DvtSubstraitCrossProjection['inputs'][number];
}>;

export type DvtSubstraitMixedCrossInspection =
  Readonly<{ ok: true; projection: DvtSubstraitMixedCrossProjection }> | Readonly<{ ok: false }>;

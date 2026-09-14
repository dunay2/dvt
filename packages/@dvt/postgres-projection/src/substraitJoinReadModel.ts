/** Owns the existing read-only JOIN projection shapes shared by Canvas and PostgreSQL. */
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { ConnectedSourceRef, DvtSubstraitAuthoringSidecarV1 } from '@dvt/contracts';

import type { DvtSubstraitJoinPredicateCondition } from './substraitJoinCondition.js';
import type { DvtSubstraitInspectedJoinOperand } from './substraitJoinOperandReader.js';

export type DvtSubstraitJoinDataType = 'string' | 'bool' | 'i64' | 'fp64' | 'precisionTimestampTz';

export type DvtSubstraitInnerJoinDraft = Readonly<{
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

export type DvtSubstraitNInputJoinProjection = Readonly<{
  inputs: readonly Readonly<{
    relationId: string;
    schema: string;
    table: string;
    sourceRef: ConnectedSourceRef;
    fields: readonly Readonly<{
      name: string;
      fieldId: string;
      dataType: DvtSubstraitJoinDataType;
    }>[];
  }>[];
  joinRelations: readonly Readonly<{ relationId: string; relAnchor: number }>[];
  joins: readonly DvtSubstraitJoinPredicate[];
  outputs: readonly Readonly<{
    name: string;
    fieldId: string;
    dataType: DvtSubstraitJoinDataType;
    outputOrdinal: number;
    source: Readonly<{ inputIndex: number; name: string; fieldId: string }>;
  }>[];
}>;

export type DvtSubstraitNInputJoinInspection =
  Readonly<{ ok: true; projection: DvtSubstraitNInputJoinProjection }> | Readonly<{ ok: false }>;

export type DvtSubstraitJoinPredicate = Readonly<{
  conditions: readonly DvtSubstraitJoinPredicateCondition[];
}>;

export type JoinOriginField = Readonly<{
  inputIndex: number;
  name: string;
  fieldId: string;
  dataType: DvtSubstraitJoinDataType;
}>;

export type InspectedJoinStage = Readonly<{
  relationId: string;
  relAnchor: number;
  fields: readonly Readonly<{
    fieldId: string;
    displayName: string;
    sourceFieldId: string;
  }>[];
}>;

export type InspectedJoinStructure = Readonly<{
  inputs: DvtSubstraitNInputJoinProjection['inputs'];
  stages: readonly InspectedJoinStage[];
  joins: readonly DvtSubstraitJoinPredicate[];
  outputs: DvtSubstraitNInputJoinProjection['outputs'];
}>;

export type InspectedJoinPredicateOperand = DvtSubstraitInspectedJoinOperand;

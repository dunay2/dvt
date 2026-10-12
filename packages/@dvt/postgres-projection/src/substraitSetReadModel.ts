import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { ConnectedSourceRef, DvtSubstraitAuthoringSidecarV1 } from '@dvt/contracts';

export type DvtSubstraitSetOperation =
  | 'union_all'
  | 'union_distinct'
  | 'intersect_distinct'
  | 'except_distinct'
  | 'intersect_all'
  | 'except_all';

export type DvtSubstraitSetDraft = Readonly<{
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

export type DvtSubstraitSetProjection = Readonly<{
  operation: DvtSubstraitSetOperation;
  inputs: readonly Readonly<{
    relationId: string;
    schema: string;
    table: string;
    sourceRef: ConnectedSourceRef;
    fields: readonly Readonly<{
      name: string;
      fieldId: string;
      dataType: string;
      nullable: boolean;
    }>[];
  }>[];
  resultRelationId: string;
  outputs: readonly Readonly<{
    fieldKey: string;
    name: string;
    fieldId: string;
    outputOrdinal: number;
    dataType: string;
    nullable: boolean;
  }>[];
}>;

export type DvtSubstraitSetInspection =
  Readonly<{ ok: true; projection: DvtSubstraitSetProjection }> | Readonly<{ ok: false }>;

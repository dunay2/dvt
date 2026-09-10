import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { ConnectedSourceRef, DvtSubstraitAuthoringSidecarV1 } from '@dvt/contracts';

export type DvtCalculatedExpression =
  | Readonly<{ kind: 'string-literal'; value: string }>
  | Readonly<{ kind: 'timestamp-literal'; value: string }>
  | Readonly<{ kind: 'row-number'; orderSourceOrdinal: number }>;

export type DvtConnectedFieldProjection = Readonly<{
  targetNodeId: string;
  source: Readonly<{
    nodeId: string;
    schema: string;
    table: string;
    sourceRef: ConnectedSourceRef;
    fields: readonly Readonly<{ name: string; dataType: string }>[];
  }>;
  outputs: readonly Readonly<{
    fieldId: string;
    name: string;
    sourceFieldId?: string;
    sourceFieldName?: string;
    calculation?: DvtCalculatedExpression;
    dataType: string;
    outputOrdinal: number;
    operations?: readonly string[];
    description?: string;
  }>[];
}>;

export type DvtSubstraitProjectionDraft = Readonly<{
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

export type DvtConnectedFieldInspection =
  Readonly<{ ok: true; projection: DvtConnectedFieldProjection }> | Readonly<{ ok: false }>;

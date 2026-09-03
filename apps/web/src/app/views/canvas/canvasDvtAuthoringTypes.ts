import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { DVT_TRANSFORM_AUTHORING_MODE, type ConnectionRef } from '@dvt/contracts';
import type { DvtSubstraitAuthoringSidecarV1 } from '@dvt/contracts';

import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';

export type DvtSourceAuthoringMetadata = Readonly<{
  kind: 'source';
  schema: string;
  table: string;
  alias: string;
  connectionRef?: ConnectionRef;
}>;

export type DvtUninitializedTransformAuthoringMetadata = Readonly<{
  kind: 'transform';
  mode: 'uninitialized';
}>;

export type DvtSubstraitTransformAuthoringMetadata = Readonly<{
  kind: 'transform';
  mode: typeof DVT_TRANSFORM_AUTHORING_MODE.substrait;
  shape: 'projection' | 'pilot' | 'inner_join' | 'union_all';
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

export type DvtSinkAuthoringMetadata = Readonly<{
  kind: 'sink';
  schema: string;
  table: string;
  materialization: string;
  writeMode: string;
}>;

export type DvtNodeAuthoringMetadata =
  | DvtSourceAuthoringMetadata
  | DvtUninitializedTransformAuthoringMetadata
  | DvtSubstraitTransformAuthoringMetadata
  | DvtSinkAuthoringMetadata;

export type DvtNodeAuthoringMetadataErrors = Partial<
  Record<
    'schema' | 'table' | 'alias' | 'connectionRef' | 'materialization' | 'writeMode',
    CanvasInspectorNodeDraftErrorCode
  >
>;

import { KNOWN_STEP_KINDS } from './StepKindRegistry.v1.js';

export const TRANSFORMATION_STEP_KIND = {
  preparePostgresTransform: KNOWN_STEP_KINDS.PREPARE_POSTGRES_TRANSFORM,
  postgresSqlTransform: KNOWN_STEP_KINDS.POSTGRES_SQL_TRANSFORM,
  captureMaterializationEvidence: KNOWN_STEP_KINDS.CAPTURE_MATERIALIZATION_EVIDENCE,
} as const;

export type TransformationStepKind =
  (typeof TRANSFORMATION_STEP_KIND)[keyof typeof TRANSFORMATION_STEP_KIND];

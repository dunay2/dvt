import { KNOWN_STEP_KINDS } from '@dvt/contracts';

export const EXTERNAL_COMPILE_SUPPORTED_STEP_KINDS = [
  KNOWN_STEP_KINDS.PREPARE_POSTGRES_TRANSFORM,
  KNOWN_STEP_KINDS.POSTGRES_SQL_TRANSFORM,
  KNOWN_STEP_KINDS.CAPTURE_MATERIALIZATION_EVIDENCE,
] as const;

export type ExternalCompileSupportedStepKind = (typeof EXTERNAL_COMPILE_SUPPORTED_STEP_KINDS)[number];

export interface ExternalCompileProfileSpec {
  readonly profileId: 'external-compile-v1';
  readonly allowedStepKinds: readonly ExternalCompileSupportedStepKind[];
}

export const EXTERNAL_COMPILE_PROFILE_SPEC: ExternalCompileProfileSpec = {
  profileId: 'external-compile-v1',
  allowedStepKinds: EXTERNAL_COMPILE_SUPPORTED_STEP_KINDS,
};

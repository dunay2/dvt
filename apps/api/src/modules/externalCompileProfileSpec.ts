import {
  BUILT_IN_EXTERNAL_COMPILE_FAMILIES,
  BUILT_IN_EXTERNAL_COMPILE_STEP_KINDS,
  type ExternalCompileFamilyId,
  type ExternalCompileStepKind,
} from './externalCompileCatalog.js';

export const EXTERNAL_COMPILE_SUPPORTED_FAMILIES = BUILT_IN_EXTERNAL_COMPILE_FAMILIES;
export const EXTERNAL_COMPILE_SUPPORTED_STEP_KINDS = BUILT_IN_EXTERNAL_COMPILE_STEP_KINDS;

export interface ExternalCompileProfileSpec {
  readonly profileId: 'external-compile-v1';
  readonly allowedFamilies: readonly ExternalCompileFamilyId[];
  readonly allowedStepKinds: readonly ExternalCompileStepKind[];
  readonly allowBridgeKinds: false;
}

export const EXTERNAL_COMPILE_PROFILE_SPEC: ExternalCompileProfileSpec = {
  profileId: 'external-compile-v1',
  allowedFamilies: EXTERNAL_COMPILE_SUPPORTED_FAMILIES,
  allowedStepKinds: EXTERNAL_COMPILE_SUPPORTED_STEP_KINDS,
  allowBridgeKinds: false,
};

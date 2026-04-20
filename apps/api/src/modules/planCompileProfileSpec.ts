import {
  BUILT_IN_PLAN_COMPILE_FAMILIES,
  BUILT_IN_PLAN_COMPILE_STEP_KINDS,
  type PlanCompileFamilyId,
  type PlanCompileStepKind,
} from './planCompileCatalog.js';

export const PLAN_COMPILE_SUPPORTED_FAMILIES = BUILT_IN_PLAN_COMPILE_FAMILIES;
export const PLAN_COMPILE_SUPPORTED_STEP_KINDS = BUILT_IN_PLAN_COMPILE_STEP_KINDS;

export interface PlanCompileProfileSpec {
  readonly profileId: 'plan-compile-v1';
  readonly allowedFamilies: readonly PlanCompileFamilyId[];
  readonly allowedStepKinds: readonly PlanCompileStepKind[];
  readonly allowBridgeKinds: false;
}

export const PLAN_COMPILE_PROFILE_SPEC: PlanCompileProfileSpec = {
  profileId: 'plan-compile-v1',
  allowedFamilies: PLAN_COMPILE_SUPPORTED_FAMILIES,
  allowedStepKinds: PLAN_COMPILE_SUPPORTED_STEP_KINDS,
  allowBridgeKinds: false,
};

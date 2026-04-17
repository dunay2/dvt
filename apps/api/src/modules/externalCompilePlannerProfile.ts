import {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  createDefaultStepTypeRegistry,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import type { PlannerFacadeOptions } from '@dvt/planner';

import {
  EXTERNAL_COMPILE_PROFILE_SPEC,
  type ExternalCompileProfileSpec,
} from './externalCompileProfileSpec.js';

const EXTERNAL_COMPILE_STEP_SCHEMA_REGISTRY = {
  PREPARE_POSTGRES_TRANSFORM: PreparePostgresTransformStepTypeConfigSchema,
  POSTGRES_SQL_TRANSFORM: PostgresSqlTransformStepTypeConfigSchema,
  CAPTURE_MATERIALIZATION_EVIDENCE: CaptureMaterializationEvidenceStepTypeConfigSchema,
} as const;

function resolveExternalCompileStepSchemas(spec: ExternalCompileProfileSpec) {
  return new Map(spec.allowedStepKinds.map((stepKind) => [stepKind, EXTERNAL_COMPILE_STEP_SCHEMA_REGISTRY[stepKind]]));
}

export function buildExternalCompilePlanner(
  spec: ExternalCompileProfileSpec = EXTERNAL_COMPILE_PROFILE_SPEC
): PlannerFacade {
  const plannerOptions: PlannerFacadeOptions = {
    stepTypeRegistry: createDefaultStepTypeRegistry(resolveExternalCompileStepSchemas(spec)),
  };

  return new PlannerFacade(plannerOptions);
}

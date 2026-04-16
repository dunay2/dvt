import { z } from 'zod';

import { KNOWN_STEP_KINDS } from '../contracts/planner/StepKindRegistry.v1.js';
import { TRANSFORMATION_STEP_KIND } from '../contracts/planner/TransformationFlowStepKinds.v1.js';
import {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
} from '../contracts/planner/TransformationFlowStepTypeConfigs.v1.js';

import { DbtStepTypeConfigSchema } from './DbtStepTypeConfig.js';
import type { StepKindExecutionProfile } from './StepTypeRegistry.js';

type BuiltInStepTypeEntry = {
  readonly schema: z.ZodType;
  readonly profile: StepKindExecutionProfile;
};

export function createBuiltInStepTypeEntries(
  defaultProfile: StepKindExecutionProfile
): ReadonlyMap<string, BuiltInStepTypeEntry> {
  return new Map([
    [KNOWN_STEP_KINDS.DBT_MODEL, { schema: DbtStepTypeConfigSchema, profile: defaultProfile }],
    [KNOWN_STEP_KINDS.DBT_TEST, { schema: DbtStepTypeConfigSchema, profile: defaultProfile }],
    [KNOWN_STEP_KINDS.DBT_SNAPSHOT, { schema: DbtStepTypeConfigSchema, profile: defaultProfile }],
    [
      TRANSFORMATION_STEP_KIND.preparePostgresTransform,
      { schema: PreparePostgresTransformStepTypeConfigSchema, profile: defaultProfile },
    ],
    [
      TRANSFORMATION_STEP_KIND.postgresSqlTransform,
      { schema: PostgresSqlTransformStepTypeConfigSchema, profile: defaultProfile },
    ],
    [
      TRANSFORMATION_STEP_KIND.captureMaterializationEvidence,
      {
        schema: CaptureMaterializationEvidenceStepTypeConfigSchema,
        profile: defaultProfile,
      },
    ],
  ] as const);
}

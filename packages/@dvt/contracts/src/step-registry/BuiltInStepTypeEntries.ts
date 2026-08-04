import { z } from 'zod';

import {
  LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY,
  LoadObjectFileToPostgresStepTypeConfigSchema,
  validateLoadObjectFileToPostgresPlanOwnership,
} from '../contracts/planner/ObjectFileToPostgresStepTypeConfig.v1.js';
import { KNOWN_STEP_KINDS } from '../contracts/planner/StepKindRegistry.v1.js';
import { TRANSFORMATION_STEP_KIND } from '../contracts/planner/TransformationFlowStepKinds.v1.js';
import {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
} from '../contracts/planner/TransformationFlowStepTypeConfigs.v1.js';

import { DbtStepTypeConfigSchema } from './DbtStepTypeConfig.js';
import type { StepKindContextValidator, StepKindExecutionProfile } from './StepTypeRegistry.js';

type BuiltInStepTypeEntry = {
  readonly schema: z.ZodType;
  readonly profile: StepKindExecutionProfile;
  readonly validateContext?: StepKindContextValidator;
};

export const DBT_STEP_REQUIRED_CAPABILITY = 'executor.dbt';
export const LOAD_OBJECT_FILE_TO_POSTGRES_STEP_REQUIRED_CAPABILITY =
  LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY;

export function createBuiltInStepTypeEntries(
  defaultProfile: StepKindExecutionProfile
): ReadonlyMap<string, BuiltInStepTypeEntry> {
  const dbtProfile = withRequiredCapability(defaultProfile, DBT_STEP_REQUIRED_CAPABILITY);

  return new Map([
    [KNOWN_STEP_KINDS.DBT_MODEL, { schema: DbtStepTypeConfigSchema, profile: dbtProfile }],
    [KNOWN_STEP_KINDS.DBT_TEST, { schema: DbtStepTypeConfigSchema, profile: dbtProfile }],
    [KNOWN_STEP_KINDS.DBT_SNAPSHOT, { schema: DbtStepTypeConfigSchema, profile: dbtProfile }],
    [
      KNOWN_STEP_KINDS.LOAD_OBJECT_FILE_TO_POSTGRES,
      {
        schema: LoadObjectFileToPostgresStepTypeConfigSchema,
        profile: {
          supportedAdapters: ['temporal'],
          requiredCapabilities: [LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY],
        },
        validateContext: (config, context) =>
          validateLoadObjectFileToPostgresPlanOwnership(config, context?.planOwnership),
      },
    ],
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

function withRequiredCapability(
  profile: StepKindExecutionProfile,
  capability: string
): StepKindExecutionProfile {
  return {
    supportedAdapters: [...profile.supportedAdapters],
    requiredCapabilities: Array.from(new Set([...profile.requiredCapabilities, capability])),
  };
}

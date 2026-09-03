import { z } from 'zod';

import {
  ACQUIRE_HTTP_JSON_ARTIFACT_REQUIRED_CAPABILITY,
  HttpJsonArtifactStepTypeConfigSchema,
  validateHttpJsonArtifactPlanOwnership,
} from '../contracts/planner/HttpJsonArtifactStepTypeConfig.v1.js';
import {
  LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY,
  LoadObjectFileToPostgresStepTypeConfigSchema,
  validateLoadObjectFileToPostgresPlanOwnership,
} from '../contracts/planner/ObjectFileToPostgresStepTypeConfig.v1.js';
import { KNOWN_STEP_KINDS } from '../contracts/planner/StepKindRegistry.v1.js';

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
export const LOAD_OBJECT_FILE_TO_POSTGRES_EXECUTION_PROFILE = {
  supportedAdapters: ['temporal'],
  requiredCapabilities: [LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY],
} as const satisfies StepKindExecutionProfile;
export const ACQUIRE_HTTP_JSON_ARTIFACT_STEP_REQUIRED_CAPABILITY =
  ACQUIRE_HTTP_JSON_ARTIFACT_REQUIRED_CAPABILITY;
export const ACQUIRE_HTTP_JSON_ARTIFACT_EXECUTION_PROFILE = {
  supportedAdapters: ['temporal'],
  requiredCapabilities: [ACQUIRE_HTTP_JSON_ARTIFACT_REQUIRED_CAPABILITY],
} as const satisfies StepKindExecutionProfile;

export function createBuiltInStepTypeEntries(
  defaultProfile: StepKindExecutionProfile
): ReadonlyMap<string, BuiltInStepTypeEntry> {
  const dbtProfile = withRequiredCapability(defaultProfile, DBT_STEP_REQUIRED_CAPABILITY);

  return new Map([
    [KNOWN_STEP_KINDS.DBT_MODEL, { schema: DbtStepTypeConfigSchema, profile: dbtProfile }],
    [KNOWN_STEP_KINDS.DBT_TEST, { schema: DbtStepTypeConfigSchema, profile: dbtProfile }],
    [KNOWN_STEP_KINDS.DBT_SNAPSHOT, { schema: DbtStepTypeConfigSchema, profile: dbtProfile }],
    [
      KNOWN_STEP_KINDS.ACQUIRE_HTTP_JSON_ARTIFACT,
      {
        schema: HttpJsonArtifactStepTypeConfigSchema,
        profile: ACQUIRE_HTTP_JSON_ARTIFACT_EXECUTION_PROFILE,
        validateContext: (config, context) =>
          validateHttpJsonArtifactPlanOwnership(config, context?.planOwnership),
      },
    ],
    [
      KNOWN_STEP_KINDS.LOAD_OBJECT_FILE_TO_POSTGRES,
      {
        schema: LoadObjectFileToPostgresStepTypeConfigSchema,
        profile: LOAD_OBJECT_FILE_TO_POSTGRES_EXECUTION_PROFILE,
        validateContext: (config, context) =>
          validateLoadObjectFileToPostgresPlanOwnership(config, context?.planOwnership),
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

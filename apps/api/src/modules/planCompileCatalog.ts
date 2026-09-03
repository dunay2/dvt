/** Owned concern: define the built-in families and step kinds admitted by CompilePlan. */
import {
  LOAD_OBJECT_FILE_TO_POSTGRES_EXECUTION_PROFILE,
  LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
  LoadObjectFileToPostgresStepTypeConfigSchema,
  SparkJobStepTypeConfigSchema,
  SUPPORTED_START_RUN_TARGET_ADAPTERS,
  validateLoadObjectFileToPostgresPlanOwnership,
} from '@dvt/contracts';
import type { StepKindContextValidator, StepKindExecutionProfile } from '@dvt/contracts';

type PlanCompileStepSchema =
  typeof SparkJobStepTypeConfigSchema | typeof LoadObjectFileToPostgresStepTypeConfigSchema;

const BUILT_IN_STEP_FAMILY_DEFINITIONS = [
  {
    family: 'spark',
    sourceFamilies: ['spark-job-graph'],
    owner: 'built-in',
    pluginExtendable: true,
  },
  {
    family: 'object_file_load',
    sourceFamilies: ['het-object-file'],
    owner: 'built-in',
    pluginExtendable: false,
  },
] as const satisfies readonly StepFamilyDefinition[];

export type PlanCompileFamilyId = (typeof BUILT_IN_STEP_FAMILY_DEFINITIONS)[number]['family'];

export interface StepFamilyDefinition {
  readonly family: string;
  readonly sourceFamilies: readonly string[];
  readonly owner: 'built-in';
  readonly pluginExtendable: boolean;
}

const BUILT_IN_STEP_KIND_DEFINITIONS = [
  {
    kind: 'SPARK_JOB',
    family: 'spark',
    schema: SparkJobStepTypeConfigSchema,
    executionProfile: {
      supportedAdapters: SUPPORTED_START_RUN_TARGET_ADAPTERS,
      requiredCapabilities: ['spark.submit'],
    },
    source: 'built-in',
  },
  {
    kind: LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
    family: 'object_file_load',
    schema: LoadObjectFileToPostgresStepTypeConfigSchema,
    executionProfile: LOAD_OBJECT_FILE_TO_POSTGRES_EXECUTION_PROFILE,
    validateContext: (config, context) =>
      validateLoadObjectFileToPostgresPlanOwnership(config, context?.planOwnership),
    source: 'built-in',
  },
] as const satisfies readonly StepKindDefinition[];

export type PlanCompileStepKind = (typeof BUILT_IN_STEP_KIND_DEFINITIONS)[number]['kind'];

export interface StepKindDefinition {
  readonly kind: string;
  readonly family: PlanCompileFamilyId;
  readonly schema: PlanCompileStepSchema;
  readonly executionProfile: StepKindExecutionProfile;
  readonly validateContext?: StepKindContextValidator;
  readonly source: 'built-in';
}

export interface ResolvedStepCatalog {
  readonly families: ReadonlyMap<PlanCompileFamilyId, StepFamilyDefinition>;
  readonly stepKinds: ReadonlyMap<PlanCompileStepKind, StepKindDefinition>;
}

export interface PlanCompileProfileSpec {
  readonly profileId: 'plan-compile-v1';
  readonly allowedFamilies: readonly PlanCompileFamilyId[];
  readonly allowedStepKinds: readonly PlanCompileStepKind[];
  readonly allowBridgeKinds: false;
}

export interface PlanCompileBoundaryDefinition {
  readonly profile: PlanCompileProfileSpec;
  readonly catalog: {
    readonly families: readonly StepFamilyDefinition[];
    readonly stepKinds: readonly StepKindDefinition[];
  };
}

export const PLAN_COMPILE_PROFILE_SPEC: PlanCompileProfileSpec = {
  profileId: 'plan-compile-v1',
  allowedFamilies: BUILT_IN_STEP_FAMILY_DEFINITIONS.map(({ family }) => family),
  allowedStepKinds: BUILT_IN_STEP_KIND_DEFINITIONS.map(({ kind }) => kind),
  allowBridgeKinds: false,
};

export const PLAN_COMPILE_BOUNDARY: PlanCompileBoundaryDefinition = {
  profile: PLAN_COMPILE_PROFILE_SPEC,
  catalog: {
    families: BUILT_IN_STEP_FAMILY_DEFINITIONS,
    stepKinds: BUILT_IN_STEP_KIND_DEFINITIONS,
  },
};

export function resolvePlanCompileCatalog(
  boundary: PlanCompileBoundaryDefinition = PLAN_COMPILE_BOUNDARY
): ResolvedStepCatalog {
  const families = indexUnique(
    boundary.catalog.families,
    ({ family }) => family as PlanCompileFamilyId,
    'plan compile family'
  );
  for (const definition of boundary.catalog.stepKinds) {
    if (!families.has(definition.family)) {
      throw new Error(
        `Plan compile step kind ${definition.kind} references unknown family ${definition.family}`
      );
    }
  }
  const stepKinds = indexUnique(
    boundary.catalog.stepKinds,
    ({ kind }) => kind as PlanCompileStepKind,
    'plan compile step kind'
  );
  return { families, stepKinds };
}

function indexUnique<Key extends string, Value>(
  values: readonly Value[],
  keyOf: (value: Value) => Key,
  label: string
): ReadonlyMap<Key, Value> {
  const index = new Map<Key, Value>();
  for (const value of values) {
    const key = keyOf(value);
    if (index.has(key)) throw new Error(`Duplicate ${label} definition: ${key}`);
    index.set(key, value);
  }
  return index;
}

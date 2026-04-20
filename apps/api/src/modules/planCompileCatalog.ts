import type { Provider, StepKindExecutionProfile } from '@dvt/contracts';
import {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
  SparkJobStepTypeConfigSchema,
} from '@dvt/contracts';

const ALL_PLAN_COMPILE_ADAPTERS: readonly Provider[] = ['conductor', 'mock', 'temporal'];

export const BUILT_IN_PLAN_COMPILE_FAMILIES = ['sql_transform', 'spark'] as const;
export type PlanCompileFamilyId = (typeof BUILT_IN_PLAN_COMPILE_FAMILIES)[number];

export const BUILT_IN_PLAN_COMPILE_STEP_KINDS = [
  'PREPARE_POSTGRES_TRANSFORM',
  'POSTGRES_SQL_TRANSFORM',
  'CAPTURE_MATERIALIZATION_EVIDENCE',
  'SPARK_JOB',
] as const;
export type PlanCompileStepKind = (typeof BUILT_IN_PLAN_COMPILE_STEP_KINDS)[number];

export interface StepFamilyDefinition {
  readonly family: PlanCompileFamilyId;
  readonly sourceFamilies: readonly string[];
  readonly owner: 'built-in';
  readonly pluginExtendable: boolean;
}

export interface ResolvedStepCatalog {
  readonly families: ReadonlyMap<PlanCompileFamilyId, StepFamilyDefinition>;
  readonly stepKinds: ReadonlyMap<PlanCompileStepKind, StepKindDefinition>;
}

const DEFAULT_EXECUTION_PROFILE: StepKindExecutionProfile = {
  supportedAdapters: ALL_PLAN_COMPILE_ADAPTERS,
  requiredCapabilities: [],
};

type PlanCompileStepSchema =
  | typeof PreparePostgresTransformStepTypeConfigSchema
  | typeof PostgresSqlTransformStepTypeConfigSchema
  | typeof CaptureMaterializationEvidenceStepTypeConfigSchema
  | typeof SparkJobStepTypeConfigSchema;

export interface StepKindDefinition {
  readonly kind: PlanCompileStepKind;
  readonly family: PlanCompileFamilyId;
  readonly schema: PlanCompileStepSchema;
  readonly executionProfile: StepKindExecutionProfile;
  readonly source: 'built-in';
}

const BUILT_IN_STEP_FAMILY_DEFINITIONS: readonly StepFamilyDefinition[] = [
  {
    family: 'sql_transform',
    sourceFamilies: ['transformation-design-graph'],
    owner: 'built-in',
    pluginExtendable: false,
  },
  {
    family: 'spark',
    sourceFamilies: ['spark-job-graph'],
    owner: 'built-in',
    pluginExtendable: true,
  },
] as const;

const BUILT_IN_STEP_KIND_DEFINITIONS: readonly StepKindDefinition[] = [
  {
    kind: 'PREPARE_POSTGRES_TRANSFORM',
    family: 'sql_transform',
    schema: PreparePostgresTransformStepTypeConfigSchema,
    executionProfile: DEFAULT_EXECUTION_PROFILE,
    source: 'built-in',
  },
  {
    kind: 'POSTGRES_SQL_TRANSFORM',
    family: 'sql_transform',
    schema: PostgresSqlTransformStepTypeConfigSchema,
    executionProfile: DEFAULT_EXECUTION_PROFILE,
    source: 'built-in',
  },
  {
    kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
    family: 'sql_transform',
    schema: CaptureMaterializationEvidenceStepTypeConfigSchema,
    executionProfile: DEFAULT_EXECUTION_PROFILE,
    source: 'built-in',
  },
  {
    kind: 'SPARK_JOB',
    family: 'spark',
    schema: SparkJobStepTypeConfigSchema,
    executionProfile: {
      supportedAdapters: ALL_PLAN_COMPILE_ADAPTERS,
      requiredCapabilities: ['spark.submit'],
    },
    source: 'built-in',
  },
] as const;

export function resolvePlanCompileCatalog(options?: {
  readonly families?: readonly StepFamilyDefinition[];
  readonly stepKinds?: readonly StepKindDefinition[];
}): ResolvedStepCatalog {
  const families = buildFamilyMap(options?.families ?? BUILT_IN_STEP_FAMILY_DEFINITIONS);
  const stepKinds = buildStepKindMap(options?.stepKinds ?? BUILT_IN_STEP_KIND_DEFINITIONS, families);

  return {
    families,
    stepKinds,
  };
}

function buildFamilyMap(
  definitions: readonly StepFamilyDefinition[]
): ReadonlyMap<PlanCompileFamilyId, StepFamilyDefinition> {
  const families = new Map<PlanCompileFamilyId, StepFamilyDefinition>();
  for (const definition of definitions) {
    if (families.has(definition.family)) {
      throw new Error(`Duplicate plan compile family definition: ${definition.family}`);
    }
    families.set(definition.family, definition);
  }
  return families;
}

function buildStepKindMap(
  definitions: readonly StepKindDefinition[],
  families: ReadonlyMap<PlanCompileFamilyId, StepFamilyDefinition>
): ReadonlyMap<PlanCompileStepKind, StepKindDefinition> {
  const stepKinds = new Map<PlanCompileStepKind, StepKindDefinition>();
  for (const definition of definitions) {
    if (!families.has(definition.family)) {
      throw new Error(
        `Plan compile step kind ${definition.kind} references unknown family ${definition.family}`
      );
    }
    if (stepKinds.has(definition.kind)) {
      throw new Error(`Duplicate plan compile step kind definition: ${definition.kind}`);
    }
    stepKinds.set(definition.kind, definition);
  }
  return stepKinds;
}

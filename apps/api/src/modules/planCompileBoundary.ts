import type { Provider, StepKindExecutionProfile } from '@dvt/contracts';
import {
  CaptureMaterializationEvidenceStepTypeConfigSchema,
  PostgresSqlTransformStepTypeConfigSchema,
  PreparePostgresTransformStepTypeConfigSchema,
  SparkJobStepTypeConfigSchema,
  StepTypeRegistry,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import type { PlannerFacadeOptions } from '@dvt/planner';

const ALL_PLAN_COMPILE_ADAPTERS: readonly Provider[] = ['conductor', 'mock', 'temporal'];

type PlanCompileStepSchema =
  | typeof PreparePostgresTransformStepTypeConfigSchema
  | typeof PostgresSqlTransformStepTypeConfigSchema
  | typeof CaptureMaterializationEvidenceStepTypeConfigSchema
  | typeof SparkJobStepTypeConfigSchema;

const DEFAULT_EXECUTION_PROFILE = {
  supportedAdapters: ALL_PLAN_COMPILE_ADAPTERS,
  requiredCapabilities: [],
} satisfies StepKindExecutionProfile;

const BUILT_IN_STEP_FAMILY_DEFINITIONS = [
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
] as const satisfies readonly {
  readonly family: string;
  readonly sourceFamilies: readonly string[];
  readonly owner: 'built-in';
  readonly pluginExtendable: boolean;
}[];

export type PlanCompileFamilyId = (typeof BUILT_IN_STEP_FAMILY_DEFINITIONS)[number]['family'];

export interface StepFamilyDefinition {
  readonly family: PlanCompileFamilyId;
  readonly sourceFamilies: readonly string[];
  readonly owner: 'built-in';
  readonly pluginExtendable: boolean;
}

const BUILT_IN_STEP_KIND_DEFINITIONS = [
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
] as const satisfies readonly {
  readonly kind: string;
  readonly family: PlanCompileFamilyId;
  readonly schema: PlanCompileStepSchema;
  readonly executionProfile: StepKindExecutionProfile;
  readonly source: 'built-in';
}[];

export type PlanCompileStepKind = (typeof BUILT_IN_STEP_KIND_DEFINITIONS)[number]['kind'];

export interface StepKindDefinition {
  readonly kind: PlanCompileStepKind;
  readonly family: PlanCompileFamilyId;
  readonly schema: PlanCompileStepSchema;
  readonly executionProfile: StepKindExecutionProfile;
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

const BUILT_IN_PLAN_COMPILE_FAMILIES: readonly PlanCompileFamilyId[] =
  BUILT_IN_STEP_FAMILY_DEFINITIONS.map(({ family }) => family);
const BUILT_IN_PLAN_COMPILE_STEP_KINDS: readonly PlanCompileStepKind[] =
  BUILT_IN_STEP_KIND_DEFINITIONS.map(({ kind }) => kind);

export const PLAN_COMPILE_PROFILE_SPEC: PlanCompileProfileSpec = {
  profileId: 'plan-compile-v1',
  allowedFamilies: BUILT_IN_PLAN_COMPILE_FAMILIES,
  allowedStepKinds: BUILT_IN_PLAN_COMPILE_STEP_KINDS,
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
  const families = buildFamilyMap(boundary.catalog.families);
  const stepKinds = buildStepKindMap(boundary.catalog.stepKinds, families);

  return {
    families,
    stepKinds,
  };
}

export function buildPlanCompilePlanner(
  boundary: PlanCompileBoundaryDefinition = PLAN_COMPILE_BOUNDARY
): PlannerFacade {
  const plannerOptions: PlannerFacadeOptions = {
    stepTypeRegistry: resolvePlanCompileStepRegistry(boundary.profile, resolvePlanCompileCatalog(boundary)),
  };

  return new PlannerFacade(plannerOptions);
}

function resolvePlanCompileStepRegistry(
  spec: PlanCompileProfileSpec,
  catalog: ResolvedStepCatalog
): StepTypeRegistry {
  for (const family of spec.allowedFamilies) {
    if (!catalog.families.has(family)) {
      throw new Error(`Unknown plan compile family in profile ${spec.profileId}: ${family}`);
    }
  }

  const entries = new Map(
    spec.allowedStepKinds.map((stepKind) => {
      const definition = catalog.stepKinds.get(stepKind);
      if (definition === undefined) {
        throw new Error(`Unknown plan compile step kind in profile ${spec.profileId}: ${stepKind}`);
      }
      if (!spec.allowedFamilies.includes(definition.family)) {
        throw new Error(
          `Plan compile step kind ${stepKind} is not exposed by allowed families in profile ${spec.profileId}`
        );
      }
      return [
        stepKind,
        {
          schema: definition.schema,
          profile: definition.executionProfile,
        },
      ] as const;
    })
  );

  return new StepTypeRegistry(entries);
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

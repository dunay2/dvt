/**
 * Owned concern: define the compile-time planner boundary exposed by `apps/api`.
 * This module owns the built-in compile catalog, allowed families/kinds, and
 * the canonical compile planner recipe for this boundary.
 */
import {
  LOAD_OBJECT_FILE_TO_POSTGRES_EXECUTION_PROFILE,
  LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
  LoadObjectFileToPostgresStepTypeConfigSchema,
  SparkJobStepTypeConfigSchema,
  StepTypeRegistry,
  SUPPORTED_START_RUN_TARGET_ADAPTERS,
  validateLoadObjectFileToPostgresPlanOwnership,
} from '@dvt/contracts';
import type { StepKindContextValidator, StepKindExecutionProfile } from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import type { PlannerFacadeOptions } from '@dvt/planner';

const PLAN_COMPILE_SUPPORTED_ADAPTERS = SUPPORTED_START_RUN_TARGET_ADAPTERS;

type PlanCompileStepSchema =
  typeof SparkJobStepTypeConfigSchema | typeof LoadObjectFileToPostgresStepTypeConfigSchema;

const planCompileStepFactory: NonNullable<PlannerFacadeOptions['stepFactory']> = (
  node,
  resolvedPolicies
) => {
  return {
    stepId: node.nodeId,
    kind: node.stepKind,
    dependsOn: node.dependsOn,
    ...(resolvedPolicies.retryPolicy === undefined
      ? {}
      : { retryPolicy: resolvedPolicies.retryPolicy }),
    stepTypeConfig: {
      ...(node.stepTypeConfig ?? {}),
    },
  };
};

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
    kind: 'SPARK_JOB',
    family: 'spark',
    schema: SparkJobStepTypeConfigSchema,
    executionProfile: {
      supportedAdapters: PLAN_COMPILE_SUPPORTED_ADAPTERS,
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
] as const satisfies readonly {
  readonly kind: string;
  readonly family: PlanCompileFamilyId;
  readonly schema: PlanCompileStepSchema;
  readonly executionProfile: StepKindExecutionProfile;
  readonly validateContext?: StepKindContextValidator;
  readonly source: 'built-in';
}[];

export type PlanCompileStepKind = (typeof BUILT_IN_STEP_KIND_DEFINITIONS)[number]['kind'];

export interface StepKindDefinition {
  readonly kind: PlanCompileStepKind;
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
    stepFactory: planCompileStepFactory,
    stepTypeRegistry: resolvePlanCompileStepRegistry(
      boundary.profile,
      resolvePlanCompileCatalog(boundary)
    ),
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
          ...(definition.validateContext === undefined
            ? {}
            : { validateContext: definition.validateContext }),
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

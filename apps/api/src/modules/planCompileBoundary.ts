/**
 * Owned concern: define the compile-time planner boundary exposed by `apps/api`.
 * The static catalog is owned separately; this module turns it into the
 * canonical planner recipe for the HTTP boundary.
 */
import { StepTypeRegistry } from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import type { PlannerFacadeOptions } from '@dvt/planner';

import {
  PLAN_COMPILE_BOUNDARY,
  resolvePlanCompileCatalog,
  type PlanCompileBoundaryDefinition,
  type PlanCompileProfileSpec,
  type ResolvedStepCatalog,
} from './planCompileCatalog.js';

export { PLAN_COMPILE_BOUNDARY, PLAN_COMPILE_PROFILE_SPEC } from './planCompileCatalog.js';

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

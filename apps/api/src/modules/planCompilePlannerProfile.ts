import {
  StepTypeRegistry,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import type { PlannerFacadeOptions } from '@dvt/planner';

import { resolvePlanCompileCatalog, type ResolvedStepCatalog } from './planCompileCatalog.js';
import {
  PLAN_COMPILE_PROFILE_SPEC,
  type PlanCompileProfileSpec,
} from './planCompileProfileSpec.js';

function resolvePlanCompileStepRegistry(
  spec: PlanCompileProfileSpec,
  catalog: ResolvedStepCatalog
) {
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

export function buildPlanCompilePlanner(
  spec: PlanCompileProfileSpec = PLAN_COMPILE_PROFILE_SPEC,
  catalog: ResolvedStepCatalog = resolvePlanCompileCatalog()
): PlannerFacade {
  const plannerOptions: PlannerFacadeOptions = {
    stepTypeRegistry: resolvePlanCompileStepRegistry(spec, catalog),
  };

  return new PlannerFacade(plannerOptions);
}

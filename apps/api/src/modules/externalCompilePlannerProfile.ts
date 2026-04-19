import {
  StepTypeRegistry,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import type { PlannerFacadeOptions } from '@dvt/planner';

import {
  EXTERNAL_COMPILE_PROFILE_SPEC,
  type ExternalCompileProfileSpec,
} from './externalCompileProfileSpec.js';
import { resolveExternalCompileCatalog, type ResolvedStepCatalog } from './externalCompileCatalog.js';

function resolveExternalCompileStepRegistry(
  spec: ExternalCompileProfileSpec,
  catalog: ResolvedStepCatalog
) {
  for (const family of spec.allowedFamilies) {
    if (!catalog.families.has(family)) {
      throw new Error(`Unknown external compile family in profile ${spec.profileId}: ${family}`);
    }
  }

  const entries = new Map(
    spec.allowedStepKinds.map((stepKind) => {
      const definition = catalog.stepKinds.get(stepKind);
      if (definition === undefined) {
        throw new Error(
          `Unknown external compile step kind in profile ${spec.profileId}: ${stepKind}`
        );
      }
      if (!spec.allowedFamilies.includes(definition.family)) {
        throw new Error(
          `External compile step kind ${stepKind} is not exposed by allowed families in profile ${spec.profileId}`
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

export function buildExternalCompilePlanner(
  spec: ExternalCompileProfileSpec = EXTERNAL_COMPILE_PROFILE_SPEC,
  catalog: ResolvedStepCatalog = resolveExternalCompileCatalog()
): PlannerFacade {
  const plannerOptions: PlannerFacadeOptions = {
    stepTypeRegistry: resolveExternalCompileStepRegistry(spec, catalog),
  };

  return new PlannerFacade(plannerOptions);
}

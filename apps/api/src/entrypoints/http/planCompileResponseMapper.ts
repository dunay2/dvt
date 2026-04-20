import type { PlanCompileResponseV1SchemaT } from '@dvt/contracts';

import type { CompilePlanResult } from '../../application/services/CompilePlanUseCase.js';

export function buildPlanCompileResponse(result: CompilePlanResult): PlanCompileResponseV1SchemaT {
  return {
    plan: result.plan,
    compile: {
      persisted: false,
      executabilityValidated: false,
    },
  };
}

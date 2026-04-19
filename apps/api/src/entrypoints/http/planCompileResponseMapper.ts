import type { PlanCompileResponseV1SchemaT } from '@dvt/contracts';

import type { CompileExternalPlanResult } from '../../application/services/CompileExternalPlanUseCase.js';

export function buildPlanCompileResponse(result: CompileExternalPlanResult): PlanCompileResponseV1SchemaT {
  return {
    plan: result.plan,
    compile: {
      persisted: false,
      executabilityValidated: false,
    },
  };
}

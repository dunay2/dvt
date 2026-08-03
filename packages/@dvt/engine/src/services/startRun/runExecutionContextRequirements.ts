/**
 * @ownedConcern Select execution-context requirements activated by one plan.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Derive active requirements from the injected binding policy before dispatch.
 * @consequence Engine admission can reuse one plugin-agnostic requirement selection rule.
 * @version 1.0.0
 */
import type { ExecutionPlan } from '@dvt/contracts';

import type {
  IRunExecutionContextBindingPolicy,
  RunExecutionContextPluginRequirement,
} from '../../ports/IRunExecutionContextBindingPolicy.js';

export function selectRunExecutionContextPluginRequirements(
  plan: ExecutionPlan,
  bindingPolicy: IRunExecutionContextBindingPolicy | undefined
): readonly RunExecutionContextPluginRequirement[] {
  const stepKinds = new Set(plan.steps.map((step) => step.kind));
  const selected = new Map<string, RunExecutionContextPluginRequirement>();

  for (const requirement of bindingPolicy?.pluginRequirements ?? []) {
    if (requirement.stepKinds.some((kind) => stepKinds.has(kind))) {
      selected.set(
        `${requirement.pluginId}:${requirement.contextKey ?? requirement.pluginId}`,
        requirement
      );
    }
  }

  return [...selected.values()];
}

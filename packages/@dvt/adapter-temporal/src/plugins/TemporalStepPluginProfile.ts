/**
 * @file packages/@dvt/adapter-temporal/src/plugins/TemporalStepPluginProfile.ts
 * @ownedConcern Compose Temporal step plugin profiles without encoding plugin-specific kinds in core dispatch
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Represent executor plugins as explicit step-activity profile inputs
 * @consequence The Temporal core dispatcher stays generic while worker composition proves plugin extensibility
 * @version 1.0.0
 */
import type { StepActivity, StepActivityRegistry } from '../activities/activityTypes.js';

export interface TemporalStepPluginProfile {
  readonly pluginId: string;
  readonly stepActivitiesByKind: ReadonlyMap<string, StepActivity>;
}

export function composeTemporalStepPluginRegistries(
  profiles: readonly TemporalStepPluginProfile[]
): StepActivityRegistry {
  const registry = new Map<string, StepActivity>();

  for (const profile of profiles) {
    appendPluginProfile(registry, profile);
  }

  return registry;
}

function appendPluginProfile(
  registry: Map<string, StepActivity>,
  profile: TemporalStepPluginProfile
): void {
  for (const [stepKind, activity] of profile.stepActivitiesByKind.entries()) {
    const existing = registry.get(stepKind);
    if (existing !== undefined) {
      throw new Error(`TEMPORAL_STEP_PLUGIN_KIND_CONFLICT:${profile.pluginId}:${stepKind}`);
    }

    registry.set(stepKind, activity);
  }
}

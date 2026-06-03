/**
 * @ownedConcern Define plugin-owned run-execution-context admission requirements for the engine boundary.
 */
import type { ResolvedRunContext, RunExecutionContext } from '@dvt/contracts';

export interface RunExecutionContextPluginRequirement {
  /**
   * Stable plugin identifier, also used as `pluginContexts` key unless
   * `contextKey` is specified.
   */
  pluginId: string;
  /**
   * Execution step kinds owned by this plugin requirement.
   */
  stepKinds: readonly string[];
  /**
   * Optional key in `runExecutionContext.pluginContexts`.
   */
  contextKey?: string;
  assertPluginContextAllowed(input: {
    pluginContext: unknown;
    runExecutionContext: RunExecutionContext;
    context: ResolvedRunContext;
  }): Promise<void> | void;
}

/**
 * Optional admission-time binding policy for execution-context-owned artifacts.
 *
 * This lets product ingress register plugin-owned context requirements without
 * teaching the engine about executor-specific artifacts.
 */
export interface IRunExecutionContextBindingPolicy {
  readonly pluginRequirements: readonly RunExecutionContextPluginRequirement[];
}

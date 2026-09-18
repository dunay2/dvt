/**
 * Owned concern: admit one DVT PostgreSQL workload into the Temporal plugin runner.
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Validate workload v2 and its server-owned run context before invoking provider effects.
 * @consequence Preview v1 and mismatched contexts fail permanently at the activity boundary.
 * @version 1.0.0
 */
import {
  createPermanentStepFailure,
  type StepActivity,
  type StepDefinition,
  type StepExecutionContext,
  type StepResult,
  type TemporalStepPluginProfile,
} from '@dvt/adapter-temporal';
import {
  DVT_POSTGRES_PLUGIN_CONTEXT_KEY,
  DvtOperationalWorkloadV2Schema,
  KNOWN_STEP_KINDS,
  parseDvtPostgresPluginContext,
  type RunExecutionContext,
} from '@dvt/contracts';

import { DvtPostgresExecutionRejectedError } from './dvtPostgresPluginErrors.js';
import type { DvtPostgresStepActivityDeps } from './dvtPostgresPluginTypes.js';

export const DVT_POSTGRES_PLUGIN_ID = 'dvt-postgres' as const;

export class DvtPostgresStepActivity implements StepActivity {
  public constructor(private readonly deps: DvtPostgresStepActivityDeps) {}

  public async execute(step: StepDefinition, context: StepExecutionContext): Promise<StepResult> {
    const config = DvtOperationalWorkloadV2Schema.safeParse(step.stepTypeConfig);
    if (!config.success) reject(`DVT_WORKLOAD_V2_REQUIRED:${step.stepId}`);
    const ref = context.runContext.runExecutionContextRef;
    if (ref === undefined) reject(`RUN_EXECUTION_CONTEXT_REQUIRED:${step.stepId}`);

    const runExecutionContext = await this.deps.runExecutionContextReader.resolve(ref);
    const rawPluginContext = runExecutionContext.pluginContexts[DVT_POSTGRES_PLUGIN_CONTEXT_KEY];
    if (rawPluginContext === undefined) reject(`DVT_PLUGIN_CONTEXT_REQUIRED:${step.stepId}`);

    let pluginContext;
    try {
      pluginContext = parseDvtPostgresPluginContext(rawPluginContext);
    } catch {
      reject(`DVT_PLUGIN_CONTEXT_INVALID:${step.stepId}`);
    }
    assertContextAlignment(config.data, context, runExecutionContext, pluginContext.connectionRef);

    try {
      const result = await this.deps.runner.execute({
        step,
        config: config.data,
        executionIdentity: context.executionIdentity,
        runContext: context.runContext,
        runExecutionContext,
        pluginContext,
      });
      if (result.stepId !== step.stepId) reject(`DVT_PLUGIN_RESULT_INVALID:${step.stepId}`);
      return result;
    } catch (error) {
      if (error instanceof DvtPostgresExecutionRejectedError) {
        reject(`${error.code}:${step.stepId}`);
      }
      throw error;
    }
  }
}

export function createDvtPostgresPluginProfile(
  deps: DvtPostgresStepActivityDeps
): TemporalStepPluginProfile {
  return {
    pluginId: DVT_POSTGRES_PLUGIN_ID,
    stepActivitiesByKind: new Map([
      [KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD, new DvtPostgresStepActivity(deps)],
    ]),
  };
}

function assertContextAlignment(
  config: ReturnType<typeof DvtOperationalWorkloadV2Schema.parse>,
  activityContext: StepExecutionContext,
  runExecutionContext: RunExecutionContext,
  connectionRef: { readonly connectionId: string; readonly provider: string }
): void {
  const scope = config.scope;
  const run = activityContext.runContext;
  if (
    scope.tenantId !== run.tenantId ||
    scope.projectId !== run.projectId ||
    scope.environmentId !== run.environmentId ||
    runExecutionContext.tenantId !== run.tenantId ||
    runExecutionContext.projectId !== run.projectId ||
    runExecutionContext.environmentId !== run.environmentId ||
    activityContext.executionIdentity.tenantId !== run.tenantId ||
    activityContext.executionIdentity.environmentId !== run.environmentId
  ) {
    reject('DVT_EXECUTION_SCOPE_MISMATCH');
  }
  if (
    connectionRef.connectionId !== config.connectionRef.connectionId ||
    connectionRef.provider !== config.connectionRef.provider
  ) {
    reject('DVT_CONNECTION_CONTEXT_MISMATCH');
  }
}

function reject(message: string): never {
  throw createPermanentStepFailure(message);
}

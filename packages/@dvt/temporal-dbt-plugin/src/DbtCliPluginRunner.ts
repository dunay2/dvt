/**
 * @file packages/@dvt/temporal-dbt-plugin/src/DbtCliPluginRunner.ts
 * @ownedConcern Orchestrate DBT CLI plugin execution through focused DBT helpers
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0040: Retry Ownership And Attempt Authority
 * @decision Keep DBT CLI invocation behind a plugin runner instead of core activity dispatch
 * @consequence Worker composition can enable DBT without making DBT a Temporal core default
 * @version 1.0.0
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { StepResult } from '@dvt/adapter-temporal';
import type { IDbtProjectBundleReader } from '@dvt/artifacts';
import { resolveDbtStepSelector } from '@dvt/contracts';

import { buildDbtCliArgs } from './dbtCliArguments.js';
import {
  buildFailedStepResult,
  classifyDbtCliFailure,
  toDbtCliFailureMessage,
  toErrorMessage,
} from './dbtCliFailures.js';
import { runDbtCommand } from './dbtCliProcess.js';
import { createDbtProjectMaterializer } from './dbtCliProjectMaterializer.js';
import type {
  DbtCliCommandRunner,
  DbtCommandEnvironmentResolver,
  DbtProjectMaterializer,
  DbtRuntimeProfileMaterializer,
  MaterializedDbtProject,
  MaterializedDbtRuntimeProfile,
} from './dbtCliTypes.js';
import type { DbtPluginExecutionInput, DbtPluginRunner } from './dbtPluginTypes.js';

export { assertDbtCliAvailable } from './dbtCliProcess.js';

export interface DbtCliPluginRunnerOptions {
  bundleReader: IDbtProjectBundleReader;
  dbtBin?: string;
  workdirRoot?: string;
  materializeProject?: DbtProjectMaterializer;
  materializeRuntimeProfile: DbtRuntimeProfileMaterializer;
  runCommand?: DbtCliCommandRunner;
  getCancellationSignal?: () => globalThis.AbortSignal | undefined;
  resolveCommandEnvironment?: DbtCommandEnvironmentResolver;
}

type DbtCommandOutcome =
  | { readonly kind: 'result'; readonly value: StepResult }
  | { readonly kind: 'cancellation'; readonly error: unknown };

export class DbtCliPluginRunner implements DbtPluginRunner {
  private readonly dbtBin: string;
  private readonly materializeProject: DbtProjectMaterializer;
  private readonly materializeRuntimeProfile: DbtRuntimeProfileMaterializer;
  private readonly runCommand: DbtCliCommandRunner;
  private readonly getCancellationSignal: () => globalThis.AbortSignal | undefined;
  private readonly resolveCommandEnvironment: DbtCommandEnvironmentResolver;

  public constructor(options: DbtCliPluginRunnerOptions) {
    const workdirRoot = options.workdirRoot ?? join(tmpdir(), 'dvt', 'temporal-worker');

    this.dbtBin = options.dbtBin ?? 'dbt';
    this.materializeProject =
      options.materializeProject ??
      createDbtProjectMaterializer({
        bundleReader: options.bundleReader,
        workdirRoot,
      });
    this.runCommand = options.runCommand ?? runDbtCommand;
    this.materializeRuntimeProfile = options.materializeRuntimeProfile;
    this.getCancellationSignal = options.getCancellationSignal ?? (() => undefined);
    this.resolveCommandEnvironment = options.resolveCommandEnvironment ?? (() => ({}));
  }

  public async execute(input: DbtPluginExecutionInput): Promise<StepResult> {
    const cancellationSignal = this.getCancellationSignal();
    const initialCancellation = asAbortedSignal(cancellationSignal);
    if (initialCancellation !== undefined) {
      return this.completeCancellation(input.step.stepId, initialCancellation, []);
    }

    const project = await this.materialize(input);
    if ('failure' in project) {
      return project.failure;
    }
    const projectCancellation = asAbortedSignal(cancellationSignal);
    if (projectCancellation !== undefined) {
      return this.completeCancellation(input.step.stepId, projectCancellation, [project.resource]);
    }

    const profile = await this.materializeProfile(input);
    if ('failure' in profile) {
      return this.completeWithCleanup(input.step.stepId, profile.failure, [project.resource]);
    }

    return this.runWithResources(input, project.resource, profile.resource, cancellationSignal);
  }

  private async materialize(
    input: DbtPluginExecutionInput
  ): Promise<{ resource: Awaited<ReturnType<DbtProjectMaterializer>> } | { failure: StepResult }> {
    try {
      return {
        resource: await this.materializeProject(input),
      };
    } catch (error) {
      return {
        failure: buildFailedStepResult(
          input.step.stepId,
          'DBT_PROJECT_BUNDLE_READ_FAILED',
          toErrorMessage(error)
        ),
      };
    }
  }

  private async materializeProfile(
    input: DbtPluginExecutionInput
  ): Promise<
    { resource: Awaited<ReturnType<DbtRuntimeProfileMaterializer>> } | { failure: StepResult }
  > {
    try {
      return { resource: await this.materializeRuntimeProfile(input) };
    } catch {
      return {
        failure: buildFailedStepResult(
          input.step.stepId,
          'DBT_RUNTIME_CREDENTIAL_UNAVAILABLE',
          'DBT runtime credentials could not be resolved.'
        ),
      };
    }
  }

  private async runWithResources(
    input: DbtPluginExecutionInput,
    project: MaterializedDbtProject,
    profile: MaterializedDbtRuntimeProfile,
    cancellationSignal: globalThis.AbortSignal | undefined
  ): Promise<StepResult> {
    let outcome: DbtCommandOutcome;
    try {
      const args = buildDbtCliArgs(
        input.step.kind,
        resolveDbtCommandSelector(input.step.stepId, input.step.stepTypeConfig),
        input.pluginContext.targetProfile,
        profile.profilesDir
      );
      const commandEnvironment = this.resolveCommandEnvironment(input);
      await this.runCommand(this.dbtBin, args, {
        cwd: project.projectDir,
        ...(Object.keys(commandEnvironment).length === 0 ? {} : { env: commandEnvironment }),
        ...(cancellationSignal === undefined ? {} : { signal: cancellationSignal }),
      });
      if (cancellationSignal?.aborted === true) {
        throw cancellationSignal.reason;
      }
      outcome = {
        kind: 'result',
        value: {
          stepId: input.step.stepId,
          status: 'COMPLETED',
        },
      };
    } catch (error) {
      if (cancellationSignal?.aborted === true) {
        outcome = { kind: 'cancellation', error };
      } else {
        const failureReason = classifyDbtCliFailure(error);
        outcome = {
          kind: 'result',
          value: buildFailedStepResult(
            input.step.stepId,
            failureReason,
            toDbtCliFailureMessage(failureReason)
          ),
        };
      }
    }

    const cleanupFailure = await this.cleanupResources(input.step.stepId, [profile, project]);
    if (cleanupFailure !== undefined) {
      return cleanupFailure;
    }
    if (outcome.kind === 'cancellation') {
      throw outcome.error;
    }
    return outcome.value;
  }

  private async completeCancellation(
    stepId: string,
    signal: globalThis.AbortSignal,
    resources: readonly { cleanup(): Promise<void> }[]
  ): Promise<StepResult> {
    const cleanupFailure = await this.cleanupResources(stepId, resources);
    if (cleanupFailure !== undefined) {
      return cleanupFailure;
    }
    throw signal.reason ?? new Error('DBT activity was cancelled.');
  }

  private async completeWithCleanup(
    stepId: string,
    result: StepResult,
    resources: readonly { cleanup(): Promise<void> }[]
  ): Promise<StepResult> {
    return (await this.cleanupResources(stepId, resources)) ?? result;
  }

  private async cleanupResources(
    stepId: string,
    resources: readonly { cleanup(): Promise<void> }[]
  ): Promise<StepResult | undefined> {
    const outcomes = await Promise.allSettled(resources.map((resource) => resource.cleanup()));
    return outcomes.some((outcome) => outcome.status === 'rejected')
      ? buildFailedStepResult(
          stepId,
          'DBT_RUNTIME_RESOURCE_CLEANUP_FAILED',
          'DBT runtime resources could not be cleaned safely.'
        )
      : undefined;
  }
}

function resolveDbtCommandSelector(stepId: string, stepTypeConfig: unknown): string {
  const resolution = resolveDbtStepSelector(stepTypeConfig);
  if (resolution.status === 'invalid') {
    throw new Error('DBT_STEP_SELECTOR_INVALID');
  }
  return resolution.status === 'valid' ? resolution.target.selector : stepId;
}

function asAbortedSignal(
  signal: globalThis.AbortSignal | undefined
): globalThis.AbortSignal | undefined {
  return signal?.aborted === true ? signal : undefined;
}

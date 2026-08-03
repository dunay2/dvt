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
}

export class DbtCliPluginRunner implements DbtPluginRunner {
  private readonly dbtBin: string;
  private readonly materializeProject: DbtProjectMaterializer;
  private readonly materializeRuntimeProfile: DbtRuntimeProfileMaterializer;
  private readonly runCommand: DbtCliCommandRunner;

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
  }

  public async execute(input: DbtPluginExecutionInput): Promise<StepResult> {
    const project = await this.materialize(input);
    if ('failure' in project) {
      return project.failure;
    }

    const profile = await this.materializeProfile(input);
    if ('failure' in profile) {
      return this.completeWithCleanup(input.step.stepId, profile.failure, [project.resource]);
    }

    return this.runWithResources(input, project.resource, profile.resource);
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
    profile: MaterializedDbtRuntimeProfile
  ): Promise<StepResult> {
    let result: StepResult;
    try {
      const args = buildDbtCliArgs(
        input.step.kind,
        input.step.stepId,
        input.pluginContext.targetProfile,
        profile.profilesDir
      );
      await this.runCommand(this.dbtBin, args, { cwd: project.projectDir });
      result = {
        stepId: input.step.stepId,
        status: 'COMPLETED',
      };
    } catch (error) {
      const failureReason = classifyDbtCliFailure(error);
      result = buildFailedStepResult(
        input.step.stepId,
        failureReason,
        toDbtCliFailureMessage(failureReason)
      );
    }

    return this.completeWithCleanup(input.step.stepId, result, [profile, project]);
  }

  private async completeWithCleanup(
    stepId: string,
    result: StepResult,
    resources: readonly { cleanup(): Promise<void> }[]
  ): Promise<StepResult> {
    const outcomes = await Promise.allSettled(resources.map((resource) => resource.cleanup()));
    if (outcomes.some((outcome) => outcome.status === 'rejected')) {
      return buildFailedStepResult(
        stepId,
        'DBT_RUNTIME_RESOURCE_CLEANUP_FAILED',
        'DBT runtime resources could not be cleaned safely.'
      );
    }
    return result;
  }
}

/**
 * @file packages/@dvt/adapter-temporal/src/plugins/dbt/DbtCliPluginRunner.ts
 * @ownedConcern Orchestrate DBT CLI plugin execution through focused DBT helpers
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0040: Retry Ownership And Attempt Authority
 * @decision Keep DBT CLI invocation behind a plugin runner instead of core activity dispatch
 * @consequence Worker composition can enable DBT without making DBT a Temporal core default
 * @version 1.0.0
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { IDbtProjectBundleReader } from '@dvt/artifacts';

import type { StepResult } from '../../activities/activityTypes.js';

import { buildDbtCliArgs } from './dbtCliArguments.js';
import {
  buildFailedStepResult,
  classifyDbtCliFailure,
  toDbtCliFailureMessage,
  toErrorMessage,
} from './dbtCliFailures.js';
import { runDbtCommand } from './dbtCliProcess.js';
import {
  cleanupMaterializedDbtProject,
  createDbtProjectMaterializer,
} from './dbtCliProjectMaterializer.js';
import type { DbtCliCommandRunner, DbtProjectMaterializer } from './dbtCliTypes.js';
import type { DbtPluginExecutionInput, DbtPluginRunner } from './dbtPluginTypes.js';

export { assertDbtCliAvailable } from './dbtCliProcess.js';

export interface DbtCliPluginRunnerOptions {
  bundleReader: IDbtProjectBundleReader;
  dbtBin?: string;
  workdirRoot?: string;
  materializeProject?: DbtProjectMaterializer;
  runCommand?: DbtCliCommandRunner;
}

export class DbtCliPluginRunner implements DbtPluginRunner {
  private readonly dbtBin: string;
  private readonly materializeProject: DbtProjectMaterializer;
  private readonly runCommand: DbtCliCommandRunner;

  public constructor(options: DbtCliPluginRunnerOptions) {
    const workdirRoot = options.workdirRoot ?? join(tmpdir(), 'dvt', 'temporal-worker');

    this.dbtBin = options.dbtBin ?? 'dbt';
    this.materializeProject =
      options.materializeProject ?? createDbtProjectMaterializer(options.bundleReader, workdirRoot);
    this.runCommand = options.runCommand ?? runDbtCommand;
  }

  public async execute(input: DbtPluginExecutionInput): Promise<StepResult> {
    const project = await this.materialize(input);
    if ('failure' in project) {
      return project.failure;
    }

    return this.runWithProject(input, project.resource);
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

  private async runWithProject(
    input: DbtPluginExecutionInput,
    project: Awaited<ReturnType<DbtProjectMaterializer>>
  ): Promise<StepResult> {
    try {
      const args = buildDbtCliArgs(
        input.step.kind,
        input.step.stepId,
        input.pluginContext.targetProfile
      );
      await this.runCommand(this.dbtBin, args, { cwd: project.projectDir });
      return {
        stepId: input.step.stepId,
        status: 'COMPLETED',
      };
    } catch (error) {
      return buildFailedStepResult(
        input.step.stepId,
        classifyDbtCliFailure(error),
        toDbtCliFailureMessage(error)
      );
    } finally {
      await cleanupMaterializedDbtProject(project);
    }
  }
}

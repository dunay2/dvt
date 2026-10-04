/**
 * Owned concern: orchestrate one server-owned run-context binding for an
 * already persisted executable plan.
 */
import {
  DBT_STEP_REQUIRED_CAPABILITY,
  START_RUN_RESULT_KIND,
  collectRequiredCapabilitiesForSteps,
  RUN_REJECTIONS,
  type DvtOperationalRejection,
  type RunExecutionRejection,
  type ExecutionPlan,
  type IStepTypeRegistry,
  type StartRunCommand,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type {
  IDbtExecutionConnectionBindingVerifier,
  IDbtExecutionTargetResolver,
} from '../ports/dbtExecutionTarget.js';
import type {
  DbtProjectBundleBuildResult,
  IDbtProjectBundleBuilder,
} from '../ports/dbtProjectBundle.js';
import type { IRunExecutionContextWriter } from '../ports/runExecutionContextWriter.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';
import type { IWarehouseConnectionCatalog } from '../ports/warehouseSourceImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import { resolveDbtExecutionConnectionBinding } from './dbtExecutionConnectionBinding.js';
import { resolveDbtPlanExecutionBinding } from './dbtPlanExecutionBinding.js';
import { resolveDvtPostgresExecutionContextBinding } from './dvtPostgresExecutionContextBinding.js';
import type { DvtPostgresPublicationPredecessorReader } from './dvtPostgresExecutionContextBinding.js';
import { buildRunExecutionContext } from './runExecutionContextFactory.js';
import type { StoredPlanAdmissionResult } from './StoredPlanAdmissionCoordinator.js';

export class RunExecutionContextBindingUseCase implements IStartRunUseCase {
  public constructor(
    private readonly deps: {
      readonly delegate: IStartRunUseCase;
      readonly bundleBuilder: IDbtProjectBundleBuilder;
      readonly contextWriter: IRunExecutionContextWriter;
      readonly executionTargetResolver: IDbtExecutionTargetResolver;
      readonly executionConnectionBindingVerifier: IDbtExecutionConnectionBindingVerifier;
      readonly stepTypeRegistry: IStepTypeRegistry;
      readonly warehouseConnectionCatalog: IWarehouseConnectionCatalog;
      readonly dvtPostgresPublicationPredecessorReader?: DvtPostgresPublicationPredecessorReader;
    }
  ) {}

  public async execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    return this.deps.delegate.execute(command, context);
  }

  public async executeAdmitted(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext,
    admission: Extract<StoredPlanAdmissionResult, { readonly accepted: true }>
  ): Promise<StartRunUseCaseResult> {
    const commandWithPlanRef = { ...command, planRef: admission.planRef };
    const { materialized, scopedPlanRef } = admission;
    const { plan } = materialized;
    const bindsDbt = isDbtPlan(plan, this.deps.stepTypeRegistry);
    const dvtBinding = await resolveDvtPostgresExecutionContextBinding({
      plan,
      planRef: scopedPlanRef.planRef,
      runId: command.runId,
      scope: {
        tenantId: scopedPlanRef.tenantId,
        projectId: scopedPlanRef.projectId,
        environmentId: scopedPlanRef.environmentId,
      },
      catalog: this.deps.warehouseConnectionCatalog,
      ...(this.deps.dvtPostgresPublicationPredecessorReader === undefined
        ? {}
        : { predecessorReader: this.deps.dvtPostgresPublicationPredecessorReader }),
    });
    if (dvtBinding.kind === 'rejected') {
      return rejectRunExecutionContext(dvtBinding);
    }
    if (!bindsDbt && dvtBinding.kind === 'not-required') {
      return this.deps.delegate.execute(command, context);
    }
    if (command.runExecutionContextRef !== undefined) {
      return rejectRunExecutionContext(RUN_REJECTIONS.callerContextProvided);
    }

    const scope: WorkspaceStorageScope = {
      tenantId: scopedPlanRef.tenantId,
      projectId: scopedPlanRef.projectId,
      environmentId: scopedPlanRef.environmentId,
    };
    const pluginContexts: Record<string, Record<string, unknown>> = {};

    if (dvtBinding.kind === 'bound') {
      pluginContexts[dvtBinding.key] = { ...dvtBinding.context };
    }

    if (bindsDbt) {
      const sourceBinding = resolveDbtPlanExecutionBinding({
        plan,
        targetAdapter: commandWithPlanRef.targetAdapter,
        executionTarget: this.deps.executionTargetResolver.resolve(),
      });
      if (!sourceBinding.ok) return rejectRunExecutionContext(sourceBinding);
      const executionConnection = await resolveDbtExecutionConnectionBinding({
        catalog: this.deps.warehouseConnectionCatalog,
        verifier: this.deps.executionConnectionBindingVerifier,
        scope,
        connectionRef: sourceBinding.connectionRef,
        targetProfile: sourceBinding.targetProfile,
        runtimeCredentialRef: sourceBinding.credentialRef,
      });
      if (!executionConnection.ok) {
        return rejectRunExecutionContext(executionConnection);
      }

      const bundle = await this.deps.bundleBuilder.build({
        scope,
        projectRoot: sourceBinding.projectRoot,
        ...(sourceBinding.expectedContentSetSha256 === undefined
          ? {}
          : { expectedContentSetSha256: sourceBinding.expectedContentSetSha256 }),
      });
      if (!bundle.ok) return rejectRunExecutionContext(BUNDLE_REJECTIONS[bundle.reason]);

      pluginContexts['dbt'] = {
        projectBundleRef: bundle.projectBundleRef,
        targetProfile: sourceBinding.targetProfile,
        credentialRef: sourceBinding.credentialRef,
      };
    }

    const runExecutionContext = buildRunExecutionContext({
      command: commandWithPlanRef,
      context,
      scope,
      pluginContexts,
      ...(materialized.executionPolicy.pluginCompatibilityFingerprint === undefined
        ? {}
        : {
            pluginCompatibilityFingerprint:
              materialized.executionPolicy.pluginCompatibilityFingerprint,
          }),
    });
    const writtenContext = await this.deps.contextWriter.write({
      runId: command.runId,
      context: runExecutionContext,
    });
    if (!writtenContext.ok) {
      return rejectRunExecutionContext(RUN_REJECTIONS.contextStoreUnavailable);
    }

    return this.deps.delegate.execute(
      { ...commandWithPlanRef, runExecutionContextRef: writtenContext.ref },
      context
    );
  }
}

function isDbtPlan(plan: ExecutionPlan, stepTypeRegistry: IStepTypeRegistry): boolean {
  return collectRequiredCapabilitiesForSteps(stepTypeRegistry, plan.steps).includes(
    DBT_STEP_REQUIRED_CAPABILITY
  );
}

const BUNDLE_REJECTIONS = {
  artifact_store_unavailable: RUN_REJECTIONS.bundleStoreUnavailable,
  artifact_store_unsupported: RUN_REJECTIONS.bundleStoreUnsupported,
  project_unavailable: RUN_REJECTIONS.projectUnavailable,
  project_unreadable: RUN_REJECTIONS.projectUnreadable,
  revision_mismatch: RUN_REJECTIONS.projectRevisionMismatch,
} satisfies Record<
  Extract<DbtProjectBundleBuildResult, { ok: false }>['reason'],
  RunExecutionRejection
>;

function rejectRunExecutionContext({
  code,
  cause,
  reason,
}: DvtOperationalRejection | RunExecutionRejection): StartRunUseCaseResult {
  return {
    ok: true,
    value: {
      kind: START_RUN_RESULT_KIND.planRejected,
      accepted: false,
      code,
      cause,
      reason,
    },
  };
}

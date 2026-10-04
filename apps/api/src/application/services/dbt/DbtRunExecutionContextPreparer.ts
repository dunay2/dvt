/**
 * Owned concern: prepare the revision-bound DBT bundle and execution target.
 * @baseline ADR-0018: Behavioral preparation remains application-owned.
 * @decision Resolve DBT capability, source, connection and bundle in this provider module.
 * @consequence The Run coordinator does not depend on DBT contracts or services.
 * @version 1.0.0
 */
import {
  DBT_STEP_REQUIRED_CAPABILITY,
  RUN_REJECTIONS,
  collectRequiredCapabilitiesForSteps,
  type ExecutionPlan,
  type IStepTypeRegistry,
  type RunExecutionRejection,
} from '@dvt/contracts';

import type {
  IDbtExecutionConnectionBindingVerifier,
  IDbtExecutionTargetResolver,
} from '../../ports/dbtExecutionTarget.js';
import type {
  DbtProjectBundleBuildResult,
  IDbtProjectBundleBuilder,
} from '../../ports/dbtProjectBundle.js';
import type {
  IRunExecutionContextPreparer,
  PreparedRunPluginContext,
  RunExecutionContextPreparation,
} from '../../ports/runExecutionContextPreparer.js';
import type { IWarehouseConnectionCatalog } from '../../ports/warehouseSourceImport.js';
import { resolveDbtExecutionConnectionBinding } from '../dbtExecutionConnectionBinding.js';
import { resolveDbtPlanExecutionBinding } from '../dbtPlanExecutionBinding.js';

export class DbtRunExecutionContextPreparer implements IRunExecutionContextPreparer {
  public readonly contextKey = 'dbt';

  public constructor(
    private readonly deps: {
      readonly bundleBuilder: IDbtProjectBundleBuilder;
      readonly executionTargetResolver: IDbtExecutionTargetResolver;
      readonly executionConnectionBindingVerifier: IDbtExecutionConnectionBindingVerifier;
      readonly stepTypeRegistry: IStepTypeRegistry;
      readonly warehouseConnectionCatalog: IWarehouseConnectionCatalog;
    }
  ) {}

  public isRequired(plan: ExecutionPlan): boolean {
    return collectRequiredCapabilitiesForSteps(this.deps.stepTypeRegistry, plan.steps).includes(
      DBT_STEP_REQUIRED_CAPABILITY
    );
  }

  public async prepare(input: RunExecutionContextPreparation): Promise<PreparedRunPluginContext> {
    const source = resolveDbtPlanExecutionBinding({
      plan: input.plan,
      targetAdapter: input.targetAdapter,
      executionTarget: this.deps.executionTargetResolver.resolve(),
    });
    if (!source.ok) return source;
    const connection = await resolveDbtExecutionConnectionBinding({
      catalog: this.deps.warehouseConnectionCatalog,
      verifier: this.deps.executionConnectionBindingVerifier,
      scope: input.scope,
      connectionRef: source.connectionRef,
      targetProfile: source.targetProfile,
      runtimeCredentialRef: source.credentialRef,
    });
    if (!connection.ok) return connection;
    const bundle = await this.deps.bundleBuilder.build({
      scope: input.scope,
      projectRoot: source.projectRoot,
      ...(source.expectedContentSetSha256 === undefined
        ? {}
        : { expectedContentSetSha256: source.expectedContentSetSha256 }),
    });
    if (!bundle.ok) return { ok: false, ...BUNDLE_REJECTIONS[bundle.reason] };
    return {
      ok: true,
      context: {
        projectBundleRef: bundle.projectBundleRef,
        targetProfile: source.targetProfile,
        credentialRef: source.credentialRef,
      },
    };
  }
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

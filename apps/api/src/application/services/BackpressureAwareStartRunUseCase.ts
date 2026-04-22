/**
 * Owned concern: orchestrate duplicate detection, delivery admission,
 * execution-capacity admission, and delegate dispatch for start-run commands.
 */
import {
  ADMISSION_TELEMETRY_DECISION,
  type AdmissionDecisionRecord,
  type AdmissionTelemetry,
} from '../ports/AdmissionTelemetry.js';
import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import { DUPLICATE_RUN_PROBE_KIND, type DuplicateRunProbe } from '../ports/DuplicateRunProbe.js';
import type { IAdmissionGuard } from '../ports/IAdmissionGuard.js';
import { ADMISSION_MODE, type AdmissionMode } from '../ports/IAdmissionMode.js';
import type { IStartRunExecutionCapacityPort } from '../ports/IStartRunExecutionCapacityPort.js';
import type { StartRunCommand } from '../ports/startRunCommandContract.js';
import {
  START_RUN_DUPLICATE_OF,
  START_RUN_RESULT_KIND,
  type StartRunResult,
} from '../ports/startRunResultContract.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCaseContract.js';

import {
  buildAdmissionRejectionRecord,
  recordAdmissionTelemetry,
  recordDelegateDecisionIfNeeded,
  toExecutionCapacityRejectResult,
  toGuardAdmissionRejectResult,
  type AdmissionRejectResult,
} from './startRunAdmissionDecisions.js';

type DuplicateResult = Extract<
  StartRunResult,
  { readonly kind: typeof START_RUN_RESULT_KIND.duplicate }
>;

type DuplicateProbeResult = {
  kind: typeof DUPLICATE_RUN_PROBE_KIND.foundRun | typeof DUPLICATE_RUN_PROBE_KIND.foundIntent;
  runId: string;
};

export class BackpressureAwareStartRunUseCase implements IStartRunUseCase {
  public constructor(
    private readonly deps: {
      readonly duplicateProbe: DuplicateRunProbe;
      readonly admissionGuard: IAdmissionGuard;
      readonly executionCapacity: IStartRunExecutionCapacityPort;
      readonly telemetry: AdmissionTelemetry;
      readonly mode: AdmissionMode;
      readonly retryAfterSeconds: number;
      readonly delegate: IStartRunUseCase;
    }
  ) {}

  public async execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    const tenantId = context.scope.tenantId.value;
    const duplicate = await this.deps.duplicateProbe.findExisting(tenantId, command.runId);
    if (duplicate.kind !== DUPLICATE_RUN_PROBE_KIND.notFound) {
      return {
        ok: true,
        value: await this.handleDuplicate(duplicate, context.requestId, tenantId),
      };
    }

    const admissionContext = {
      requestId: context.requestId,
      tenantId,
      runId: command.runId,
    };
    const reject = await this.evaluateAdmission(command, admissionContext);
    if (reject !== null) {
      return { ok: true, value: reject };
    }

    const result = await this.deps.delegate.execute(command, context);
    await recordDelegateDecisionIfNeeded(
      this.deps.telemetry,
      this.deps.mode,
      result,
      admissionContext
    );
    return result;
  }

  private async handleDuplicate(
    duplicate: DuplicateProbeResult,
    requestId: string,
    tenantId: string
  ): Promise<DuplicateResult> {
    const result: DuplicateResult = {
      kind: START_RUN_RESULT_KIND.duplicate,
      runId: duplicate.runId,
      accepted: true,
      duplicateOf:
        duplicate.kind === DUPLICATE_RUN_PROBE_KIND.foundRun
          ? START_RUN_DUPLICATE_OF.run
          : START_RUN_DUPLICATE_OF.intent,
    };

    await recordAdmissionTelemetry(this.deps.telemetry, {
      requestId,
      tenantId,
      runId: duplicate.runId,
      mode: this.deps.mode,
      decision: ADMISSION_TELEMETRY_DECISION.duplicate,
      duplicateOf: result.duplicateOf,
    } satisfies AdmissionDecisionRecord);

    return result;
  }

  private async evaluateAdmission(
    command: StartRunCommand,
    context: { requestId: string; tenantId: string; runId: string }
  ): Promise<AdmissionRejectResult | null> {
    if (this.deps.mode === ADMISSION_MODE.off) {
      return null;
    }

    try {
      await this.deps.admissionGuard.assertAdmissible(context.tenantId);
    } catch (error) {
      const reject = toGuardAdmissionRejectResult(error, this.deps.retryAfterSeconds);
      if (reject === null) {
        throw error;
      }
      return this.handleReject(reject, context);
    }

    const capacity = await this.deps.executionCapacity.evaluate({
      targetAdapter: command.targetAdapter,
    });
    const reject = toExecutionCapacityRejectResult(capacity, this.deps.retryAfterSeconds);
    if (reject === null) {
      return null;
    }

    return this.handleReject(reject, context);
  }

  private async handleReject(
    reject: AdmissionRejectResult,
    context: { requestId: string; tenantId: string; runId: string }
  ): Promise<AdmissionRejectResult | null> {
    await recordAdmissionTelemetry(
      this.deps.telemetry,
      buildAdmissionRejectionRecord(reject, this.deps.mode, context)
    );

    return this.deps.mode === ADMISSION_MODE.observe ? null : reject;
  }
}

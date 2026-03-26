import {
  BackpressureSnapshotUnavailableError,
  SystemBackpressureError,
  TenantBackpressureError,
} from '@dvt/delivery';

import {
  ADMISSION_TELEMETRY_DECISION,
  type AdmissionDecisionRecord,
  type AdmissionTelemetry,
} from '../ports/AdmissionTelemetry.js';
import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import { DUPLICATE_RUN_PROBE_KIND, type DuplicateRunProbe } from '../ports/DuplicateRunProbe.js';
import { ADMISSION_MODE, type AdmissionMode } from '../ports/IAdmissionMode.js';
import type { StartRunCommand } from '../ports/startRunCommandContract.js';
import {
  START_RUN_BACKPRESSURE_CODE,
  START_RUN_DUPLICATE_OF,
  START_RUN_RESULT_KIND,
  type StartRunResult,
} from '../ports/startRunResultContract.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCaseContract.js';

type AdmissionGuard = {
  assertAdmissible(tenantId: string): Promise<void>;
};

type AdmissionRejectResult = Extract<
  StartRunResult,
  {
    readonly kind:
      | typeof START_RUN_RESULT_KIND.tenantBackpressure
      | typeof START_RUN_RESULT_KIND.systemBackpressure;
  }
>;
type DelegateTelemetryResult = Extract<
  StartRunResult,
  {
    readonly kind: typeof START_RUN_RESULT_KIND.accepted | typeof START_RUN_RESULT_KIND.duplicate;
  }
>;

export class BackpressureAwareStartRunUseCase implements IStartRunUseCase {
  public constructor(
    private readonly deps: {
      readonly duplicateProbe: DuplicateRunProbe;
      readonly admissionGuard: AdmissionGuard;
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
        value: await this.handleDuplicate(duplicate, context, tenantId),
      };
    }

    const admissionResult = await this.evaluateAdmission(command, context, tenantId);
    if (admissionResult !== null) {
      return { ok: true, value: admissionResult };
    }

    // Future rate limiter ordering, if enabled: duplicate -> backpressure -> rate limiter -> engine.
    const result = await this.deps.delegate.execute(command, context);
    void this.recordDelegateDecisionIfNeeded(result, {
      requestId: context.requestId,
      tenantId,
      runId: command.runId,
    });

    return result;
  }

  private async handleDuplicate(
    duplicate: {
      kind: typeof DUPLICATE_RUN_PROBE_KIND.foundRun | typeof DUPLICATE_RUN_PROBE_KIND.foundIntent;
      runId: string;
    },
    context: AuthorizedCommandExecutionContext,
    tenantId: string
  ): Promise<Extract<StartRunResult, { readonly kind: typeof START_RUN_RESULT_KIND.duplicate }>> {
    const result: Extract<
      StartRunResult,
      { readonly kind: typeof START_RUN_RESULT_KIND.duplicate }
    > = {
      kind: START_RUN_RESULT_KIND.duplicate,
      runId: duplicate.runId,
      accepted: true,
      duplicateOf:
        duplicate.kind === DUPLICATE_RUN_PROBE_KIND.foundRun
          ? START_RUN_DUPLICATE_OF.run
          : START_RUN_DUPLICATE_OF.intent,
    };

    await this.record({
      requestId: context.requestId,
      tenantId,
      runId: duplicate.runId,
      mode: this.deps.mode,
      decision: ADMISSION_TELEMETRY_DECISION.duplicate,
      duplicateOf: result.duplicateOf,
    });

    return result;
  }

  private async evaluateAdmission(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext,
    tenantId: string
  ): Promise<AdmissionRejectResult | null> {
    if (this.deps.mode === ADMISSION_MODE.off) {
      return null;
    }

    try {
      await this.deps.admissionGuard.assertAdmissible(tenantId);
      return null;
    } catch (error) {
      const reject = this.toAdmissionRejectResult(error);
      if (reject === null) {
        throw error;
      }

      await this.record(
        this.buildRejectionRecord(reject, {
          requestId: context.requestId,
          tenantId,
          runId: command.runId,
        })
      );

      return this.deps.mode === ADMISSION_MODE.observe ? null : reject;
    }
  }

  private buildRejectionRecord(
    reject: AdmissionRejectResult,
    context: { requestId: string; tenantId: string; runId: string }
  ): AdmissionDecisionRecord {
    const mode = this.deps.mode;
    const isObserve = mode === ADMISSION_MODE.observe;
    const base = { ...context, mode, retryAfterSeconds: reject.retryAfterSeconds };

    if (reject.kind === START_RUN_RESULT_KIND.tenantBackpressure) {
      return {
        ...base,
        decision: isObserve
          ? ADMISSION_TELEMETRY_DECISION.wouldRejectTenant
          : ADMISSION_TELEMETRY_DECISION.rejectTenant,
        code: reject.code,
      };
    }

    return {
      ...base,
      decision: isObserve
        ? ADMISSION_TELEMETRY_DECISION.wouldRejectSystem
        : ADMISSION_TELEMETRY_DECISION.rejectSystem,
      code: reject.code,
    };
  }

  private toAdmissionRejectResult(error: unknown): AdmissionRejectResult | null {
    if (error instanceof TenantBackpressureError) {
      return {
        kind: START_RUN_RESULT_KIND.tenantBackpressure,
        accepted: false,
        code: START_RUN_BACKPRESSURE_CODE.tenant,
        retryAfterSeconds: this.deps.retryAfterSeconds,
      };
    }

    if (error instanceof SystemBackpressureError) {
      return {
        kind: START_RUN_RESULT_KIND.systemBackpressure,
        accepted: false,
        code: START_RUN_BACKPRESSURE_CODE.system,
        retryAfterSeconds: this.deps.retryAfterSeconds,
      };
    }

    if (error instanceof BackpressureSnapshotUnavailableError) {
      return {
        kind: START_RUN_RESULT_KIND.systemBackpressure,
        accepted: false,
        code: START_RUN_BACKPRESSURE_CODE.snapshotUnavailable,
        retryAfterSeconds: this.deps.retryAfterSeconds,
      };
    }

    return null;
  }

  private async record(event: AdmissionDecisionRecord): Promise<void> {
    try {
      await this.deps.telemetry.record(event);
    } catch {
      // Telemetry must not break command admission.
    }
  }

  private async recordDelegateDecisionIfNeeded(
    result: StartRunUseCaseResult,
    context: {
      readonly requestId: string;
      readonly tenantId: string;
      readonly runId: string;
    }
  ): Promise<void> {
    if (!isDelegateTelemetryResult(result)) {
      return;
    }

    if (result.value.kind === START_RUN_RESULT_KIND.duplicate) {
      await this.record({
        requestId: context.requestId,
        tenantId: context.tenantId,
        runId: context.runId,
        mode: this.deps.mode,
        decision: ADMISSION_TELEMETRY_DECISION.duplicate,
        duplicateOf: result.value.duplicateOf,
      });
      return;
    }

    await this.record({
      requestId: context.requestId,
      tenantId: context.tenantId,
      runId: context.runId,
      mode: this.deps.mode,
      decision: ADMISSION_TELEMETRY_DECISION.accept,
    });
  }
}

function isDelegateTelemetryResult(
  result: StartRunUseCaseResult
): result is { readonly ok: true; readonly value: DelegateTelemetryResult } {
  return (
    result.ok &&
    (result.value.kind === START_RUN_RESULT_KIND.accepted ||
      result.value.kind === START_RUN_RESULT_KIND.duplicate)
  );
}

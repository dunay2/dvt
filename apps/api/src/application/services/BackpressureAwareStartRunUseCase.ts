import {
  ADMISSION_TELEMETRY_DECISION,
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

type AdmissionErrorCode =
  | typeof START_RUN_BACKPRESSURE_CODE.tenant
  | typeof START_RUN_BACKPRESSURE_CODE.system
  | typeof START_RUN_BACKPRESSURE_CODE.snapshotUnavailable;

type AdmissionDecision =
  | typeof ADMISSION_TELEMETRY_DECISION.wouldRejectTenant
  | typeof ADMISSION_TELEMETRY_DECISION.wouldRejectSystem
  | typeof ADMISSION_TELEMETRY_DECISION.rejectTenant
  | typeof ADMISSION_TELEMETRY_DECISION.rejectSystem;

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
    await this.recordDelegateDecisionIfNeeded(result, {
      requestId: context.requestId,
      tenantId,
      runId: command.runId,
    });

    return result;
  }

  private async handleDuplicate(
    duplicate: {
      kind:
        | typeof DUPLICATE_RUN_PROBE_KIND.foundRun
        | typeof DUPLICATE_RUN_PROBE_KIND.foundIntent;
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

    await this.recordTelemetry({
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

      await this.recordTelemetry({
        requestId: context.requestId,
        tenantId,
        runId: command.runId,
        mode: this.deps.mode,
        decision: this.buildAdmissionDecision(reject),
        retryAfterSeconds: reject.retryAfterSeconds,
        code: reject.code,
      });

      return this.deps.mode === ADMISSION_MODE.observe ? null : reject;
    }
  }

  private buildAdmissionDecision(reject: AdmissionRejectResult): AdmissionDecision {
    if (this.deps.mode === ADMISSION_MODE.observe) {
      return reject.kind === START_RUN_RESULT_KIND.tenantBackpressure
        ? ADMISSION_TELEMETRY_DECISION.wouldRejectTenant
        : ADMISSION_TELEMETRY_DECISION.wouldRejectSystem;
    }

    return reject.kind === START_RUN_RESULT_KIND.tenantBackpressure
      ? ADMISSION_TELEMETRY_DECISION.rejectTenant
      : ADMISSION_TELEMETRY_DECISION.rejectSystem;
  }

  private toAdmissionRejectResult(error: unknown): AdmissionRejectResult | null {
    const code = getAdmissionErrorCode(error);
    if (code === START_RUN_BACKPRESSURE_CODE.tenant) {
      return {
        kind: START_RUN_RESULT_KIND.tenantBackpressure,
        accepted: false,
        code,
        retryAfterSeconds: this.deps.retryAfterSeconds,
      };
    }

    if (
      code === START_RUN_BACKPRESSURE_CODE.system ||
      code === START_RUN_BACKPRESSURE_CODE.snapshotUnavailable
    ) {
      return {
        kind: START_RUN_RESULT_KIND.systemBackpressure,
        accepted: false,
        code,
        retryAfterSeconds: this.deps.retryAfterSeconds,
      };
    }

    return null;
  }

  private async recordTelemetry(
    input: Parameters<AdmissionTelemetry['recordDecision']>[0]
  ): Promise<void> {
    try {
      await this.deps.telemetry.recordDecision(input);
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
      await this.recordTelemetry({
        requestId: context.requestId,
        tenantId: context.tenantId,
        runId: context.runId,
        mode: this.deps.mode,
        decision: ADMISSION_TELEMETRY_DECISION.duplicate,
        duplicateOf: result.value.duplicateOf,
      });
      return;
    }

    await this.recordTelemetry({
      requestId: context.requestId,
      tenantId: context.tenantId,
      runId: context.runId,
      mode: this.deps.mode,
      decision: ADMISSION_TELEMETRY_DECISION.accept,
    });
  }
}

function getAdmissionErrorCode(error: unknown): AdmissionErrorCode | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const code = (error as Error & { code?: unknown }).code;
  if (
    code === START_RUN_BACKPRESSURE_CODE.tenant ||
    code === START_RUN_BACKPRESSURE_CODE.system ||
    code === START_RUN_BACKPRESSURE_CODE.snapshotUnavailable
  ) {
    return code;
  }

  return null;
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

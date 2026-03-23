import type { AdmissionTelemetry } from '../ports/AdmissionTelemetry.js';
import type {
  AuthorizedCommandExecutionContext,
  IStartRunUseCase,
  StartRunCommand,
  StartRunResult,
} from '../ports/auth.js';
import type { DuplicateRunProbe } from '../ports/DuplicateRunProbe.js';
import type { AdmissionMode } from '../ports/IAdmissionMode.js';

type AdmissionGuard = {
  assertAdmissible(tenantId: string): Promise<void>;
};

type AdmissionRejectResult = Extract<
  StartRunResult,
  { readonly kind: 'tenant_backpressure' | 'system_backpressure' }
>;

type AdmissionErrorCode =
  | 'TENANT_BACKPRESSURE'
  | 'SYSTEM_BACKPRESSURE'
  | 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE';

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
  ): Promise<StartRunResult> {
    const tenantId = context.scope.tenantId.value;
    const duplicate = await this.deps.duplicateProbe.findExisting(tenantId, command.runId);
    if (duplicate.kind !== 'not_found') {
      return this.handleDuplicate(duplicate, context, tenantId);
    }

    const admissionResult = await this.evaluateAdmission(command, context, tenantId);
    if (admissionResult !== null) {
      return admissionResult;
    }

    // Future rate limiter ordering, if enabled: duplicate -> backpressure -> rate limiter -> engine.
    const result = await this.deps.delegate.execute(command, context);
    if (result.kind === 'accepted' || result.kind === 'duplicate') {
      await this.recordTelemetry({
        requestId: context.requestId,
        tenantId,
        runId: command.runId,
        mode: this.deps.mode,
        decision: result.kind === 'duplicate' ? 'duplicate' : 'accept',
        ...(result.kind === 'duplicate' ? { duplicateOf: result.duplicateOf } : {}),
      });
    }

    return result;
  }

  private async handleDuplicate(
    duplicate: { kind: 'found_run' | 'found_intent'; runId: string },
    context: AuthorizedCommandExecutionContext,
    tenantId: string
  ): Promise<Extract<StartRunResult, { readonly kind: 'duplicate' }>> {
    const result: Extract<StartRunResult, { readonly kind: 'duplicate' }> = {
      kind: 'duplicate',
      runId: duplicate.runId,
      accepted: true,
      duplicateOf: duplicate.kind === 'found_run' ? 'run' : 'intent',
    };

    await this.recordTelemetry({
      requestId: context.requestId,
      tenantId,
      runId: result.runId,
      mode: this.deps.mode,
      decision: 'duplicate',
      duplicateOf: result.duplicateOf,
    });

    return result;
  }

  private async evaluateAdmission(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext,
    tenantId: string
  ): Promise<AdmissionRejectResult | null> {
    if (this.deps.mode === 'off') {
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

      return this.deps.mode === 'observe' ? null : reject;
    }
  }

  private buildAdmissionDecision(
    reject: AdmissionRejectResult
  ): 'would_reject_tenant' | 'would_reject_system' | 'reject_tenant' | 'reject_system' {
    if (this.deps.mode === 'observe') {
      return reject.kind === 'tenant_backpressure' ? 'would_reject_tenant' : 'would_reject_system';
    }

    return reject.kind === 'tenant_backpressure' ? 'reject_tenant' : 'reject_system';
  }

  private toAdmissionRejectResult(error: unknown): AdmissionRejectResult | null {
    const code = getAdmissionErrorCode(error);
    if (code === 'TENANT_BACKPRESSURE') {
      return {
        kind: 'tenant_backpressure',
        accepted: false,
        code,
        retryAfterSeconds: this.deps.retryAfterSeconds,
      };
    }

    if (code === 'SYSTEM_BACKPRESSURE' || code === 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE') {
      return {
        kind: 'system_backpressure',
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
}

function getAdmissionErrorCode(error: unknown): AdmissionErrorCode | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const code = (error as Error & { code?: unknown }).code;
  if (
    code === 'TENANT_BACKPRESSURE' ||
    code === 'SYSTEM_BACKPRESSURE' ||
    code === 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE'
  ) {
    return code;
  }

  return null;
}

export class DVTError extends Error {
  readonly code: string;
  readonly context: Record<string, unknown>;
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.context = context ?? {};
    Object.setPrototypeOf(this, DVTError.prototype);
  }
}

export class ContractViolationError extends DVTError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('CONTRACT_VIOLATION', message, context);
    Object.setPrototypeOf(this, ContractViolationError.prototype);
  }
}

export class DeterminismViolationError extends DVTError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('DETERMINISM_VIOLATION', message, context);
    Object.setPrototypeOf(this, DeterminismViolationError.prototype);
  }
}

export class InvalidStateTransitionError extends DVTError {
  constructor(currentState: string, attemptedState: string, context?: Record<string, unknown>) {
    super('INVALID_STATE_TRANSITION', `Cannot transition from ${currentState} to ${attemptedState}`, { currentState, attemptedState, ...context });
    Object.setPrototypeOf(this, InvalidStateTransitionError.prototype);
  }
}

export class TenantIsolationViolationError extends DVTError {
  constructor(requestTenantId: string, accessedTenantId: string, context?: Record<string, unknown>) {
    super('TENANT_ISOLATION_VIOLATION', `Attempted to access tenant ${accessedTenantId} from context of ${requestTenantId}`, { requestTenantId, accessedTenantId, ...context });
    Object.setPrototypeOf(this, TenantIsolationViolationError.prototype);
  }
}

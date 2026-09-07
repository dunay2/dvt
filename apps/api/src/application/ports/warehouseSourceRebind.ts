/** Owned concern: define the application boundary and explicit failures for physical warehouse Source rebind. */
import type {
  RebindWarehouseSourceRequest,
  RebindWarehouseSourceResult,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

export type RebindWarehouseSourceInput = RebindWarehouseSourceRequest & {
  readonly scope: WorkspaceGraphDraftScope;
  readonly nodeId: string;
};

export type RebindWarehouseSourceOutput = RebindWarehouseSourceResult;

export class WarehouseSourceRebindNodeNotFoundError extends Error {
  public constructor(readonly nodeId: string) {
    super(`Warehouse Source logical node not found: ${nodeId}`);
    this.name = 'WarehouseSourceRebindNodeNotFoundError';
  }
}

export class WarehouseSourceRebindSchemaDriftError extends Error {
  public constructor(
    message = 'The target warehouse object is not schema-compatible with the logical Source.'
  ) {
    super(message);
    this.name = 'WarehouseSourceRebindSchemaDriftError';
  }
}

export class WarehouseSourceRebindBindingConflictError extends Error {
  public constructor(
    message = 'The requested physical Source binding conflicts with the current draft.'
  ) {
    super(message);
    this.name = 'WarehouseSourceRebindBindingConflictError';
  }
}

export class WarehouseSourceRebindUnverifiedError extends Error {
  public constructor(message = 'The target warehouse Source binding cannot be verified safely.') {
    super(message);
    this.name = 'WarehouseSourceRebindUnverifiedError';
  }
}

export class WarehouseSourceRebindIdempotencyMismatchError extends Error {
  public constructor(readonly idempotencyKey: string) {
    super(`Warehouse Source rebind idempotency key was reused: ${idempotencyKey}`);
    this.name = 'WarehouseSourceRebindIdempotencyMismatchError';
  }
}

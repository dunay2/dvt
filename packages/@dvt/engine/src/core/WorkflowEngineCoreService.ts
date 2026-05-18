/**
 * @ownedConcern Provide the combined run-control delegator that delegates to command and signal services.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0039: Hexagonal Port Hardening and SOLID Remediation
 * @decision Keep combined run-control delegation without owning cancel or signal semantics.
 * @consequence Runtime command and signal behavior stay in role-specific services.
 * @version 1.0.0
 */
import type { EngineRunRef, SignalRequest } from '@dvt/contracts';

import type { IRunCommandService } from '../domain/IRunCommandService.js';
import type { IRunControlService } from '../domain/IRunControlService.js';
import type { IRunSignalService } from '../domain/IRunSignalService.js';

export interface WorkflowEngineCoreDeps {
  runCommandService: IRunCommandService;
  runSignalService: IRunSignalService;
}

export class WorkflowEngineCoreService implements IRunControlService {
  constructor(private readonly deps: WorkflowEngineCoreDeps) {}

  async cancel(ref: EngineRunRef): Promise<void> {
    return this.deps.runCommandService.cancel(ref);
  }

  async signal(ref: EngineRunRef, req: SignalRequest): Promise<void> {
    return this.deps.runSignalService.signal(ref, req);
  }
}

export function buildRunControlService(deps: WorkflowEngineCoreDeps): IRunControlService {
  return new WorkflowEngineCoreService(deps);
}

/**
 * @ownedConcern Expose runtime run-command operations through a role interface.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0039: Hexagonal Port Hardening and SOLID Remediation
 * @decision Keep cancel command behavior behind a command-specific runtime port.
 * @version 1.0.0
 */
import type { EngineRunRef } from '@dvt/contracts';

export interface IRunCommandService {
  cancel(ref: EngineRunRef): Promise<void>;
}

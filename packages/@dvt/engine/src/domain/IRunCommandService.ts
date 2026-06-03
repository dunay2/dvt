/**
 * @ownedConcern Expose the runtime cancel command role interface for run-control commands.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0039: Hexagonal Port Hardening and SOLID Remediation
 * @decision Keep cancel command behavior behind a command-specific runtime port.
 * @version 1.0.0
 */
import type { EngineRunRef } from '@dvt/contracts';

export interface IRunCommandService {
  cancel(ref: EngineRunRef): Promise<void>;
}

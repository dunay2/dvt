/**
 * @ownedConcern Expose runtime signal operations through a role interface.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0039: Hexagonal Port Hardening and SOLID Remediation
 * @decision Keep signal command behavior behind a signal-specific runtime port.
 * @version 1.0.0
 */
import type { EngineRunRef, SignalRequest } from '@dvt/contracts';

export interface IRunSignalService {
  signal(ref: EngineRunRef, req: SignalRequest): Promise<void>;
}

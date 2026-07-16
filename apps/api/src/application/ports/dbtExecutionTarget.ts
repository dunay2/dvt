import type { DbtExecutionTargetIdentity } from '@dvt/contracts';

/** Server-owned execution identity. Credential values never cross this port. */
export interface IDbtExecutionTargetResolver {
  resolve(): DbtExecutionTargetIdentity | null;
}

import type { DbtExecutionTargetIdentity } from '@dvt/contracts';

/** Server-owned execution identity. Credential values never cross this port. */
export interface IDbtExecutionTargetResolver {
  resolve(): DbtExecutionTargetIdentity | null;
}

export interface IDbtExecutionConnectionBindingVerifier {
  verify(input: {
    readonly runtimeCredentialRef: string;
    readonly targetProfile: string;
    readonly connectionCredentialRef: string;
  }): Promise<boolean>;
}

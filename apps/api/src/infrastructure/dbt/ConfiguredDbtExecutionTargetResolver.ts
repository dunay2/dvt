import { DbtExecutionTargetIdentitySchema, type DbtExecutionTargetIdentity } from '@dvt/contracts';

import type { IDbtExecutionTargetResolver } from '../../application/ports/dbtExecutionTarget.js';

export type ConfiguredDbtExecutionTarget = Readonly<{
  enabled: boolean;
  provider: string;
  adapter?: string | undefined;
  targetName?: string | undefined;
  connectionId?: string | undefined;
  credentialRef?: string | undefined;
}>;

export class ConfiguredDbtExecutionTargetResolver implements IDbtExecutionTargetResolver {
  readonly #target: DbtExecutionTargetIdentity | null;

  public constructor(config: ConfiguredDbtExecutionTarget) {
    if (!config.enabled) {
      this.#target = null;
      return;
    }

    const targetFields = [
      config.adapter,
      config.targetName,
      config.connectionId,
      config.credentialRef,
    ];
    if (targetFields.every((value) => value === undefined)) {
      this.#target = null;
      return;
    }
    if (targetFields.some((value) => value === undefined)) {
      throw new Error(
        'DVT_DBT_EXECUTION_ADAPTER, DVT_DBT_EXECUTION_TARGET_NAME, DVT_DBT_EXECUTION_CONNECTION_ID, and DVT_DBT_EXECUTION_CREDENTIAL_REF must all be configured together.'
      );
    }

    this.#target = DbtExecutionTargetIdentitySchema.parse({
      provider: config.provider,
      adapter: config.adapter,
      targetName: config.targetName,
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: config.connectionId,
        provider: config.adapter,
      },
      resolutionSource: 'environment-default',
      credentialRef: config.credentialRef,
    });
  }

  public resolve(): DbtExecutionTargetIdentity | null {
    return this.#target;
  }
}

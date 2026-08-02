/** Owned concern: serialize one recovery command identity across API instances. */
export interface RunRecoveryCommandKey {
  readonly tenantId: string;
  readonly recoveryRunId: string;
}

export interface IRunRecoveryCommandCoordinator {
  executeExclusive<T>(key: RunRecoveryCommandKey, operation: () => Promise<T>): Promise<T>;
}

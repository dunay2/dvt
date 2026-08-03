/** Owned concern: serialize one run-control command identity across API instances. */
export interface RunControlCommandKey {
  readonly action: 'cancel' | 'recover';
  readonly tenantId: string;
  readonly runId: string;
}

export interface IRunControlCommandCoordinator {
  executeExclusive<T>(key: RunControlCommandKey, operation: () => Promise<T>): Promise<T>;
}

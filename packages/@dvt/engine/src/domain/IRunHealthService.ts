/**
 * @ownedConcern Define the engine operational health read model exposed to runtime callers.
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded';
  components: Array<{
    name: string;
    status: 'up' | 'down';
    error?: string;
    breaker?: {
      provider: string;
      state: 'closed' | 'open' | 'half_open';
      failureCount: number;
      openedAtEpochMs?: number;
      retryAtEpochMs?: number;
      lastFailureMessage?: string;
      lastOperation?: string;
    };
  }>;
}

export interface IRunHealthService {
  healthCheck(): Promise<HealthStatus>;
}

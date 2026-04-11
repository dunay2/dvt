export interface HealthStatus {
  status: 'healthy' | 'degraded';
  components: Array<{
    name: string;
    status: 'up' | 'down';
    error?: string;
  }>;
}

export interface IRunHealthService {
  healthCheck(): Promise<HealthStatus>;
}

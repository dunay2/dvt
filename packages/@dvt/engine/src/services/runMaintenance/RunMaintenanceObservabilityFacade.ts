import { RUN_MAINTENANCE_NUMERIC } from './RunMaintenanceDomainConstants.js';

type RunMaintenanceServiceDeps = import('./RunMaintenanceContracts.js').RunMaintenanceServiceDeps;

export class RunMaintenanceObservabilityFacade {
  constructor(private readonly observability: RunMaintenanceServiceDeps['observability']) {}

  incrementCounter(name: string, labels: Readonly<Record<string, string>>): void {
    try {
      this.observability.metrics.counter(name, labels).add(RUN_MAINTENANCE_NUMERIC.metricIncrement);
    } catch {
      // no-op
    }
  }

  info(entry: Parameters<RunMaintenanceServiceDeps['observability']['logs']['info']>[0]): void {
    try {
      this.observability.logs.info(entry);
    } catch {
      // no-op
    }
  }

  warn(entry: Parameters<RunMaintenanceServiceDeps['observability']['logs']['warn']>[0]): void {
    try {
      this.observability.logs.warn(entry);
    } catch {
      // no-op
    }
  }

  error(entry: Parameters<RunMaintenanceServiceDeps['observability']['logs']['error']>[0]): void {
    try {
      this.observability.logs.error(entry);
    } catch {
      // no-op
    }
  }
}

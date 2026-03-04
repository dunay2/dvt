import {
  IntentReconciler,
  type IntentReconcilerOptions,
  type ReconcilerMetrics,
  type ReconcileService,
  type ReconcilerLogger,
} from './reconciler';

interface RuntimeIntegration {
  start(): void;
  stop(): Promise<void>;
}

/**
 * Runtime integration wrapper for the reconciler.
 * Keeps lifecycle explicit and avoids module import side effects.
 */
export function createRuntimeIntegration(
  service: ReconcileService,
  logger: ReconcilerLogger,
  metrics: ReconcilerMetrics,
  options?: IntentReconcilerOptions
): RuntimeIntegration {
  const reconciler = new IntentReconciler(service, logger, metrics, options);
  return {
    start: () => reconciler.start(),
    stop: () => reconciler.stop(),
  };
}

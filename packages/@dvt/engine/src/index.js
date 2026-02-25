'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, '__esModule', { value: true });
/**
 * @file packages/@dvt/engine/src/index.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Expose a stable public surface of the engine for orchestration decoupled from the runtime
 * @consequence Consumers integrate engine contracts/ports without depending on internal implementations
 * @version 1.0.0
 * @date 2026-02-21
 */
__exportStar(require('./contracts/IWorkflowEngine.v1_1_1.js'), exports);
__exportStar(require('./contracts/types.js'), exports);
__exportStar(require('./contracts/runEvents.js'), exports);
__exportStar(require('./contracts/executionPlan.js'), exports);
__exportStar(require('./contracts/errors.js'), exports);
__exportStar(require('./core/WorkflowEngine.js'), exports);
__exportStar(require('./core/SnapshotProjector.js'), exports);
__exportStar(require('./core/idempotency.js'), exports);
__exportStar(require('./state/IRunStateStore.js'), exports);
__exportStar(require('./state/InMemoryTxStore.js'), exports);
__exportStar(require('./outbox/types.js'), exports);
__exportStar(require('./outbox/IOutboxRateLimiter.js'), exports);
__exportStar(require('./outbox/TokenBucketRateLimiter.js'), exports);
__exportStar(require('./outbox/OutboxWorker.js'), exports);
__exportStar(require('./outbox/InMemoryEventBus.js'), exports);
__exportStar(require('./utils/clock.js'), exports);
__exportStar(require('./metrics/IMetricsCollector.js'), exports);
__exportStar(require('./security/authorizer.js'), exports);
__exportStar(require('./security/AuthorizationError.js'), exports);
__exportStar(require('./security/planRefPolicy.js'), exports);
__exportStar(require('./security/planIntegrity.js'), exports);
__exportStar(require('./adapters/IPlanFetcher.js'), exports);
__exportStar(require('./adapters/IProviderAdapter.js'), exports);
__exportStar(require('./adapters/mock/MockAdapter.js'), exports);
__exportStar(require('./adapters/temporal/TemporalAdapterStub.js'), exports);
__exportStar(require('./adapters/conductor/ConductorAdapterStub.js'), exports);
__exportStar(require('./application/providerSelection.js'), exports);
//# sourceMappingURL=index.js.map

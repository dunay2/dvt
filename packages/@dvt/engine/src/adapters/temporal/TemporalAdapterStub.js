'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TemporalAdapterStub = void 0;
/**
 * Stub for Phase 1 engine-core integration.
 * Phase 2+ should wire Temporal SDK client/workers.
 * References:
 * - Temporal TS SDK: https://docs.temporal.io/develop/typescript
 */
class TemporalAdapterStub {
  constructor() {
    this.provider = 'temporal';
  }
  async startRun(_planRef, _ctx) {
    void _planRef;
    void _ctx;
    throw new Error('NotImplemented: TemporalAdapter (Phase 2+)');
  }
  async cancelRun(_runRef) {
    void _runRef;
    throw new Error('NotImplemented: TemporalAdapter (Phase 2+)');
  }
  async getRunStatus(_runRef) {
    void _runRef;
    throw new Error('NotImplemented: TemporalAdapter (Phase 2+)');
  }
  async signal(_runRef, _request) {
    void _runRef;
    void _request;
    throw new Error('NotImplemented: TemporalAdapter (Phase 2+)');
  }
}
exports.TemporalAdapterStub = TemporalAdapterStub;
//# sourceMappingURL=TemporalAdapterStub.js.map

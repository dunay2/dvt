'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ConductorAdapterStub = void 0;
/**
 * Stub for Phase 1 engine-core integration.
 * Phase 2+ should wire Netflix Conductor client.
 * References:
 * - Conductor: https://github.com/netflix/conductor/wiki
 */
/** Capabilities declared by the Conductor adapter. Must stay in sync with adapters.capabilities.json. */
const CONDUCTOR_CAPABILITIES = [
  'basic-execution',
  'signal.pause.emulated',
  'cancel.forced',
  'workflow.fan.parallel',
  'query.task.state',
  'replay.task',
  'signals.rate.limit',
];
class ConductorAdapterStub {
  constructor() {
    this.provider = 'conductor';
  }
  async startRun(_planRef, _ctx) {
    void _planRef;
    void _ctx;
    throw new Error('NotImplemented: ConductorAdapter (Phase 2+)');
  }
  async cancelRun(_runRef) {
    void _runRef;
    throw new Error('NotImplemented: ConductorAdapter (Phase 2+)');
  }
  async getRunStatus(_runRef) {
    void _runRef;
    throw new Error('NotImplemented: ConductorAdapter (Phase 2+)');
  }
  async signal(_runRef, _request) {
    void _runRef;
    void _request;
    throw new Error('NotImplemented: ConductorAdapter (Phase 2+)');
  }
  capabilities() {
    return CONDUCTOR_CAPABILITIES;
  }
}
exports.ConductorAdapterStub = ConductorAdapterStub;
//# sourceMappingURL=ConductorAdapterStub.js.map

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MockAdapter = void 0;
/** Contract versions this adapter implementation can execute. */
const SUPPORTED_CONTRACT_VERSIONS = ['1.0.0'];
/** Capabilities declared by the mock adapter. Must stay in sync with adapters.capabilities.json. */
const MOCK_CAPABILITIES = ['basic-execution', 'signal.pause.native', 'workflow.fan.parallel'];
class MockAdapter {
  constructor(deps) {
    this.deps = deps;
    this.provider = 'mock';
  }
  async startRun(planRef, ctx) {
    const plan = this.deps.planFetcher
      ? await this.deps.planFetcher.fetch(planRef)
      : {
          metadata: {
            planId: planRef.planId,
            planVersion: planRef.planVersion,
            schemaVersion: planRef.schemaVersion,
            contractVersion: '1.0.0',
          },
          steps: [],
        };
    validateMockPlanMetadata(plan.metadata);
    const runRef = {
      provider: 'mock',
      workflowId: `mock_${ctx.runId}`,
      runId: ctx.runId,
    };
    for (const step of plan.steps) {
      validateMockStep(step);
    }
    return runRef;
  }
  async cancelRun(_runRef) {
    void _runRef;
    // For mock, cancellation is cooperative; engine emits RunCancelled.
  }
  async getRunStatus(runRef) {
    const events = await this.deps.stateStore.listEvents(runRef.runId);
    return this.deps.projector.rebuild(runRef.runId, events);
  }
  async signal(_runRef, _request) {
    void _runRef;
    void _request;
    // For mock, signals are interpreted by engine (pause/resume/cancel events).
  }
  capabilities() {
    return MOCK_CAPABILITIES;
  }
}
exports.MockAdapter = MockAdapter;
function validateMockPlanMetadata(metadata) {
  if (!SUPPORTED_CONTRACT_VERSIONS.includes(metadata.contractVersion)) {
    throw new Error(
      `PLAN_CONTRACT_VERSION_UNKNOWN: ${metadata.contractVersion}. Supported: ${SUPPORTED_CONTRACT_VERSIONS.join(', ')}`
    );
  }
}
function validateMockStep(step) {
  // Adapter narrowing rule: reject unrecognized fields.
  // For mock we only allow: stepId, kind, dependsOn.
  const allowed = new Set(['stepId', 'kind', 'dependsOn']);
  for (const k of Object.keys(step)) {
    if (!allowed.has(k)) {
      throw new Error(`INVALID_STEP_SCHEMA: field_not_allowed:${k}`);
    }
  }
  if (!Array.isArray(step.dependsOn) && typeof step.dependsOn !== 'undefined') {
    throw new Error('INVALID_STEP_SCHEMA: dependsOn_must_be_array');
  }
  if (Array.isArray(step.dependsOn) && step.dependsOn.some((dep) => typeof dep !== 'string')) {
    throw new Error('INVALID_STEP_SCHEMA: dependsOn_values_must_be_string');
  }
}
//# sourceMappingURL=MockAdapter.js.map

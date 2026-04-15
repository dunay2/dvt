/**
 * Compatibility barrel for Temporal integration-test harness helpers.
 * Concrete responsibilities live under test/helpers/integration/.
 */

export {
  assertWorkflowArtifactPresentInCi,
  INTEGRATION_TEST_TIMEOUT,
  WORKFLOW_PATH,
} from './helpers/integration/workflowArtifacts.js';
export type { EventEnvelope, RunStatusValue } from './helpers/integration/runtimeState.js';
export {
  RunId,
  TestOutbox,
  TestProjector,
  TestStateStore,
} from './helpers/integration/runtimeState.js';
export { createActivityDeps } from './helpers/integration/testActivities.js';
export {
  createDbtActivityDeps,
  createMultiRunDbtActivityDeps,
  createDbtRunExecutionContext,
  createDbtRunExecutionContextRef,
  withDbtRunExecutionContext,
} from './helpers/integration/dbtRuntimeFixtures.js';
export {
  createPlanRef,
  createRunContext,
  mkLinearThreeStepPlan,
  mkPermanentFailurePlan,
  mkPostgresTransformationPlan,
  withTransformationRuntimeBinding,
} from './helpers/integration/testPlans.js';
export type { WaitForConditionFn } from './helpers/integration/waitForCondition.js';
export { waitForCondition } from './helpers/integration/waitForCondition.js';

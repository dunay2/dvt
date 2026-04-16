import { describe } from 'vitest';

import { registerValidationExecutionContextSuite } from './validation/execution-context.js';
import { registerValidationExecutionPlanSuite } from './validation/execution-plan.js';
import { registerValidationPlanRecordsSuite } from './validation/plan-records.js';
import { registerValidationPlannerGraphSuite } from './validation/planner-graph.js';
import { registerValidationPreviewSuite } from './validation/preview.js';
import { registerValidationRunLifecycleSuite } from './validation/run-lifecycle.js';
import { registerValidationSignalAndErrorSuite } from './validation/signal-and-error.js';
import { registerValidationWorkspaceGraphDraftSuite } from './validation/workspace-graph-draft.js';

describe('contracts: validation helpers', () => {
  registerValidationSignalAndErrorSuite();
  registerValidationRunLifecycleSuite();
  registerValidationExecutionPlanSuite();
  registerValidationExecutionContextSuite();
  registerValidationPlannerGraphSuite();
  registerValidationPlanRecordsSuite();
  registerValidationPreviewSuite();
  registerValidationWorkspaceGraphDraftSuite();
});

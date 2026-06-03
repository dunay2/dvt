import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { RUN_PLAN_WORKFLOW, WorkflowSignals } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

const WORKFLOW_ENTRY_SRC = resolve(__dirname, '../src/workflows/RunPlanWorkflow.ts');
const WORKFLOW_SIGNALS_SRC = resolve(__dirname, '../src/workflows/runPlanWorkflow.signals.ts');
const WORKFLOW_STEP_EXECUTION_SRC = resolve(
  __dirname,
  '../src/workflows/runPlanWorkflow.stepExecution.ts'
);
const WORKFLOW_LAYER_RESULTS_SRC = resolve(
  __dirname,
  '../src/workflows/runPlanWorkflow.layerResults.ts'
);
const WORKFLOW_LAYER_LOOP_SRC = resolve(__dirname, '../src/workflows/runPlanWorkflow.layers.ts');

const workflowEntrySrc = readFileSync(WORKFLOW_ENTRY_SRC, 'utf8');
const workflowSignalsSrc = readFileSync(WORKFLOW_SIGNALS_SRC, 'utf8');
const workflowBoundarySrc = [
  readFileSync(WORKFLOW_STEP_EXECUTION_SRC, 'utf8'),
  readFileSync(WORKFLOW_LAYER_RESULTS_SRC, 'utf8'),
  readFileSync(WORKFLOW_LAYER_LOOP_SRC, 'utf8'),
].join('\n');

describe('workflow literal parity', () => {
  it('active workflow constant points at the single canonical plan-pointer line', () => {
    expect(RUN_PLAN_WORKFLOW).toBe('runPlanWorkflow');
    expect(workflowEntrySrc).toContain('export async function runPlanWorkflow');
    expect(workflowEntrySrc).not.toContain('export async function runPlanWorkflowV2');
  });

  it('workflow signals implemented in RunPlanWorkflow match contract constants', () => {
    const implemented = [WorkflowSignals.PAUSE, WorkflowSignals.RESUME, WorkflowSignals.CANCEL];

    for (const s of implemented) {
      const re = new RegExp(`defineSignal(?:<[^>]+>)?\\(\\s*["']${s}["']\\s*\\)`);
      expect(re.test(workflowSignalsSrc)).toBe(true);
    }

    // Canonical workflow signals are limited to the run-control surface.
    // Future recovery use cases must not silently widen WorkflowSignals again.
  });

  it('keeps gateway DSL evaluation outside workflow code (activity boundary)', () => {
    expect(workflowBoundarySrc).not.toContain('parseDslV1');
    expect(workflowBoundarySrc).not.toContain('evaluateDslV1');
    expect(workflowBoundarySrc).toContain('createStepActivities(');
    expect(workflowBoundarySrc).toContain('args.runtime.stepActivityRouting');
    expect(workflowBoundarySrc).toContain(').executeStep({');
    expect(workflowBoundarySrc).toContain('eventActivities.emitEvent({');
    expect(workflowBoundarySrc).toContain('gatewayContext');
  });
});

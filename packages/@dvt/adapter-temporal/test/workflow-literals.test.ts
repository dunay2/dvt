import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { RUN_PLAN_WORKFLOW, WorkflowSignals } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

const WORKFLOW_SRC = resolve(__dirname, '../src/workflows/RunPlanWorkflow.ts');
const src = readFileSync(WORKFLOW_SRC, 'utf8');

describe('workflow literal parity', () => {
  it('workflow function name matches contract constant', () => {
    expect(RUN_PLAN_WORKFLOW).toBe('runPlanWorkflow');
    expect(src).toContain('export async function runPlanWorkflow');
  });

  it('workflow signals implemented in RunPlanWorkflow match contract constants', () => {
    const implemented = [WorkflowSignals.PAUSE, WorkflowSignals.RESUME, WorkflowSignals.CANCEL];

    for (const s of implemented) {
      const re = new RegExp(`defineSignal(?:<[^>]+>)?\\(\\s*["']${s}["']\\s*\\)`);
      expect(re.test(src)).toBe(true);
    }

    // Canonical workflow signals are limited to the run-control surface.
    // Future recovery use cases must not silently widen WorkflowSignals again.
  });

  it('keeps gateway DSL evaluation outside workflow code (activity boundary)', () => {
    expect(src).not.toContain('parseDslV1');
    expect(src).not.toContain('evaluateDslV1');
    expect(src).toContain('stepActivities.executeStep({');
    expect(src).toContain('eventActivities.emitEvent({');
    expect(src).toContain('gatewayContext');
  });
});

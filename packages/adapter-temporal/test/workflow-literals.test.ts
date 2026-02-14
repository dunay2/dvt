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

    // Signals listed in WorkflowSignals may include phase-2 entries (e.g. RETRY_*).
    // We intentionally only assert on signals actually implemented in the workflow.
  });
});

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

  it('workflow signals in source match contract WorkflowSignals', () => {
    const signals = Object.values(WorkflowSignals) as string[];
    for (const s of signals) {
      const needle = `defineSignal('${s}')`;
      expect(src.includes(needle)).toBe(true);
    }
  });
});

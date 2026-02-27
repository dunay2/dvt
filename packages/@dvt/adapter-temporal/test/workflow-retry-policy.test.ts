import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const WORKFLOW_SRC = resolve(__dirname, '../src/workflows/RunPlanWorkflow.ts');
const src = readFileSync(WORKFLOW_SRC, 'utf8');

describe('workflow retry policy literals', () => {
  it('pins maximumAttempts to 3 for activity retry policy', () => {
    expect(src).toContain('maximumAttempts: 3');
  });

  it('pins maximumInterval to 60 seconds for activity retry policy', () => {
    expect(src).toContain("maximumInterval: '60s'");
  });

  it('marks PermanentStepError as non-retryable', () => {
    expect(src).toContain("nonRetryableErrorTypes: ['PermanentStepError']");
  });
});

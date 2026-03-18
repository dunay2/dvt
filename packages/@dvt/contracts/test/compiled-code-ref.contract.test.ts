import { describe, expect, it } from 'vitest';

import { parseRunEventRecord, parseRunEventWrite } from '../src/validation.js';

import {
  STEP_STARTED_WITHOUT_COMPILED_CODE_REF_RECORD_FIXTURE,
  STEP_STARTED_WITHOUT_COMPILED_CODE_REF_WRITE_FIXTURE,
  STEP_STARTED_WITH_COMPILED_CODE_REF_RECORD_FIXTURE,
  STEP_STARTED_WITH_COMPILED_CODE_REF_WRITE_FIXTURE,
  VALID_COMPILED_CODE_REF_FIXTURE,
} from './fixtures/run-event-compiled-code-ref.fixtures';

describe('contracts: StepStarted compiledCodeRef fixtures (ADR-0032)', () => {
  it('accepts StepStarted write event with compiledCodeRef payload', () => {
    const parsed = parseRunEventWrite(STEP_STARTED_WITH_COMPILED_CODE_REF_WRITE_FIXTURE);

    expect(parsed.eventType).toBe('StepStarted');
    expect(parsed.stepId).toBe('model.analytics.orders');
    expect(parsed.payload?.['compiledCodeRef']).toEqual(VALID_COMPILED_CODE_REF_FIXTURE);
  });

  it('accepts StepStarted write event without compiledCodeRef payload', () => {
    const parsed = parseRunEventWrite(STEP_STARTED_WITHOUT_COMPILED_CODE_REF_WRITE_FIXTURE);

    expect(parsed.eventType).toBe('StepStarted');
    expect(parsed.stepId).toBe('model.analytics.orders');
    expect(parsed.payload?.['compiledCodeRef']).toBeUndefined();
  });

  it('accepts persisted StepStarted record fixtures with and without compiledCodeRef', () => {
    const withRef = parseRunEventRecord(STEP_STARTED_WITH_COMPILED_CODE_REF_RECORD_FIXTURE);
    const withoutRef = parseRunEventRecord(STEP_STARTED_WITHOUT_COMPILED_CODE_REF_RECORD_FIXTURE);

    expect(withRef.runSeq).toBe(10);
    expect(withRef.payload?.['compiledCodeRef']).toEqual(VALID_COMPILED_CODE_REF_FIXTURE);
    expect(withoutRef.runSeq).toBe(11);
    expect(withoutRef.payload?.['compiledCodeRef']).toBeUndefined();
  });
});

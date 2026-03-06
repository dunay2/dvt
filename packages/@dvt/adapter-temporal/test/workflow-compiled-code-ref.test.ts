import type { CompiledCodeRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildStepStartedPayload,
  extractCompiledCodeRef,
} from '../src/workflows/RunPlanWorkflow.js';

type WorkflowStep = Parameters<typeof buildStepStartedPayload>[0];

function makeStep(stepTypeConfig?: Record<string, unknown>): WorkflowStep {
  return {
    stepId: 'step-a',
    kind: 'DBT_MODEL',
    ...(stepTypeConfig === undefined ? {} : { stepTypeConfig }),
  };
}

describe('compiledCodeRef extraction and StepStarted payload', () => {
  const VALID_REF: CompiledCodeRef = {
    sha256: 'a'.repeat(64),
    storageUri: 's3://bucket/compiled/step-a.sql',
    sizeBytes: 123,
    encoding: 'utf-8',
  };

  it('extracts compiledCodeRef when shape is valid', () => {
    const ref = extractCompiledCodeRef({
      compiledCodeRef: VALID_REF,
    });

    expect(ref).toEqual(VALID_REF);
  });

  it('returns undefined when compiledCodeRef is absent', () => {
    const ref = extractCompiledCodeRef({});
    expect(ref).toBeUndefined();
  });

  it('returns undefined when compiledCodeRef shape is invalid', () => {
    const ref = extractCompiledCodeRef({
      compiledCodeRef: {
        sha256: 'abc',
        storageUri: 's3://bucket/compiled/step-a.sql',
        sizeBytes: '123',
      },
    });

    expect(ref).toBeUndefined();
  });

  it('includes compiledCodeRef in StepStarted payload when valid', () => {
    const payload = buildStepStartedPayload(
      makeStep({
        compiledCodeRef: VALID_REF,
      })
    );

    expect(payload).toEqual({
      compiledCodeRef: VALID_REF,
    });
  });

  it('omits StepStarted payload when compiledCodeRef is absent', () => {
    const payload = buildStepStartedPayload(makeStep());
    expect(payload).toBeUndefined();
  });

  it('omits StepStarted payload when compiledCodeRef is malformed', () => {
    const payload = buildStepStartedPayload(
      makeStep({
        compiledCodeRef: {
          sha256: 'a'.repeat(64),
          storageUri: '',
          sizeBytes: 10,
        },
      })
    );

    expect(payload).toBeUndefined();
  });
});

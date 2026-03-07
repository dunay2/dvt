import type { CompiledCodeRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { buildStepStartedPayload } from '../src/workflows/workflowHelpers.js';

type WorkflowStep = Parameters<typeof buildStepStartedPayload>[0];

function makeStep(compiledCodeRef?: unknown): WorkflowStep {
  return {
    stepId: 'step-a',
    kind: 'DBT_MODEL',
    ...(compiledCodeRef === undefined ? {} : { compiledCodeRef }),
  };
}

describe('buildStepStartedPayload', () => {
  const VALID_REF: CompiledCodeRef = {
    sha256: 'a'.repeat(64),
    storageUri: 's3://bucket/compiled/step-a.sql',
    sizeBytes: 123,
    encoding: 'utf-8',
  };

  it('includes compiledCodeRef in payload when present', () => {
    const payload = buildStepStartedPayload(makeStep(VALID_REF));
    expect(payload).toEqual({ compiledCodeRef: VALID_REF });
  });

  it('returns undefined when compiledCodeRef is absent', () => {
    expect(buildStepStartedPayload(makeStep())).toBeUndefined();
  });

  it('throws when compiledCodeRef does not match the canonical contract', () => {
    expect(() =>
      buildStepStartedPayload(
        makeStep({
          sha256: 'not-a-sha256',
          storageUri: 's3://bucket/compiled/step-a.sql',
          sizeBytes: 123,
          encoding: 'utf-8',
        })
      )
    ).toThrowError(new TypeError('INVALID_PLAN_SCHEMA: step_compiledCodeRef_invalid'));
  });
});

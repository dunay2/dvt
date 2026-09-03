import type { CompiledCodeRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildStepStartedPayload,
  extractCompiledCodeRef,
} from '../src/workflows/workflowArtifactHelpers.js';

type WorkflowStep = Parameters<typeof buildStepStartedPayload>[0];

function makeStep(stepTypeConfig?: Record<string, unknown>): WorkflowStep {
  return {
    stepId: 'step-a',
    kind: 'DBT_MODEL',
    ...(stepTypeConfig === undefined ? {} : { stepTypeConfig }),
  };
}

describe('buildStepStartedPayload', () => {
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

  it('includes compiledCodeRef in payload when present', () => {
    const payload = buildStepStartedPayload(
      makeStep({
        compiledCodeRef: VALID_REF,
      })
    );
    expect(payload).toEqual({
      stepArtifactRef: {
        artifactKind: 'compiled-sql',
        ...VALID_REF,
      },
    });
  });

  it('includes compiledCodeRef in payload for any plugin step kind', () => {
    const payload = buildStepStartedPayload({
      stepId: 'step-sql',
      kind: 'SQL_TRANSFORM',
      stepTypeConfig: {
        compiledCodeRef: VALID_REF,
      },
    });

    expect(payload).toEqual({
      stepArtifactRef: {
        artifactKind: 'compiled-sql',
        ...VALID_REF,
      },
    });
  });

  it('ignores unrelated DBT config width when compiledCodeRef itself is valid', () => {
    const ref = extractCompiledCodeRef({
      compiledCodeRef: VALID_REF,
      stepTimeoutMs: -1,
      retries: 'not-a-retry-policy',
      concurrency: {
        maxInFlight: 0,
      },
    });

    expect(ref).toEqual(VALID_REF);
  });

  it('returns undefined when compiledCodeRef is absent', () => {
    expect(buildStepStartedPayload(makeStep())).toBeUndefined();
  });

  it('returns undefined when compiledCodeRef is absent even if unrelated DBT fields are invalid', () => {
    expect(
      extractCompiledCodeRef({
        stepTimeoutMs: -1,
        retries: 'not-a-retry-policy',
      })
    ).toBeUndefined();
  });

  it('returns undefined for step kinds without compiledCodeRef', () => {
    expect(
      buildStepStartedPayload({
        stepId: 'step-object-file-load',
        kind: 'LOAD_OBJECT_FILE_TO_POSTGRES',
        stepTypeConfig: {
          source: 's3://bucket/orders.parquet',
        },
      })
    ).toBeUndefined();
  });

  it('throws when compiledCodeRef does not match the canonical contract', () => {
    expect(() =>
      buildStepStartedPayload(
        makeStep({
          compiledCodeRef: {
            sha256: 'not-a-sha256',
            storageUri: 's3://bucket/compiled/step-a.sql',
            sizeBytes: 123,
            encoding: 'utf-8',
          },
        })
      )
    ).toThrowError(new TypeError('INVALID_PLAN_SCHEMA: step_compiledCodeRef_invalid'));
  });
});

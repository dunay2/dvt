import { describe, expect, it } from 'vitest';

import { parseRunEventRecord, parseRunEventWrite } from '../src/validation.js';

import {
  STEP_STARTED_WITHOUT_PAYLOAD_WRITE_FIXTURE,
  STEP_STARTED_WITH_STEP_ARTIFACT_REF_RECORD_FIXTURE,
  STEP_STARTED_WITH_STEP_ARTIFACT_REF_WRITE_FIXTURE,
  VALID_STEP_ARTIFACT_REF_FIXTURE,
} from './fixtures/run-event-step-artifact-ref.fixtures.js';

describe('contracts: StepStarted generic artifact reference', () => {
  it('accepts the canonical stepArtifactRef payload', () => {
    const parsed = parseRunEventWrite(STEP_STARTED_WITH_STEP_ARTIFACT_REF_WRITE_FIXTURE);

    expect(parsed.eventType).toBe('StepStarted');
    expect(parsed.payload?.['stepArtifactRef']).toEqual(VALID_STEP_ARTIFACT_REF_FIXTURE);
  });

  it('accepts StepStarted without an artifact payload', () => {
    const parsed = parseRunEventWrite(STEP_STARTED_WITHOUT_PAYLOAD_WRITE_FIXTURE);

    expect(parsed.eventType).toBe('StepStarted');
    expect(parsed.payload).toBeUndefined();
  });

  it('accepts persisted StepStarted records with the generic artifact reference', () => {
    const parsed = parseRunEventRecord(STEP_STARTED_WITH_STEP_ARTIFACT_REF_RECORD_FIXTURE);

    expect(parsed.runSeq).toBe(10);
    expect(parsed.payload?.['stepArtifactRef']).toEqual(VALID_STEP_ARTIFACT_REF_FIXTURE);
  });

  it('rejects the retired compiled-code payload shape', () => {
    expect(() =>
      parseRunEventWrite({
        ...STEP_STARTED_WITHOUT_PAYLOAD_WRITE_FIXTURE,
        payload: {
          compiledCodeRef: {
            sha256: 'c'.repeat(64),
            storageUri: 's3://dvt-artifacts/prod/legacy.sql',
            sizeBytes: 128,
            encoding: 'utf-8',
          },
        },
      })
    ).toThrow();
  });
});

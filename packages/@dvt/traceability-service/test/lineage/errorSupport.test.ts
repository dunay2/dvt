import { ArtifactReadError } from '@dvt/artifacts';
import { describe, expect, it } from 'vitest';

import {
  sanitizeLineageErrorForPersistence,
  toLineageErrorLike,
} from '../../src/lineage/errorSupport.js';

describe('lineage error support', () => {
  it('preserves generic artifact error codes without introducing a lineage-owned artifact error hierarchy', () => {
    const error = new ArtifactReadError(
      'ARTIFACT_NOT_FOUND',
      'artifact read failed for token=super-secret'
    );

    expect(toLineageErrorLike(error)).toEqual({
      code: 'ARTIFACT_NOT_FOUND',
      message: 'artifact read failed for token=[REDACTED]',
      name: 'ArtifactReadError',
    });
  });

  it('preserves structured metadata from generic error-like values', () => {
    const error = {
      name: 'ExternalArtifactError',
      code: 'REMOTE_READ_FAILED',
      messageKey: 'artifact.remote.read_failed',
      messageParams: { sourceUri: 's3://bucket/path.sql' },
      message: 'failed token=super-secret',
    };

    expect(toLineageErrorLike(error)).toEqual({
      code: 'REMOTE_READ_FAILED',
      message: 'failed token=[REDACTED]',
      messageKey: 'artifact.remote.read_failed',
      messageParams: { sourceUri: 's3://bucket/path.sql' },
      name: 'ExternalArtifactError',
    });
  });

  it('serializes plain objects instead of persisting default object stringification', () => {
    expect(
      sanitizeLineageErrorForPersistence({
        detail: 'failed to fetch',
        token: 'super-secret',
      })
    ).toBe('{"detail":"failed to fetch","token":"[REDACTED]"}');
  });

  it('returns a stable message for circular objects', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    expect(sanitizeLineageErrorForPersistence(circular)).toBe('[object with circular reference]');
  });
});

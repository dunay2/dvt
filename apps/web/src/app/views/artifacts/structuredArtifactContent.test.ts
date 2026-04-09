import { describe, expect, it } from 'vitest';

import { formatStructuredArtifactContent } from './structuredArtifactContent';

describe('formatStructuredArtifactContent', () => {
  it('serializes structured payloads with stable indentation', () => {
    expect(formatStructuredArtifactContent({ metadata: { dbt_version: '1.7.0' } })).toBe(
      '{\n  "metadata": {\n    "dbt_version": "1.7.0"\n  }\n}'
    );
  });

  it('preserves raw text payloads for viewer reuse', () => {
    expect(formatStructuredArtifactContent('SELECT 1;')).toBe('SELECT 1;');
  });

  it('returns an empty string for undefined payloads instead of crashing', () => {
    expect(formatStructuredArtifactContent(undefined)).toBe('');
  });
});

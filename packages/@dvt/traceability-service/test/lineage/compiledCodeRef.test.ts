import { describe, expect, it } from 'vitest';

import {
  extractCompiledCodeRefFromPayload,
  isCompiledCodeRef,
  sha256HexUtf8,
} from '../../src/lineage/compiledCodeRef.js';

describe('compiledCodeRef guards', () => {
  it('accepts a valid compiledCodeRef payload', () => {
    const sql = 'select 1';
    const sha256 = sha256HexUtf8(sql);
    const payload = {
      compiledCodeRef: {
        sha256,
        storageUri: 's3://bucket/path/file.sql',
        sizeBytes: Buffer.byteLength(sql, 'utf8'),
        encoding: 'utf-8' as const,
      },
    };

    const parsed = extractCompiledCodeRefFromPayload(payload);
    expect(parsed).not.toBeNull();
    expect(isCompiledCodeRef(parsed)).toBe(true);
  });

  it('rejects invalid payload shapes', () => {
    expect(extractCompiledCodeRefFromPayload({})).toBeNull();
    expect(
      extractCompiledCodeRefFromPayload({
        compiledCodeRef: {
          sha256: 'not-a-hash',
          storageUri: 'file:///tmp/a.sql',
          sizeBytes: 1,
        },
      })
    ).toBeNull();
  });
});

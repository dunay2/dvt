import { describe, it, expect } from 'vitest';

import { validateSchemaVersionOrThrow } from '../../src/core/WorkflowEngine.js';

describe('validateSchemaVersionOrThrow', () => {
  it('accepts same minor and v-prefixed', () => {
    expect(() => validateSchemaVersionOrThrow('v1.2')).not.toThrow();
    expect(() => validateSchemaVersionOrThrow('1.2')).not.toThrow();
  });

  it('accepts up to 3 minors back', () => {
    // CURRENT_SCHEMA.minor is 2 — these should be accepted
    expect(() => validateSchemaVersionOrThrow('1.1')).not.toThrow();
    expect(() => validateSchemaVersionOrThrow('1.0')).not.toThrow();
  });

  it('rejects newer minor', () => {
    expect(() => validateSchemaVersionOrThrow('1.999')).toThrow(/TOO_NEW/);
  });

  it('rejects different major', () => {
    expect(() => validateSchemaVersionOrThrow('2.0')).toThrow(/UNSUPPORTED_MAJOR/);
  });

  it('rejects invalid format', () => {
    expect(() => validateSchemaVersionOrThrow('abc')).toThrow(/INVALID/);
  });
});

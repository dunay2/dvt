import { FileSystemCompiledCodeStorage } from '@dvt/artifacts';
import { describe, expect, it } from 'vitest';

describe('FileSystemCompiledCodeStorage', () => {
  it('throws in production', () => {
    const previous = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';

    try {
      expect(() => new FileSystemCompiledCodeStorage({ directory: '.tmp-compiled-code' })).toThrow(
        'file:// storage is prohibited in production'
      );
    } finally {
      process.env['NODE_ENV'] = previous;
    }
  });
});

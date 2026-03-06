import { describe, expect, it } from 'vitest';

import { InMemoryCompiledCodeStorage } from '../../src/compiledCode/adapters/InMemoryCompiledCodeStorage.js';

describe('InMemoryCompiledCodeStorage', () => {
  it('stores uploaded blob by sha256 key', async () => {
    const storage = new InMemoryCompiledCodeStorage();
    const content = Buffer.from('select 1', 'utf-8');

    const uri = await storage.upload('abc123', content);

    expect(uri).toBe('mem://abc123');
    expect(storage.store.get('abc123')?.toString('utf-8')).toBe('select 1');
  });
});

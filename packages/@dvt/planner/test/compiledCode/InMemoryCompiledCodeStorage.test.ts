import { describe, expect, it } from 'vitest';

import { InMemoryCompiledCodeStorage } from '../../src/compiledCode/adapters/InMemoryCompiledCodeStorage.js';

describe('InMemoryCompiledCodeStorage', () => {
  it('stores uploaded blob by sha256 key', async () => {
    const storage = new InMemoryCompiledCodeStorage();
    const content = Buffer.from('select 1', 'utf-8');
    const sha256 = 'abc123';
    const tenantId = 'test-tenant';

    const uri = await storage.upload(tenantId, sha256, content);

    expect(uri).toBe(`mem://${tenantId}/${sha256}`);
    expect(storage.getContent(tenantId, sha256)?.toString('utf-8')).toBe('select 1');
  });
});

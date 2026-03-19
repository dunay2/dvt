import { describe, expect, it } from 'vitest';

import { NoopDuplicateRunProbe } from '../../../src/application/services/NoopDuplicateRunProbe.js';

describe('NoopDuplicateRunProbe', () => {
  it('always returns not_found', async () => {
    const probe = new NoopDuplicateRunProbe();
    await expect(probe.findExisting('tenant-1', 'run-1')).resolves.toEqual({
      kind: 'not_found',
    });
  });
});

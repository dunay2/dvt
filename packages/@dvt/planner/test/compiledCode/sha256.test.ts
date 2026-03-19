import { computeSha256 } from '@dvt/artifacts';
import { describe, expect, it } from 'vitest';

describe('computeSha256', () => {
  it('is deterministic for equal input', () => {
    const sql = Buffer.from('select 1 as one', 'utf-8');
    const a = computeSha256(sql);
    const b = computeSha256(sql);

    expect(a).toBe(b);
  });

  it('matches the known digest for an empty string', () => {
    const digest = computeSha256(Buffer.from('', 'utf-8'));
    expect(digest).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

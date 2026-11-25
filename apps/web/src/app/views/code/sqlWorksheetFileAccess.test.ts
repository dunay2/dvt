import { describe, expect, it, vi } from 'vitest';
import { sha256HexUtf8 } from '@dvt/crypto';
import { readWorksheetFile, saveWorksheetFile, worksheetFilePath } from './sqlWorksheetFileAccess';

const path = 'operations/weekly/orders.sql';
const content = 'select 1 as orders';
const digest = sha256HexUtf8(content);
const file = {
  path,
  content,
  name: 'orders.sql',
  language: 'sql',
  lastModified: '',
  contentSha256: digest,
};

describe('SQL worksheet files', () => {
  it('admits nested SQL files relative to operations and preserves the canonical path', () => {
    expect(worksheetFilePath('weekly/orders.sql')).toBe(path);
    expect(worksheetFilePath(path)).toBe(path);
    for (const invalid of [
      '../orders.sql',
      '/orders.sql',
      'bad.txt',
      'bad%2f.sql',
      'a/../orders.sql',
    ]) {
      expect(worksheetFilePath(invalid)).toBeNull();
    }
  });

  it('accepts only the requested file and verified content', async () => {
    await expect(readWorksheetFile(vi.fn().mockResolvedValue(file), path)).resolves.toEqual(file);
    for (const mismatch of [{ path: 'operations/other.sql' }, { content: 'select 2' }]) {
      await expect(
        readWorksheetFile(vi.fn().mockResolvedValue({ ...file, ...mismatch }), path)
      ).rejects.toThrow();
    }
  });

  it('creates with absent revision and edits using the digest of the file opened', async () => {
    const save = vi.fn().mockResolvedValue({ path, contentSha256: digest });
    await expect(saveWorksheetFile(save, path, content)).resolves.toEqual({ path, digest });
    expect(save).toHaveBeenLastCalledWith({ path, content, expectedRevision: { kind: 'absent' } });
    await saveWorksheetFile(save, path, content, 'prior-revision');
    expect(save).toHaveBeenLastCalledWith({
      path,
      content,
      expectedRevision: { kind: 'content_sha256', value: 'prior-revision' },
    });
  });

  it('refuses a mismatched receipt and propagates a write conflict without retrying', async () => {
    const conflict = new Error('conflict');
    const save = vi
      .fn()
      .mockResolvedValueOnce({ path, contentSha256: 'wrong' })
      .mockRejectedValueOnce(conflict);
    await expect(saveWorksheetFile(save, path, content)).rejects.toThrow();
    await expect(saveWorksheetFile(save, path, content, digest)).rejects.toBe(conflict);
    expect(save).toHaveBeenCalledTimes(2);
  });
});

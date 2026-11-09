// @vitest-environment jsdom
/** Owned concern: reject stale, sensitive and unrelated selections before explicit text commands. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildShellDictionaryLinks,
  copyShellTextSelection,
  readShellTextSelection,
} from './shellTextSelection';

let boundary: HTMLDivElement;
beforeEach(() => {
  boundary = document.createElement('div');
  document.body.appendChild(boundary);
});
afterEach(() => {
  document.getSelection()?.removeAllRanges();
  boundary.remove();
});
function select(text: Element): void {
  const range = document.createRange();
  range.selectNodeContents(text);
  document.getSelection()!.removeAllRanges();
  document.getSelection()!.addRange(range);
}
describe('selected text admission', () => {
  it('copies only the selected input substring and invalidates changed content', async () => {
    // Selecting a substring must not leak the whole form value or copy a stale edited value.
    const input = document.createElement('input');
    input.value = 'before customer after';
    boundary.append(input);
    input.setSelectionRange(7, 15);
    const selection = readShellTextSelection(input, boundary)!;
    expect(selection.text).toBe('customer');
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await copyShellTextSelection(selection, { writeText })).toBe('copied');
    expect(writeText).toHaveBeenCalledExactlyOnceWith('customer');
    input.value = 'different';
    expect(await copyShellTextSelection(selection, { writeText })).toBe('stale');
    expect(writeText).toHaveBeenCalledTimes(1);
  });
  it('keeps textareas copyable and rejects passwords, collapsed ranges and unrelated selection', () => {
    // The shared policy must preserve form selection while never exposing a password action.
    const area = document.createElement('textarea');
    area.value = 'select\nfrom model';
    boundary.append(area);
    area.setSelectionRange(0, 6);
    expect(readShellTextSelection(area, boundary)?.text).toBe('select');
    area.setSelectionRange(0, 0);
    expect(readShellTextSelection(area, boundary)).toBeNull();
    const password = document.createElement('input');
    password.type = 'password';
    password.value = 'secret';
    boundary.append(password);
    password.setSelectionRange(0, 6);
    expect(readShellTextSelection(password, boundary)).toBeNull();
    const selected = document.createElement('span');
    selected.textContent = 'model';
    boundary.append(selected);
    const other = document.createElement('span');
    other.textContent = 'other';
    boundary.append(other);
    select(selected);
    expect(readShellTextSelection(other, boundary)).toBeNull();
    const snapshot = readShellTextSelection(selected, boundary)!;
    selected.remove();
    expect(snapshot.isCurrent()).toBe(false);
  });
  it('reports an unavailable or denied clipboard without an unhandled promise', async () => {
    // Clipboard availability is a real browser capability, never an assumed success path.
    boundary.textContent = 'order';
    select(boundary);
    const snapshot = readShellTextSelection(boundary, boundary)!;
    expect(await copyShellTextSelection(snapshot, undefined)).toBe('failed');
    expect(
      await copyShellTextSelection(snapshot, {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      })
    ).toBe('failed');
  });
});
describe('explicit dictionary lookup', () => {
  it('encodes a bounded term into fixed HTTPS dictionary origins', () => {
    // A term is data, never a navigation URL or executable command.
    const links = buildShellDictionaryLinks('  árbol  ');
    expect(links.map((link) => link.href)).toEqual([
      'https://dle.rae.es/%C3%A1rbol',
      'https://dictionary.cambridge.org/dictionary/english/%C3%A1rbol',
    ]);
  });
  it.each([
    '',
    '  ',
    'select * from table',
    'two words',
    'model\nsecret',
    'https://example.org',
    '<script>',
    'a'.repeat(65),
  ])('offers no bulk or malformed lookup for %j', (text) => {
    // External lookups must not turn selected query/data blocks into implicit disclosure.
    expect(buildShellDictionaryLinks(text)).toEqual([]);
  });
});

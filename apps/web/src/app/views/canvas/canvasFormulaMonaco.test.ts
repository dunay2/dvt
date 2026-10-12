import { describe, expect, it, vi } from 'vitest';
import { configureFormulaEditor } from './canvasFormulaMonaco';

describe('scoped formula completion', () => {
  it('offers only this model’s operands, quotes names and disposes its registration', () => {
    const dispose = vi.fn();
    const model = { getWordUntilPosition: () => ({ startColumn: 1, endColumn: 2 }) };
    const register = vi.fn(() => ({ dispose }));
    const monaco = {
      languages: {
        getLanguages: () => [{ id: 'dvt-formula' }],
        registerCompletionItemProvider: register,
        CompletionItemKind: { Field: 1, Function: 2, Value: 3 },
        CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      },
      editor: { setModelLanguage: vi.fn() },
      Range: class {},
    };
    const cleanup = configureFormulaEditor(
      { getModel: () => model, updateOptions: vi.fn() } as unknown as Parameters<
        typeof configureFormulaEditor
      >[0],
      monaco as unknown as Parameters<typeof configureFormulaEditor>[1],
      [
        { label: 'customer name', text: '"customer name"', detail: 'string', kind: 'field' },
        {
          label: 'EXTRACT YEAR (UTC)',
          text: 'EXTRACT',
          detail: 'UTC year',
          kind: 'function',
          template: "EXTRACT(YEAR FROM {column} AT TIME ZONE 'UTC')",
        },
      ]
    );
    const provider = (
      register.mock.calls as unknown as [
        string,
        {
          provideCompletionItems: (
            target: unknown,
            position: { lineNumber: number }
          ) => { suggestions: { insertText: string }[] };
        },
      ][]
    )[0]![1];
    expect(provider.provideCompletionItems({}, { lineNumber: 1 }).suggestions).toEqual([]);
    expect(
      provider.provideCompletionItems(model, { lineNumber: 1 }).suggestions[0]!.insertText
    ).toBe('"customer name"');
    expect(
      provider.provideCompletionItems(model, { lineNumber: 1 }).suggestions[1]!.insertText
    ).toBe("EXTRACT(YEAR FROM ${1} AT TIME ZONE 'UTC')");
    cleanup();
    expect(dispose).toHaveBeenCalledOnce();
  });
});

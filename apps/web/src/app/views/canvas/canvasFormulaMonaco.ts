/** Scoped editor assistance only. Compilation and write admission remain outside Monaco. */
import type { MonacoCodeEditorMount } from '../../components/monaco/MonacoCodeEditor';
import type { FormulaSuggestion } from './canvasFormulaAssist';

export function configureFormulaEditor(
  editor: Parameters<MonacoCodeEditorMount>[0],
  monaco: Parameters<MonacoCodeEditorMount>[1],
  suggestions: readonly FormulaSuggestion[]
): () => void {
  const language = 'dvt-formula';
  if (!monaco.languages.getLanguages().some((item) => item.id === language)) {
    monaco.languages.register({ id: language });
    monaco.languages.setMonarchTokensProvider(language, {
      tokenizer: {
        root: [
          [/'([^']|'')*'/, 'string'],
          [/"([^"]|"")*"/, 'variable'],
          [/\b(?:true|false|null|cast|as|and|or|is|not|year|from|at|time|zone)\b/i, 'keyword'],
          [/\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/, 'number'],
          [/[A-Za-z_]\w*(?=\s*\()/, 'type.identifier'],
          [/[+*/=<>!-]/, 'operator'],
        ],
      },
    });
    monaco.languages.setLanguageConfiguration(language, {
      brackets: [['(', ')']],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: "'", close: "'" },
        { open: '"', close: '"' },
      ],
    });
  }
  const model = editor.getModel();
  if (model != null) monaco.editor.setModelLanguage(model, language);
  editor.updateOptions({
    minimap: { enabled: false },
    lineNumbers: 'on',
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    tabSize: 2,
    fixedOverflowWidgets: true,
    wordBasedSuggestions: 'off',
  });
  const completion = monaco.languages.registerCompletionItemProvider(language, {
    provideCompletionItems(target, position) {
      if (target !== model) return { suggestions: [] };
      const word = target.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      );
      return {
        suggestions: suggestions.map((item) => ({
          label: item.label,
          detail: item.detail,
          range,
          kind:
            item.kind === 'field'
              ? monaco.languages.CompletionItemKind.Field
              : item.kind === 'function'
                ? monaco.languages.CompletionItemKind.Function
                : monaco.languages.CompletionItemKind.Value,
          insertText:
            item.kind === 'function'
              ? (item.template?.replace('{column}', '${1}') ??
                `${item.text}(${Array.from({ length: item.argumentCount ?? 1 }, (_, index) => `\${${index + 1}}`).join(', ')})`)
              : item.text,
          insertTextRules:
            item.kind === 'function'
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
        })),
      };
    },
  });
  return () => completion.dispose();
}

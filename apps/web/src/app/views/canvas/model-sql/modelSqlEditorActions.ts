/** Scope Monaco completion and execution to this Model's SQL document. */
import type { ModelSqlInput } from '@dvt/contracts';
import type { MonacoCodeEditorMount } from '../../../components/monaco/MonacoCodeEditor';

export const quoteModelSqlIdentifier = (name: string) => `"${name.replaceAll('"', '""')}"`;
export function installModelSqlEditorActions(
  editor: Parameters<MonacoCodeEditorMount>[0],
  monaco: Parameters<MonacoCodeEditorMount>[1],
  inputs: () => readonly ModelSqlInput[],
  execute: () => void,
  label: string
) {
  const uri = editor.getModel()?.uri.toString();
  const action = editor.addAction({
    id: 'dvt.modelSql.execute',
    label,
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
    run: execute,
  });
  const completion = monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      if (model.uri.toString() !== uri) return { suggestions: [] };
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: inputs().flatMap((input) => [
          {
            label: input.sqlName,
            insertText: quoteModelSqlIdentifier(input.sqlName),
            kind: monaco.languages.CompletionItemKind.Module,
            detail: input.name,
            range,
          },
          ...input.columns.map((column) => ({
            label: `${input.sqlName}.${column.name}`,
            insertText: `${quoteModelSqlIdentifier(input.sqlName)}.${quoteModelSqlIdentifier(column.name)}`,
            kind: monaco.languages.CompletionItemKind.Field,
            detail: column.dataType ?? undefined,
            range,
          })),
        ]),
      };
    },
  });
  return {
    dispose: () => {
      action.dispose();
      completion.dispose();
    },
  };
}

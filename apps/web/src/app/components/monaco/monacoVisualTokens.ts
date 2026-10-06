/**
 * Owned concern: own Monaco visual tokens, theme, and editor option presets.
 * @baseline GH-3578: SQL literals must retain AA contrast in the shared dark surfaces.
 * @decision Inherit Monaco's palette and reuse its generic string color for SQL strings.
 * @consequence Code and Diff register one theme before mounting; lazy loading stays intact.
 * @version 1.0.0
 */
import type { editor } from 'monaco-editor';

type CreateMonacoCodeOptionsInput = Readonly<{
  ariaLabel: string;
  readOnly: boolean;
}>;

type CreateMonacoDiffOptionsInput = Readonly<{
  ariaLabel: string;
}>;

export const monacoVisualClasses = {
  surface:
    'h-[420px] overflow-hidden rounded border border-[color:var(--border-default)] bg-[var(--surface-app)]',
  fallback: 'flex items-center justify-center text-sm text-[var(--text-muted)]',
} as const;

export const monacoTheme = 'dvt-dark' as const;

export function configureMonacoVisualTheme(
  monaco: Readonly<{ editor: Pick<typeof editor, 'defineTheme'> }>
): void {
  monaco.editor.defineTheme(monacoTheme, {
    base: 'vs-dark',
    inherit: true,
    rules: [{ token: 'string.sql', foreground: 'CE9178' }],
    colors: {},
  });
}

export function createMonacoCodeOptions({ ariaLabel, readOnly }: CreateMonacoCodeOptionsInput) {
  return {
    ariaLabel,
    automaticLayout: true,
    codeLens: false,
    contextmenu: !readOnly,
    editContext: false,
    folding: true,
    glyphMargin: false,
    lineNumbersMinChars: 3,
    minimap: { enabled: false },
    domReadOnly: readOnly,
    readOnly,
    renderLineHighlight: readOnly ? 'none' : 'line',
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    wordWrap: 'on',
  } as const;
}

export function createMonacoDiffOptions({ ariaLabel }: CreateMonacoDiffOptionsInput) {
  return {
    ariaLabel,
    automaticLayout: true,
    codeLens: false,
    contextmenu: false,
    diffCodeLens: false,
    glyphMargin: false,
    minimap: { enabled: false },
    originalEditable: false,
    readOnly: true,
    renderSideBySide: true,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    wordWrap: 'on',
  } as const;
}

/** Owned concern: own Monaco visual tokens, theme, and editor option presets. */

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

export const monacoTheme = 'vs-dark' as const;

export function createMonacoCodeOptions({ ariaLabel, readOnly }: CreateMonacoCodeOptionsInput) {
  return {
    ariaLabel,
    automaticLayout: true,
    codeLens: false,
    contextmenu: !readOnly,
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

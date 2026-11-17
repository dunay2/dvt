/**
 * Owned concern: own Monaco visual tokens, theme, and editor option presets.
 * @baseline GH-3578: SQL tokens must remain readable during occurrence highlighting.
 * @decision Reuse string color and mark occurrences with a dark fill and visible border.
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
  flexFill: 'h-auto min-h-0 flex-1',
  fallback: 'flex items-center justify-center text-sm text-[var(--text-muted)]',
} as const;

export const monacoTheme = 'dvt-dark' as const;

/** Monaco accepts numeric pixels; the scale itself stays owned by common CSS tokens. */
function commonMonacoTypography() {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return {};
  const style = getComputedStyle(document.documentElement);
  const rootSize = Number.parseFloat(style.fontSize);
  const pixels = (name: string) => {
    const value = style.getPropertyValue(name).trim();
    const match = /^(\d+(?:\.\d+)?)(px|rem)$/.exec(value);
    if (match == null) return undefined;
    const size = Number(match[1]) * (match[2] === 'rem' ? rootSize : 1);
    return Number.isFinite(size) && size > 0 ? size : undefined;
  };
  const fontFamily = style.getPropertyValue('--font-mono').trim();
  const fontSize = pixels('--text-mono');
  const lineHeight = pixels('--text-mono-line-height');
  return {
    ...(fontFamily ? { fontFamily } : {}),
    ...(fontSize == null ? {} : { fontSize }),
    ...(lineHeight == null ? {} : { lineHeight }),
  };
}

export function configureMonacoVisualTheme(
  monaco: Readonly<{ editor: Pick<typeof editor, 'defineTheme'> }>
): void {
  monaco.editor.defineTheme(monacoTheme, {
    base: 'vs-dark',
    inherit: true,
    rules: [{ token: 'string.sql', foreground: 'CE9178' }],
    colors: {
      'editor.wordHighlightBackground': '#00000040',
      'editor.wordHighlightBorder': '#707070',
    },
  });
}

export function createMonacoCodeOptions({ ariaLabel, readOnly }: CreateMonacoCodeOptionsInput) {
  return {
    ...commonMonacoTypography(),
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
    ...commonMonacoTypography(),
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

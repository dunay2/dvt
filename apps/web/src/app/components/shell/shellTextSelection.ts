/** Owned concern: admit a transient text selection and its explicit clipboard/dictionary actions. */
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';

export type ShellTextSelection = Readonly<{
  text: string;
  isCurrent: () => boolean;
  restore: () => void;
}>;

/** Read only the selection at this React-owned gesture target, including portals. */
export function readShellTextSelection(
  target: EventTarget | null,
  boundary: HTMLElement
): ShellTextSelection | null {
  const element = target instanceof boundary.ownerDocument.defaultView!.Element ? target : null;
  if (element == null || element.closest('.monaco-editor, input[type="password"]') != null)
    return null;
  const control = element.closest<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  if (control != null) {
    const { selectionStart: start, selectionEnd: end, value } = control;
    if (start == null || end == null || start === end) return null;
    const text = value.slice(start, end);
    if (!text.trim()) return null;
    return {
      text,
      isCurrent: () =>
        boundary.isConnected &&
        control.isConnected &&
        control.value === value &&
        control.selectionStart === start &&
        control.selectionEnd === end,
      restore: () => {
        if (control.isConnected && control.value === value) control.setSelectionRange(start, end);
      },
    };
  }
  const selection = boundary.ownerDocument.getSelection();
  if (selection == null || selection.isCollapsed || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0).cloneRange();
  const text = range.toString();
  if (!text.trim() || !range.intersectsNode(element)) return null;
  return {
    text,
    isCurrent: () =>
      boundary.isConnected &&
      element.isConnected &&
      range.commonAncestorContainer.isConnected &&
      range.toString() === text,
    restore: () => {
      if (!element.isConnected || range.toString() !== text) return;
      const current = boundary.ownerDocument.getSelection();
      current?.removeAllRanges();
      current?.addRange(range.cloneRange());
    },
  };
}

/** Lookup is deliberately limited to a term, never a selected SQL statement or bulk data. */
export function buildShellDictionaryLinks(
  text: string
): readonly Readonly<{ id: string; href: string; label: string }>[] {
  const term = text.trim();
  if (term.length > 64 || !/^[\p{L}\p{M}]+(?:[-'’][\p{L}\p{M}]+)*$/u.test(term)) return [];
  const encoded = encodeURIComponent(term);
  return [
    { id: 'rae', label: 'RAE', href: `https://dle.rae.es/${encoded}` },
    {
      id: 'cambridge',
      label: 'Cambridge',
      href: `https://dictionary.cambridge.org/dictionary/english/${encoded}`,
    },
  ];
}

export async function copyShellTextSelection(
  selection: ShellTextSelection,
  clipboard: Pick<Clipboard, 'writeText'> | undefined
): Promise<'copied' | 'failed' | 'stale'> {
  if (!selection.isCurrent()) return 'stale';
  if (clipboard == null) return 'failed';
  try {
    await clipboard.writeText(selection.text);
    return selection.isCurrent() ? 'copied' : 'stale';
  } catch {
    return 'failed';
  }
}

const textSelectionCopy = {
  en: {
    label: 'Selected text',
    copy: 'Copy',
    dictionary: 'Dictionary',
    copied: 'Copied',
    failed: 'Could not copy. Use Ctrl/Cmd+C.',
    stale: 'Select the text again.',
  },
  es: {
    label: 'Texto seleccionado',
    copy: 'Copiar',
    dictionary: 'Diccionario',
    copied: 'Copiado',
    failed: 'No se pudo copiar. Usa Ctrl/Cmd+C.',
    stale: 'Vuelve a seleccionar el texto.',
  },
} as const;

export function resolveShellTextSelectionCopy(language: ApplicationLanguage) {
  return textSelectionCopy[language];
}

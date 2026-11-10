/**
 * Owned concern: present selected-text actions and their menu keyboard semantics.
 * @baseline The selection boundary owns snapshots, permissions and action feedback.
 * @decision Keep view navigation here; dispatch every activation through the same item click.
 * @consequence Space activates links without scrolling or bypassing stale-selection checks.
 * @version 1.0.0
 */
import { BookOpen, Copy } from 'lucide-react';
import type { ComponentProps, KeyboardEvent, MouseEvent } from 'react';
import { PopoverContent } from '../ui/popover';
import {
  buildShellDictionaryLinks,
  type copyShellTextSelection,
  type resolveShellTextSelectionCopy,
} from './shellTextSelection';
import styles from './ShellTextSelectionBoundary.module.css';

type MenuProps = Readonly<{
  text: string;
  copy: ReturnType<typeof resolveShellTextSelectionCopy>;
  feedback: Awaited<ReturnType<typeof copyShellTextSelection>> | null;
  onCopy: () => void;
  onLookup: (event: MouseEvent<HTMLAnchorElement>) => void;
}> &
  Pick<ComponentProps<typeof PopoverContent>, 'onOpenAutoFocus' | 'onCloseAutoFocus'>;

function navigateMenu(event: KeyboardEvent<HTMLDivElement>): void {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  const current = items.indexOf(event.currentTarget.ownerDocument.activeElement as HTMLElement);
  if (event.key === 'Enter' || event.key === ' ') {
    const item = (event.target as Element).closest<HTMLElement>('[role="menuitem"]');
    if (item == null || !event.currentTarget.contains(item)) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) item.click();
    return;
  }
  let index: number | null = null;
  switch (event.key) {
    case 'Home':
      index = 0;
      break;
    case 'End':
      index = items.length - 1;
      break;
    case 'ArrowDown':
      index = (current + 1) % items.length;
      break;
    case 'ArrowUp':
      index = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
      break;
  }
  if (index != null) {
    event.preventDefault();
    event.stopPropagation();
    items[index]?.focus();
  }
}

/** Render existing actions without acquiring selection, clipboard or graph state. */
export function ShellTextSelectionMenu({
  text,
  copy,
  feedback,
  onCopy,
  onLookup,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: MenuProps) {
  return (
    <PopoverContent
      role="menu"
      aria-label={copy.label}
      data-slot="shell-text-selection-menu"
      className={styles.menu}
      align="start"
      sideOffset={0}
      onOpenAutoFocus={onOpenAutoFocus}
      onCloseAutoFocus={onCloseAutoFocus}
      onKeyDown={navigateMenu}
    >
      <button role="menuitem" tabIndex={-1} className={styles.item} onClick={onCopy}>
        <Copy aria-hidden="true" className={styles.icon} />
        {copy.copy}
      </button>
      {buildShellDictionaryLinks(text).map((link) => (
        <a
          role="menuitem"
          tabIndex={-1}
          key={link.id}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.item}
          onClick={onLookup}
        >
          <BookOpen aria-hidden="true" className={styles.icon} />
          {copy.dictionary} · {link.label}
        </a>
      ))}
      {feedback == null ? null : (
        <p role="status" className={styles.feedback}>
          {copy[feedback]}
        </p>
      )}
    </PopoverContent>
  );
}

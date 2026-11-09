/** Owned concern: arbitrate shell selected-text intent without replacing local target menus. */
import {
  cloneElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { BookOpen, Copy } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '../ui/popover';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import {
  buildShellDictionaryLinks,
  copyShellTextSelection,
  readShellTextSelection,
  resolveShellTextSelectionCopy,
  type ShellTextSelection,
} from './shellTextSelection';
import styles from './ShellTextSelectionBoundary.module.css';

type SelectionRequest = Readonly<{
  selection: ShellTextSelection;
  opener: HTMLElement;
  x: number;
  y: number;
  feedback: 'copied' | 'failed' | 'stale' | null;
}>;

/** Capture only an accepted text context gesture; ordinary selection and local menus stay native to their owners. */
export function ShellTextSelectionBoundary({
  children,
}: Readonly<{ children: ReactElement<HTMLAttributes<HTMLElement>> }>) {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveShellTextSelectionCopy(language);
  const [request, setRequest] = useState<SelectionRequest | null>(null);
  const lifetime = useRef<SelectionRequest | null>(null);
  useEffect(
    () => () => {
      lifetime.current = null;
    },
    []
  );
  const virtualAnchor = useMemo(
    () => ({
      current: {
        getBoundingClientRect: () => new DOMRect(request?.x ?? 0, request?.y ?? 0, 0, 0),
      },
    }),
    [request?.x, request?.y]
  );

  const open = (target: EventTarget | null, boundary: HTMLElement, x: number, y: number) => {
    if (
      target instanceof boundary.ownerDocument.defaultView!.Element &&
      target.closest('[data-slot="shell-text-selection-menu"]')
    )
      return false;
    const selection = readShellTextSelection(target, boundary);
    if (selection == null) return false;
    const element = target as HTMLElement;
    const opener =
      element.closest<HTMLElement>('button, input, textarea, a[href], [tabindex]') ?? boundary;
    const next = { selection, opener, x, y, feedback: null };
    lifetime.current = next;
    setRequest(next);
    return true;
  };
  const navigateMenu = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const current = items.indexOf(event.currentTarget.ownerDocument.activeElement as HTMLElement);
    const index =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (current + 1) % items.length
            : event.key === 'ArrowUp'
              ? (current - 1 + items.length) % items.length
              : null;
    if (index != null) {
      event.preventDefault();
      event.stopPropagation();
      items[index]?.focus();
    }
  };
  return (
    <Popover
      open={request != null}
      onOpenChange={(openState) => {
        if (!openState) setRequest(null);
      }}
    >
      {cloneElement(children, {
        onContextMenuCapture: (event) => {
          if (open(event.target, event.currentTarget, event.clientX, event.clientY)) {
            event.preventDefault();
            event.stopPropagation();
          } else children.props.onContextMenuCapture?.(event);
        },
        onKeyDownCapture: (event) => {
          const context =
            !event.repeat &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey));
          if (!context) {
            children.props.onKeyDownCapture?.(event);
            return;
          }
          const box = (event.target as HTMLElement).getBoundingClientRect();
          if (open(event.target, event.currentTarget, box.left, box.bottom)) {
            event.preventDefault();
            event.stopPropagation();
          } else children.props.onKeyDownCapture?.(event);
        },
      })}
      <PopoverAnchor virtualRef={virtualAnchor} />
      {request == null ? null : (
        <PopoverContent
          role="menu"
          aria-label={copy.label}
          data-slot="shell-text-selection-menu"
          className={styles.menu}
          align="start"
          sideOffset={0}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)
              ?.querySelector<HTMLElement>('[role="menuitem"]')
              ?.focus();
            request.selection.restore();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (lifetime.current?.selection === request.selection && request.opener.isConnected) {
              request.opener.focus({ preventScroll: true });
              request.selection.restore();
            }
          }}
          onKeyDown={navigateMenu}
        >
          <button
            role="menuitem"
            tabIndex={-1}
            className={styles.item}
            onClick={() => {
              void copyShellTextSelection(request.selection, navigator.clipboard).then(
                (feedback) => {
                  setRequest((current) =>
                    current?.selection === request.selection ? { ...current, feedback } : current
                  );
                }
              );
            }}
          >
            <Copy aria-hidden="true" className={styles.icon} />
            {copy.copy}
          </button>
          {buildShellDictionaryLinks(request.selection.text).map((link) => (
            <a
              role="menuitem"
              tabIndex={-1}
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.item}
              onClick={(event) => {
                if (!request.selection.isCurrent()) {
                  event.preventDefault();
                  setRequest({ ...request, feedback: 'stale' });
                } else setRequest(null);
              }}
            >
              <BookOpen aria-hidden="true" className={styles.icon} />
              {copy.dictionary} · {link.label}
            </a>
          ))}
          {request.feedback == null ? null : (
            <p role="status" className={styles.feedback}>
              {copy[request.feedback]}
            </p>
          )}
        </PopoverContent>
      )}
    </Popover>
  );
}

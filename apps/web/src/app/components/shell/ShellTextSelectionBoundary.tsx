/**
 * Owned concern: arbitrate shell selected-text intent without replacing local target menus.
 * @baseline Canvas and editor menus retain their own admission and actions.
 * @decision Own the selected snapshot and action lifetime; delegate passive menu presentation.
 * @consequence A stale selection cannot acquire clipboard or dictionary authority.
 * @version 1.1.0
 */
import {
  cloneElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
} from 'react';
import { Popover, PopoverAnchor } from '../ui/popover';
import { ShellTextSelectionMenu } from './ShellTextSelectionMenu';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import {
  copyShellTextSelection,
  readShellTextSelection,
  resolveShellTextSelectionCopy,
  type ShellTextSelection,
} from './shellTextSelection';

type SelectionRequest = Readonly<{
  selection: ShellTextSelection;
  opener: HTMLElement;
  x: number;
  y: number;
  feedback: Awaited<ReturnType<typeof copyShellTextSelection>> | null;
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
        <ShellTextSelectionMenu
          text={request.selection.text}
          copy={copy}
          feedback={request.feedback}
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
          onCopy={() => {
            void copyShellTextSelection(request.selection, navigator.clipboard).then((feedback) => {
              setRequest((current) =>
                current?.selection === request.selection ? { ...current, feedback } : current
              );
            });
          }}
          onLookup={(event) => {
            if (!request.selection.isCurrent()) {
              event.preventDefault();
              setRequest({ ...request, feedback: 'stale' });
            } else setRequest(null);
          }}
        />
      )}
    </Popover>
  );
}

/**
 * Owned concern: coordinate Raven navigation and the About dialog without owning route policy.
 * @baseline GH-3622: global navigation does not belong to Project or View.
 * @decision Reuse Router navigation and the existing shell navigation read model.
 * @consequence Pending-edit guards remain authoritative; menus only transfer focus and intent.
 * @version 1.0.0
 */
import { useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { ShellNavigationModel } from '../../shell/shellNavigationModel';

import AppBrandMark from '../AppBrandMark';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import type { ShellTopBarCopy } from './copy';
import { resolveCompiledApplicationMetadata } from './appBuildMetadata';
import { ShellNavigationEntriesTemplate } from './ShellMenu.templates';
import { topAppBarClasses } from './chrome';

type ShellAppMenuProps = Readonly<{
  copy: ShellTopBarCopy;
  navigationModel: ShellNavigationModel;
  showNavigation: boolean;
}>;

export function ShellAppMenu({
  copy,
  navigationModel,
  showNavigation,
}: ShellAppMenuProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const metadata = resolveCompiledApplicationMetadata();
  const navigate = useNavigate();
  const transferFocusRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function navigateTo(to: string) {
    transferFocusRef.current = true;
    setMenuOpen(false);
    void navigate(to, { flushSync: true });
  }

  return (
    <>
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            data-slot="shell-app-menu-trigger"
            aria-label="Raven"
            className={topAppBarClasses.appMenuButton}
          >
            <AppBrandMark className="size-6 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={topAppBarClasses.applicationMenuContent}
          onCloseAutoFocus={(event) => {
            if (!transferFocusRef.current) return;
            event.preventDefault();
            transferFocusRef.current = false;
          }}
        >
          {showNavigation ? (
            <ShellNavigationEntriesTemplate
              navigationModel={navigationModel}
              label={copy.globalNavigation}
              onNavigate={navigateTo}
            />
          ) : null}
          <DropdownMenuItem
            data-slot="shell-about-command"
            onSelect={(event) => {
              event.preventDefault();
              transferFocusRef.current = true;
              setMenuOpen(false);
              setAboutOpen(true);
            }}
          >
            <Info className="mr-2 size-4" />
            {copy.aboutCommand}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent
          data-slot="shell-about-dialog"
          className="border-[var(--border-default)]"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{copy.aboutTitle}</DialogTitle>
            <DialogDescription>{copy.aboutDescription}</DialogDescription>
          </DialogHeader>
          <dl className="grid gap-3 text-sm">
            <div className="grid grid-cols-[9rem_1fr] gap-3">
              <dt className="text-[var(--text-subtle)]">{copy.aboutVersionLabel}</dt>
              <dd className="font-mono text-[var(--text-strong)]">{metadata.version}</dd>
            </div>
            <div className="grid grid-cols-[9rem_1fr] gap-3">
              <dt className="text-[var(--text-subtle)]">{copy.aboutBuildDateLabel}</dt>
              <dd className="font-mono text-[var(--text-strong)]">
                {metadata.buildDate ?? copy.aboutBuildDateUnavailable}
              </dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}

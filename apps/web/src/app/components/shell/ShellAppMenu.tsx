/** Owned concern: render Raven application-level shell commands and about metadata. */
import { useState } from 'react';
import { Info } from 'lucide-react';

import AppBrandMark from '../AppBrandMark';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { topAppBarClasses } from './chrome';
import type { ShellTopBarCopy } from './copy';
import { resolveCompiledApplicationMetadata } from './appBuildMetadata';

type ShellAppMenuProps = Readonly<{
  copy: ShellTopBarCopy;
}>;

export function ShellAppMenu({ copy }: ShellAppMenuProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const metadata = resolveCompiledApplicationMetadata();

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-slot="shell-app-menu-trigger"
            className="mr-1 flex h-8 shrink-0 items-center gap-2 rounded-md px-1.5 text-[var(--text-default)] hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <AppBrandMark className="size-6 shrink-0" />
            <span className={topAppBarClasses.brand}>Raven</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem
            data-slot="shell-about-command"
            onSelect={(event) => {
              event.preventDefault();
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
        <DialogContent data-slot="shell-about-dialog" className="border-[var(--border-default)]">
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

/** Owned concern: present compiled browser metadata and return focus to the direct About trigger. */
import { useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import { resolveCompiledApplicationMetadata } from './appBuildMetadata';
import type { ShellTopBarCopy } from './copy';
import styles from './ShellAbout.module.css';
import railStyles from '../LeftNavigation.module.css';

export function ShellAbout({ copy }: Readonly<{ copy: ShellTopBarCopy }>) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const metadata = resolveCompiledApplicationMetadata();
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={trigger}
            type="button"
            data-slot="shell-about-command"
            aria-label={copy.aboutCommand}
            className={cn(railStyles.link, railStyles.linkInteractive)}
            onClick={() => setOpen(true)}
          >
            <Info aria-hidden="true" className={railStyles.icon} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{copy.aboutCommand}</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          data-slot="shell-about-dialog"
          className={styles.aboutDialog}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{copy.aboutTitle}</DialogTitle>
            <DialogDescription>{copy.aboutDescription}</DialogDescription>
          </DialogHeader>
          <dl className={styles.aboutMetadata}>
            <div className={styles.aboutMetadataRow}>
              <dt className={styles.aboutLabel}>{copy.aboutVersionLabel}</dt>
              <dd className={styles.aboutValue}>{metadata.version}</dd>
            </div>
            <div className={styles.aboutMetadataRow}>
              <dt className={styles.aboutLabel}>{copy.aboutBuildDateLabel}</dt>
              <dd className={styles.aboutValue}>
                {metadata.buildDate ?? copy.aboutBuildDateUnavailable}
              </dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}

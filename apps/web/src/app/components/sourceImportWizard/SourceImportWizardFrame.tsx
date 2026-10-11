/**
 * Owned concern: render the inline Add Sources workspace without owning import workflow state.
 * @baseline GH-3610: registration does not place a Canvas card.
 * @decision Reuse dialog focus semantics without a portal, backdrop or movable frame.
 * @consequence The surrounding explorer remains accessible and Canvas stays mounted.
 * @version 1.0.0
 */
import type { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { Content as DialogContent, Close as DialogClose } from '@radix-ui/react-dialog';

import { Button } from '../ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { useSourceImportLocalization } from './copy';
import styles from './SourceImportWorkspace.module.css';

type SourceImportWizardFooterProps = Readonly<{
  isResultStep: boolean;
  isProcessing: boolean;
  canImport: boolean;
  selectedCount?: number;
  onClose: () => void;
  onDone: () => void;
  onImport: () => void;
}>;

export function SourceImportWizardFooter({
  isResultStep,
  isProcessing,
  canImport,
  selectedCount = 0,
  onClose,
  onDone,
  onImport,
}: SourceImportWizardFooterProps): JSX.Element {
  const { copy } = useSourceImportLocalization();

  if (isResultStep) {
    return (
      <Button onClick={onDone} className={styles.primaryAction}>
        {copy.footer.doneAction}
      </Button>
    );
  }

  return (
    <div className={styles.footerActions}>
      <span className={styles.selectionCount}>
        {copy.selection.descriptionPrefix} {selectedCount}
      </span>
      <Button variant="outline" onClick={onClose}>
        {copy.footer.cancelAction}
      </Button>
      <Button onClick={onImport} disabled={!canImport} className={styles.primaryAction}>
        {isProcessing ? (
          <>
            <Loader2 className={styles.spinner} aria-hidden="true" />
            {copy.footer.attachingAction}
          </>
        ) : (
          copy.footer.attachAction.replace('{count}', String(selectedCount))
        )}
      </Button>
    </div>
  );
}

type SourceImportWizardFrameProps = Readonly<{
  open: boolean;
  activeContentId: string;
  isResultStep: boolean;
  isProcessing: boolean;
  canImport: boolean;
  selectedCount?: number;
  preventCloseOnEscape?: boolean;
  sections: ReactNode;
  children: ReactNode;
  onClose: () => void;
  onRestoreFocus?: () => void;
  onDone: () => void;
  onImport: () => void;
}>;

export function SourceImportWizardFrame({
  open,
  activeContentId,
  isResultStep,
  isProcessing,
  canImport,
  selectedCount,
  preventCloseOnEscape = false,
  sections,
  children,
  onClose,
  onRestoreFocus,
  onDone,
  onImport,
}: SourceImportWizardFrameProps): JSX.Element {
  const { copy } = useSourceImportLocalization();

  return (
    <Dialog
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        data-slot="source-import-workspace"
        className={styles.workspace}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (preventCloseOnEscape) {
            event.preventDefault();
          }
        }}
        onCloseAutoFocus={(event) => {
          if (onRestoreFocus) {
            event.preventDefault();
            onRestoreFocus();
          }
        }}
      >
        <DialogHeader className={styles.header}>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <DialogClose
          className={styles.close}
          aria-label={copy.closeAction}
          title={copy.closeAction}
        >
          <X aria-hidden="true" />
        </DialogClose>

        {isResultStep ? null : <div className={styles.sections}>{sections}</div>}

        <ScrollArea
          key={activeContentId}
          type="always"
          data-slot="source-import-wizard-content-scroll"
          data-overflow-affordance="always"
          className={styles.contentScroll}
        >
          <div className={styles.content}>{children}</div>
        </ScrollArea>

        <DialogFooter className={styles.footer}>
          <SourceImportWizardFooter
            isResultStep={isResultStep}
            isProcessing={isProcessing}
            canImport={canImport}
            selectedCount={selectedCount}
            onClose={onClose}
            onDone={onDone}
            onImport={onImport}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

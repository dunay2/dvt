/** Owned concern: present the file-creation state without commands, transport or locale decisions. */
import { useEffect, useId, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog';
import type { resolveCodeFileCreationCopy } from './codeViewCopy';
import type { WorkspaceFileCreationController } from './useWorkspaceFileCreation';
import styles from './WorkspaceFileExplorer.module.css';

export function FileCreationDialog({
  controller,
  copy,
  onReturnFocus,
}: Readonly<{
  controller: WorkspaceFileCreationController;
  copy: ReturnType<typeof resolveCodeFileCreationCopy>;
  onReturnFocus: () => void;
}>) {
  const pathId = useId();
  const contentId = useId();
  const { state, submit } = controller;
  const form = useRef<HTMLFormElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const active = state.kind !== 'closed';
  const editing = state.kind === 'editing';
  const unconfirmed = state.kind === 'unconfirmed';
  const error = active && 'error' in state ? state.error : undefined;
  const pending =
    state.kind === 'reading' ||
    state.kind === 'saving' ||
    (state.kind === 'published' && !state.error);
  const closingBlocked = state.kind === 'saving' || (state.kind === 'published' && !state.error);
  useEffect(() => {
    const pathInput = form.current?.elements.namedItem('path');
    if (editing && pathInput instanceof HTMLInputElement) pathInput.focus();
    else if (unconfirmed) closeButton.current?.focus();
  }, [editing, unconfirmed]);
  return (
    <Dialog
      open={active}
      onOpenChange={(open) => {
        if (!open) controller.close();
      }}
    >
      <DialogContent
        className={styles.dialog}
        closeLabel={copy.close}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <DialogTitle className={styles.title}>{copy.title}</DialogTitle>
        <DialogDescription className={styles.description}>{copy.description}</DialogDescription>
        {active && (
          <form
            ref={form}
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label htmlFor={pathId}>{copy.path}</label>
            <Input
              id={pathId}
              name="path"
              value={state.draft.path}
              disabled={!editing}
              onChange={(event) => controller.edit('path', event.target.value)}
            />
            <label htmlFor={contentId}>{copy.content}</label>
            <Textarea
              id={contentId}
              className={styles.content}
              value={state.draft.content}
              disabled={!editing}
              onChange={(event) => controller.edit('content', event.target.value)}
            />
            {error && (
              <p role="alert" className={styles.error}>
                {copy[error]}
              </p>
            )}
            {pending && (
              <p role="status">
                {state.kind === 'reading'
                  ? copy.reading
                  : state.kind === 'saving'
                    ? copy.saving
                    : copy.refreshing}
              </p>
            )}
            <div className={styles.footer}>
              <Button
                ref={closeButton}
                type="button"
                variant="ghost"
                disabled={closingBlocked}
                onClick={controller.close}
              >
                {unconfirmed ? copy.close : copy.cancel}
              </Button>
              {!unconfirmed && (
                <Button
                  type="submit"
                  disabled={pending || error === 'invalidText' || error === 'importTooLarge'}
                >
                  {state.kind === 'published' ? copy.retry : copy.create}
                </Button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

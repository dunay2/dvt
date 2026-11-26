/** Project worksheet navigation uses the documents and commands of the active project. */
import { CanvasHumanNameV1Schema } from '@dvt/contracts';
import { PanelsTopLeft, Plus } from 'lucide-react';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import type { CanvasShellCanvasCommands } from '../canvasShell.types';
import type { ProjectCanvasDocument } from '../canvasProjectCanvasLifecycle';
import { CanvasExplorerSection } from './CanvasExplorerCatalog.templates';
import type { CanvasExplorerCopy } from './CanvasExplorer.types';
import styles from './CanvasExplorer.module.css';

type Documents = CanvasShellCanvasCommands &
  Readonly<{
    activeId: string;
    documents: readonly ProjectCanvasDocument[];
  }>;

export const CanvasExplorerDocumentsContext = createContext<Documents | null>(null);

export function CanvasExplorerCatalogPanel({
  children,
  copy,
}: Readonly<{ children: ReactNode; copy: CanvasExplorerCopy }>) {
  return (
    <div className={styles.listPanel}>
      {children}
      <CanvasExplorerDocuments copy={copy} />
    </div>
  );
}

export function CanvasExplorerDocuments({ copy }: Readonly<{ copy: CanvasExplorerCopy }>) {
  const workspace = useContext(CanvasExplorerDocumentsContext);
  if (workspace == null) return null;
  return <DocumentList key={workspace.activeId} workspace={workspace} copy={copy} />;
}

function DocumentList({
  workspace,
  copy,
}: Readonly<{ workspace: Documents; copy: CanvasExplorerCopy }>) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  return (
    <CanvasExplorerSection
      title={copy.canvases}
      slot="canvas-explorer-canvases"
      count={workspace.documents.length}
      countSlot="canvas-explorer-canvas-count"
      open={open}
      onOpenChange={setOpen}
      action={
        <button
          type="button"
          className={styles.headerAction}
          disabled={!workspace.onAddCanvas}
          data-slot="canvas-explorer-add-canvas"
          aria-label={copy.addCanvas}
          title={copy.addCanvas}
          onClick={() => {
            setOpen(true);
            setEditing(true);
          }}
        >
          <Plus aria-hidden="true" />
        </button>
      }
    >
      {editing && (
        <CanvasNameForm
          copy={copy}
          onAdd={workspace.onAddCanvas}
          onCancel={() => setEditing(false)}
        />
      )}
      <ul className={styles.list}>
        {workspace.documents.map((doc) => (
          <li key={doc.id} className={styles.itemRow} data-selected={doc.id === workspace.activeId}>
            <button
              className={styles.item}
              type="button"
              aria-current={doc.id === workspace.activeId || undefined}
              disabled={!workspace.onSelectCanvas}
              onClick={() => {
                if (doc.id !== workspace.activeId) workspace.onSelectCanvas?.(doc.id);
              }}
            >
              <span className={styles.modelIcon}>
                <PanelsTopLeft aria-hidden="true" />
              </span>
              <span className={styles.name}>{doc.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </CanvasExplorerSection>
  );
}

function focusName(form: HTMLFormElement | null) {
  form?.querySelector('input')?.focus();
}

function CanvasNameForm({
  copy,
  onAdd,
  onCancel,
}: Readonly<{ copy: CanvasExplorerCopy; onAdd?: Documents['onAddCanvas']; onCancel: () => void }>) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = CanvasHumanNameV1Schema.safeParse(title);
  return (
    <form
      ref={focusName}
      className={styles.actionRow}
      onSubmit={(event) => {
        event.preventDefault();
        if (!parsed.success) return;
        if (!onAdd) return;
        if (busy) return;
        setBusy(true);
        void onAdd(parsed.data).finally(() => {
          setBusy(false);
        });
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <Input
        aria-label={copy.canvasName}
        placeholder={copy.canvasName}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Button type="submit" size="sm" disabled={!parsed.success || !onAdd || busy}>
        {copy.createCanvas}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        {copy.cancelCanvas}
      </Button>
    </form>
  );
}

/**
 * Owned concern: compose passive explorer presentation with a scoped create-only file session.
 * @decision Existing file selection remains independent from the two explicit header commands.
 * @consequence Directory disclosure and viewing never publish files.
 */
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { FilePlus2, Upload } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { WorkspaceFileEntry } from '../../ports/workspace';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { useSessionContext } from '../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import FileTreePanel from './FileTreePanel';
import { resolveCodeFileCreationCopy } from './codeViewCopy';
import { useWorkspaceFileCreation } from './useWorkspaceFileCreation';
import { FileCreationDialog } from './FileCreationDialog';
import styles from './WorkspaceFileExplorer.module.css';

type Props = Readonly<{
  title: string;
  tree: WorkspaceFileEntry[];
  rootPath: string;
  onOpenFile: (path: string) => void;
  stateMessage?: ReactNode;
  disabled?: boolean;
}>;

export function WorkspaceFileExplorer(props: Props) {
  const session = useSessionContext();
  const scope = useSyncExternalStore(
    session.subscribeWorkspaceScope,
    session.getWorkspaceScopeSnapshot
  );
  const [lifetime, setLifetime] = useState(() => ({
    scope,
    rootPath: props.rootPath,
    identity: 0,
  }));
  if (lifetime.scope !== scope || lifetime.rootPath !== props.rootPath) {
    setLifetime({ scope, rootPath: props.rootPath, identity: lifetime.identity + 1 });
    return null;
  }
  return <FileExplorerSession key={lifetime.identity} {...props} scope={scope} />;
}

function FileExplorerSession({ scope, ...props }: Props & { scope: WorkspaceScope }) {
  const copy = resolveCodeFileCreationCopy(useApplicationLanguageStore((state) => state.language));
  const input = useRef<HTMLInputElement>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [folder, setFolder] = useState('');
  const [selectedPath, setSelectedPath] = useState<string>();
  const chooseFolder = (path: string) => {
    const root = props.rootPath === '.' ? '' : props.rootPath;
    const relative = root ? path.slice(root.length + 1) : path;
    setFolder(relative ? relative.replace(/\/$/, '') + '/' : '');
  };
  const openFile = (path: string) => {
    setSelectedPath(path);
    chooseFolder(path.slice(0, Math.max(0, path.lastIndexOf('/'))));
    props.onOpenFile(path);
  };
  const controller = useWorkspaceFileCreation(props.rootPath, scope, openFile);
  const disabled = props.disabled || controller.state.kind !== 'closed';
  return (
    <>
      <FileTreePanel
        title={props.title}
        tree={props.tree}
        selectedPath={selectedPath}
        stateMessage={props.stateMessage}
        onSelectDirectory={(path) => {
          setSelectedPath(path);
          chooseFolder(path);
        }}
        onSelect={(entry) => openFile(entry.path)}
        headerActions={
          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={styles.iconButton}
              aria-label={copy.newFile}
              title={copy.newFile}
              disabled={disabled}
              onClick={(event) => {
                opener.current = event.currentTarget;
                controller.begin({ path: folder, content: '' });
              }}
            >
              <FilePlus2 aria-hidden="true" />
            </Button>
            <Button
              ref={importButton}
              type="button"
              variant="ghost"
              size="icon"
              className={styles.iconButton}
              aria-label={copy.importFile}
              title={copy.importFile}
              disabled={disabled}
              onClick={(event) => {
                opener.current = event.currentTarget;
                input.current?.click();
              }}
            >
              <Upload aria-hidden="true" />
            </Button>
            <input
              ref={input}
              type="file"
              className={styles.fileInput}
              tabIndex={-1}
              aria-label={copy.importFile}
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!disabled && file) {
                  opener.current = importButton.current;
                  void controller.importFile(file, folder);
                }
              }}
            />
          </div>
        }
      />
      <FileCreationDialog
        controller={controller}
        copy={copy}
        onReturnFocus={() => {
          if (opener.current?.isConnected) opener.current.focus();
        }}
      />
    </>
  );
}

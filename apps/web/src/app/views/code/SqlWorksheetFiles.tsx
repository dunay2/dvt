/** A scoped worksheet may explicitly open, save and version one operation SQL file. */
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sha256HexUtf8 } from '@dvt/crypto';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { queryKeys } from '../../queries/queryKeys';
import { useWorkspaceFileTreeQuery } from '../../queries/workspaceQueries';
import {
  useSessionContext,
  useWorkspaceFileContentCommandPort,
  useWorkspaceFilesQueryPort,
} from '../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CodeFileVersionHistory } from './CodeFileVersionHistory';
import { resolveCodeViewCopy } from './codeViewCopy';
import { flattenCodeWorkspaceFiles } from './codeViewFileSelection';
import { resolveCodeFileCreationFailure } from './codeWorkbenchErrorModel';
import {
  readWorksheetFile,
  saveWorksheetFile,
  worksheetFilePath,
  type WorksheetRevision,
} from './sqlWorksheetFileAccess';
import { worksheetFileMessages } from './sqlWorksheetFileMessages';
import styles from './SqlWorksheetFiles.module.css';

type Props = Readonly<{ scope: WorkspaceScope; sql: string; onSqlChange: (value: string) => void }>;

function useScopedFileOperation(scope: WorkspaceScope) {
  const session = useSessionContext();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<
    'changed' | 'conflict' | 'committed' | 'forbidden' | 'unavailable'
  >();
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = () => mounted.current && session.getWorkspaceScopeSnapshot() === scope;
  async function perform(action: () => Promise<void>) {
    if (pending.current || !current()) return;
    pending.current = true;
    setBusy(true);
    setMessage(undefined);
    try {
      await action();
    } catch (error) {
      if (current()) setMessage(resolveCodeFileCreationFailure(error));
    } finally {
      pending.current = false;
      if (current()) setBusy(false);
    }
  }
  return { perform, current, busy, message, setMessage };
}

function useWorksheetFileSession({ scope, sql, onSqlChange }: Props) {
  const reader = useWorkspaceFilesQueryPort();
  const writer = useWorkspaceFileContentCommandPort();
  const cache = useQueryClient();
  const [file, setFile] = useState<WorksheetRevision>();
  const { perform, current, busy, message, setMessage } = useScopedFileOperation(scope);
  const currentText = useRef(sql);
  currentText.current = sql;
  const open = (path: string) =>
    perform(async () => {
      const next = await readWorksheetFile(reader.getFileContent, path);
      if (!current()) return;
      if (currentText.current !== sql) {
        setMessage('changed');
        return;
      }
      setFile({ path, digest: next.contentSha256 });
      onSqlChange(next.content);
    });
  const save = (path: string) =>
    perform(async () => {
      const originalDigest = file?.path === path ? file.digest : undefined;
      const revision = await saveWorksheetFile(writer.saveFileContent, path, sql, originalDigest);
      if (!current()) return;
      setFile(revision);
      setMessage('committed');
      const keys = queryKeys.workspace.forLayout(
        [scope.tenantId, scope.projectId, scope.environmentId].join('::')
      );
      void cache.invalidateQueries({ queryKey: keys.fileContent(path) });
      void cache.invalidateQueries({ queryKey: keys.fileTree() });
    });
  return { file, busy, message, open, save };
}

type Copy = (typeof worksheetFileMessages)['en'];
type Session = ReturnType<typeof useWorksheetFileSession>;

function SavedQueryPicker({
  copy,
  session,
  replacing,
  onOpen,
}: Readonly<{
  copy: Copy;
  session: Session;
  replacing: boolean;
  onOpen: (path: string) => Promise<void>;
}>) {
  const [selected, setSelected] = useState('');
  const tree = useWorkspaceFileTreeQuery();
  const paths = flattenCodeWorkspaceFiles(tree.data ?? [])
    .map((entry) => entry.path)
    .filter((path) => worksheetFilePath(path) === path);
  return (
    <>
      <div className={styles.group}>
        <label className={styles.field}>
          {copy.saved}
          <select
            className={styles.select}
            value={selected}
            disabled={session.busy}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">{copy.choose}</option>
            {paths.map((path) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={session.busy || !paths.includes(selected)}
          onClick={() => {
            void onOpen(selected);
          }}
        >
          {replacing ? copy.replace : copy.open}
        </Button>
      </div>
      {tree.isFetching && <p role="status">{copy.loading}</p>}
      {tree.isError && <p role="alert">{copy.unavailable}</p>}
      {tree.isSuccess && !paths.length && <p>{copy.empty}</p>}
    </>
  );
}

function SaveWorksheetQuery({
  copy,
  session,
  sql,
}: Readonly<{ copy: Copy; session: Session; sql: string }>) {
  const [name, setName] = useState('');
  const target = worksheetFilePath(name || session.file?.path || '');
  return (
    <div className={styles.group}>
      <label className={styles.field}>
        {copy.name}
        <Input
          value={name}
          placeholder={session.file?.path.slice('operations/'.length) ?? 'query.sql'}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <Button
        type="button"
        disabled={!target || !sql.trim() || session.busy}
        onClick={() => {
          if (target) void session.save(target);
        }}
      >
        {copy.save}
      </Button>
    </div>
  );
}

function WorksheetFileActions({
  session,
  sql,
  onSqlChange,
}: Readonly<{
  session: Session;
  sql: string;
  onSqlChange: Props['onSqlChange'];
}>) {
  const locale = useApplicationLanguageStore((state) => state.language);
  const copy = worksheetFileMessages[locale];
  const synchronized = session.file != null && session.file.digest === sha256HexUtf8(sql);
  return (
    <>
      <DialogTitle>{copy.title}</DialogTitle>
      <DialogDescription>{session.file?.path ?? copy.saved}</DialogDescription>
      <SavedQueryPicker
        copy={copy}
        session={session}
        replacing={sql.length > 0 && !synchronized}
        onOpen={session.open}
      />
      <SaveWorksheetQuery key={session.file?.path} copy={copy} session={session} sql={sql} />
      {session.message && (
        <p role={session.message === 'committed' ? 'status' : 'alert'}>{copy[session.message]}</p>
      )}
      {session.file && (
        <CodeFileVersionHistory
          key={`history:${session.file.path}`}
          copy={resolveCodeViewCopy(locale)}
          path={session.file.path}
          language="sql"
          value={sql}
          synchronized={synchronized && !session.busy}
          onRestore={onSqlChange}
        />
      )}
    </>
  );
}

export function SqlWorksheetFiles(props: Props) {
  const copy = worksheetFileMessages[useApplicationLanguageStore((state) => state.language)];
  const session = useWorksheetFileSession(props);
  const [opened, setOpened] = useState(false);
  return (
    <Dialog
      open={opened}
      onOpenChange={(next) => {
        if (!session.busy) setOpened(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {copy.title}
        </Button>
      </DialogTrigger>
      <DialogContent className={styles.dialog} closeLabel={copy.close}>
        <WorksheetFileActions session={session} sql={props.sql} onSqlChange={props.onSqlChange} />
      </DialogContent>
    </Dialog>
  );
}

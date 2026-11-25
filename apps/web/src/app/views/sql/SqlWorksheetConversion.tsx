/** Choose a destination explicitly before creating a model from the worksheet. */
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { randomUuidV4, sha256HexUtf8 } from '@dvt/crypto';
import {
  isSha256HexString,
  type WorksheetDbtModelRequest,
  type WorksheetDbtModelResult,
} from '@dvt/contracts';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import type { FileContent } from '../../ports/workspace';
import { queryKeys } from '../../queries/queryKeys';
import {
  useWorkspaceFileContentQuery,
  useWorkspaceFileTreeQuery,
} from '../../queries/workspaceQueries';
import { useSessionContext, useWorksheetDbtModelCommand } from '../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { flattenCodeWorkspaceFiles } from '../code/codeViewFileSelection';
import { WorksheetCanvasModelForm } from './WorksheetCanvasModelForm';
import type { SqlWorksheetConversionProps } from './sqlWorksheet.types';
import { sqlConversionMessages } from './sqlConversionMessages';
import styles from './SqlWorksheetConversion.module.css';

type ModelInput = Omit<WorksheetDbtModelRequest, 'requestId'>;
type Destination = Omit<ModelInput, 'sql' | 'name'>;
type Submission = Readonly<{ identity: string; request: WorksheetDbtModelRequest }>;
type Receipt = WorksheetDbtModelResult | 'unavailable';

function identifySubmission(input: ModelInput, previous?: Submission): Submission {
  const identity = JSON.stringify(input);
  if (previous?.identity === identity) return previous;
  return { identity, request: { ...input, requestId: randomUuidV4() } };
}

function usePublishDbtWorksheet({ sql, scope }: SqlWorksheetConversionProps) {
  const command = useWorksheetDbtModelCommand();
  const cache = useQueryClient();
  const session = useSessionContext();
  const mounted = useRef(false);
  const submission = useRef<Submission | undefined>(undefined);
  const active = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Receipt>();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = () => mounted.current && session.getWorkspaceScopeSnapshot() === scope;
  function finish(receipt: Receipt) {
    active.current = false;
    if (!current()) return;
    setResult(receipt);
    setBusy(false);
    if (receipt === 'unavailable' || receipt.kind !== 'created') return;
    const keys = queryKeys.workspace.forLayout(
      [scope.tenantId, scope.projectId, scope.environmentId].join('::')
    );
    void cache.invalidateQueries({ queryKey: keys.fileTree() });
    void cache.invalidateQueries({ queryKey: queryKeys.workspace.dbtProjectGraphRoot() });
  }
  async function publish(target: Destination, name: string) {
    if (active.current || !current()) return;
    submission.current = identifySubmission({ ...target, name, sql }, submission.current);
    active.current = true;
    setBusy(true);
    setResult(undefined);
    try {
      finish(await command.create(scope, submission.current.request));
    } catch {
      finish('unavailable');
    }
  }
  return { publish, busy, result };
}

function confirmedDestination(
  file: FileContent | undefined,
  path: string | undefined
): Destination | undefined {
  if (!file || file.path !== path) return;
  const resolution = file.authoringAuthority;
  if (resolution?.kind !== 'resolved') return;
  const { authority, canvasId } = resolution.binding;
  if (authority.kind !== 'dbt-project-files') return;
  const digest = sha256HexUtf8(file.content);
  if (digest !== file.contentSha256 || !isSha256HexString(digest)) return;
  return { configSha256: digest, canvasId, projectRoot: authority.projectRoot };
}

function useDbtDestination() {
  const tree = useWorkspaceFileTreeQuery();
  const configs = flattenCodeWorkspaceFiles(tree.data ?? []).filter(
    (entry) => entry.name === 'dbt_project.yml'
  );
  const [selection, select] = useState<string>();
  const configPath = selection ?? (configs.length === 1 ? configs[0]?.path : undefined);
  const config = useWorkspaceFileContentQuery(configPath);
  const loading = tree.isFetching || config.isFetching;
  const target =
    !loading && config.isSuccess ? confirmedDestination(config.data, configPath) : undefined;
  return { configs, configPath, select, target, loading };
}

function DbtModelDestination({
  publication,
  copy,
}: Readonly<{
  publication: ReturnType<typeof usePublishDbtWorksheet>;
  copy: typeof sqlConversionMessages.en;
}>) {
  const { configs, configPath, select, target, loading } = useDbtDestination();
  const [name, setName] = useState('');
  const { publish, busy, result } = publication;
  const validName = /^[A-Za-z_][A-Za-z0-9_]{0,126}$/.test(name);
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (target && validName) void publish(target, name);
      }}
    >
      <label className={styles.field}>
        {copy.project}
        <select
          className={styles.choice}
          disabled={busy}
          value={configPath ?? ''}
          onChange={(e) => select(e.currentTarget.value)}
        >
          <option value="">{copy.chooseProject}</option>
          {configs.map((c) => (
            <option key={c.path} value={c.path}>
              {c.path}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        {copy.name}
        <Input
          required
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.currentTarget.value)}
        />
      </label>
      {!loading && !target && <p role="status">{copy.project_unavailable}</p>}
      <Button type="submit" disabled={!target || !validName || busy}>
        {busy ? copy.busy : copy.create}
      </Button>
      {result && <DbtModelReceipt result={result} copy={copy} />}
    </form>
  );
}

function DbtModelReceipt({
  result,
  copy,
}: Readonly<{ result: Receipt; copy: typeof sqlConversionMessages.en }>) {
  if (result === 'unavailable') return <p role="alert">{copy.unavailable}</p>;
  if (result.kind === 'refused') return <p role="alert">{copy[result.reason]}</p>;
  return (
    <p role="status">
      {copy.created} <code>{result.path}</code>
    </p>
  );
}

export function SqlWorksheetConversion(props: SqlWorksheetConversionProps) {
  const locale = useApplicationLanguageStore((s) => s.language);
  const copy = sqlConversionMessages[locale];
  const [open, setOpen] = useState(false);
  const [destinations, setDestinations] = useState<readonly ('canvas' | 'dbt')[]>([]);
  const destination = destinations.at(-1);
  function choose(next: 'canvas' | 'dbt') {
    setDestinations((visited) => [...visited.filter((value) => value !== next), next]);
  }
  const publication = usePublishDbtWorksheet(props);
  const [canvasBusy, setCanvasBusy] = useState(false);
  const busy = canvasBusy || publication.busy;
  function toggle(next: boolean) {
    if (busy) return;
    if (next) setDestinations([]);
    setOpen(next);
  }
  return (
    <Dialog open={open} onOpenChange={toggle}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={!props.sql.trim()}>
          {copy.title}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={copy.close}>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.destination}</DialogDescription>
        <fieldset className={styles.destinations} aria-label={copy.destination} disabled={busy}>
          <label>
            <input
              type="radio"
              name="worksheet-model-destination"
              checked={destination === 'canvas'}
              onChange={() => choose('canvas')}
            />
            {copy.canvas}
          </label>
          <label>
            <input
              type="radio"
              name="worksheet-model-destination"
              checked={destination === 'dbt'}
              onChange={() => choose('dbt')}
            />
            {copy.dbt}
          </label>
        </fieldset>
        {destinations.includes('dbt') && (
          <div hidden={destination !== 'dbt'}>
            <DbtModelDestination publication={publication} copy={copy} />
          </div>
        )}
        {destinations.includes('canvas') && (
          <div hidden={destination !== 'canvas'}>
            <WorksheetCanvasModelForm {...props} onBusyChange={setCanvasBusy} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Own one reference insertion attempt and refuse obsolete scope, connection or buffer completions. */
import { useRef, useState, type RefObject } from 'react';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { ICanvasTransformSqlQueryPort } from '../../ports/canvasTransformSql';
import {
  useOptionalCanvasTransformSqlQueryPort,
  useSessionContext,
  useDbtSelectedModelAnalysisQueryPort,
} from '../../services/AppServicesContext';
import { readWorkspaceDbtModelReference } from '@dvt/contracts';
import type { IDbtSelectedModelAnalysisQueryPort } from '../../ports/dbtSelectedModelAnalysis';
import { materializeSqlWorksheetDbtModel } from './sqlWorksheetDbtModels';
import { sameWorkspaceScopeIdentity } from '../../services/session/workspaceScopeSelectionPort';
import type {
  SqlWorksheetDragReference,
  SqlWorksheetConnection,
  SqlWorksheetInsertion,
} from './sqlWorksheet.types';
import type { SqlWorksheetMonacoHandle } from './SqlWorksheetMonaco';
import { resolveSqlWorksheetObject, materializeSqlWorksheetNode } from './sqlWorksheetInsertions';
import type { useSqlWorksheet } from './useSqlWorksheet';
import type { useSqlWorksheetCatalogue } from './useSqlWorksheetCatalogue';
type Props = Readonly<{ scope: WorkspaceScope; scopeKey: string }>;
type Worksheet = ReturnType<typeof useSqlWorksheet>;
type Catalogue = ReturnType<typeof useSqlWorksheetCatalogue>;

type ModelReferenceTarget = Readonly<{
  node: Catalogue['nodes'][number] | undefined;
  canvasId: string | null;
  projection: ICanvasTransformSqlQueryPort | undefined;
}>;
function hasModelReferenceTarget(
  value: ModelReferenceTarget
): value is Required<ModelReferenceTarget> & {
  node: Catalogue['nodes'][number];
  canvasId: string;
  projection: ICanvasTransformSqlQueryPort;
} {
  if (value.node == null) return false;
  if (value.canvasId == null) return false;
  return value.projection != null;
}

async function materializeReference(
  reference: SqlWorksheetDragReference,
  catalogue: Catalogue,
  connection: SqlWorksheetConnection,
  queries: Readonly<{
    native: ICanvasTransformSqlQueryPort | undefined;
    dbt: IDbtSelectedModelAnalysisQueryPort;
  }>
): Promise<SqlWorksheetInsertion> {
  if (reference.kind === 'table') {
    return resolveSqlWorksheetObject(catalogue.objectItems, reference.id, connection);
  }
  const node = catalogue.nodes.find((item) => item.id === reference.id);
  if (node == null) throw new Error('The Model definition is unavailable.');
  const fileReference = readWorkspaceDbtModelReference(node);
  if (fileReference != null) {
    const project = catalogue.fileProject;
    const revision =
      project?.authorityBinding.canvasId === fileReference.canvasId
        ? project.projectRevision.contentSetSha256
        : undefined;
    return materializeSqlWorksheetDbtModel(node, connection, queries.dbt, revision);
  }
  return materializeNativeModel(node, catalogue, connection, queries.native);
}

function materializeNativeModel(
  node: Catalogue['nodes'][number],
  catalogue: Catalogue,
  connection: SqlWorksheetConnection,
  projection: ICanvasTransformSqlQueryPort | undefined
): Promise<SqlWorksheetInsertion> {
  const target = { node, canvasId: catalogue.canvasId, projection };
  if (!hasModelReferenceTarget(target)) throw new Error('The Model SQL projection is unavailable.');
  return materializeSqlWorksheetNode(target.node, target.canvasId, connection, target.projection);
}

type ReferenceObservation = Readonly<{
  scope: WorkspaceScope;
  connectionId: string | undefined;
  sql: string | undefined;
  attempt: number;
}>;
function sameSqlReferenceObservation(
  expected: ReferenceObservation,
  actual: ReferenceObservation
): boolean {
  if (!sameWorkspaceScopeIdentity(expected.scope, actual.scope)) return false;
  const facts = [
    [expected.connectionId, actual.connectionId],
    [expected.sql, actual.sql],
    [expected.attempt, actual.attempt],
  ];
  return facts.every(([before, after]) => before === after);
}

async function completeSqlReferenceInsertion(
  operation: Readonly<{
    read: () => Promise<SqlWorksheetInsertion>;
    current: () => boolean;
    editor: RefObject<SqlWorksheetMonacoHandle>;
    accept: (sql: string, insertion: SqlWorksheetInsertion) => void;
    failed: () => void;
    settled: () => void;
  }>
): Promise<void> {
  try {
    const insertion = await operation.read();
    if (!operation.current()) return;
    const sql = operation.editor.current?.insert(insertion.fragment);
    if (sql != null) operation.accept(sql, insertion);
  } catch {
    if (operation.current()) operation.failed();
  } finally {
    operation.settled();
  }
}

export function useSqlWorksheetReferences(
  props: Props,
  worksheet: Worksheet,
  catalogue: Catalogue
) {
  const editor = useRef<SqlWorksheetMonacoHandle>(null);
  const session = useSessionContext();
  const projection = useOptionalCanvasTransformSqlQueryPort();
  const dbt = useDbtSelectedModelAnalysisQueryPort();
  const latest = useRef({ worksheet, catalogue });
  latest.current = { worksheet, catalogue };
  const attempt = useRef(0);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function insert(reference: SqlWorksheetDragReference): Promise<void> {
    const { connection } = worksheet;
    if (reference.scopeKey !== props.scopeKey) return;
    if (connection == null || connection.type !== 'postgres') return;
    const sequence = ++attempt.current;
    const buffer = editor.current?.value();
    if (buffer == null) return;
    const captured: ReferenceObservation = {
      scope: props.scope,
      connectionId: connection.id,
      sql: buffer,
      attempt: sequence,
    };
    const current = () =>
      sameSqlReferenceObservation(captured, {
        scope: session.getWorkspaceScopeSnapshot(),
        connectionId: latest.current.worksheet.state.connectionId ?? undefined,
        sql: editor.current?.value(),
        attempt: attempt.current,
      });
    setPending(true);
    setFailed(false);
    await completeSqlReferenceInsertion({
      read: () =>
        materializeReference(reference, catalogue, connection, { native: projection, dbt }),
      current,
      editor,
      accept: (sql, insertion) => latest.current.worksheet.acceptInsertion(sql, insertion),
      failed: () => setFailed(true),
      settled: () => {
        if (sequence === attempt.current) setPending(false);
      },
    });
  }
  return { editor, pending, failed, insert };
}

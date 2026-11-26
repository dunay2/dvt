/** Keep one Monaco instance while SQL buffers, history and file selections change. */
import { forwardRef, useCallback, useImperativeHandle, useRef, type DragEvent } from 'react';
import type { editor } from 'monaco-editor';
import {
  MonacoCodeEditor,
  type MonacoCodeDiagnostic,
  type MonacoCodeEditorMount,
} from '../../components/monaco/MonacoCodeEditor';
import { SQL_WORKSHEET_REFERENCE_MIME, type SqlWorksheetDragReference } from './sqlWorksheet.types';
import type { SqlWorksheetCopy } from './sqlWorksheetCopy';
import styles from './SqlWorksheet.module.css';

export type SqlWorksheetMonacoHandle = Readonly<{
  value: () => string;
  insert: (fragment: string) => string | null;
}>;
type Props = Readonly<{
  scopeKey: string;
  dragScopeKey: string;
  sql: string;
  onChange: (sql: string) => void;
  onRun: () => void;
  onReference: (reference: SqlWorksheetDragReference) => void;
  diagnostics?: readonly MonacoCodeDiagnostic[];
  copy: SqlWorksheetCopy;
}>;

function readSqlWorksheetDrag(raw: string, scopeKey: string): SqlWorksheetDragReference | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (value == null || typeof value !== 'object') return null;
    const reference = value as Record<string, unknown>;
    if (reference.scopeKey !== scopeKey) return null;
    if (reference.kind !== 'table' && reference.kind !== 'node') return null;
    if (typeof reference.id !== 'string') return null;
    if (reference.id.trim().length === 0) return null;
    return { scopeKey, kind: reference.kind, id: reference.id };
  } catch {
    return null;
  }
}

function insertSqlWorksheetFragment(
  current: editor.IStandaloneCodeEditor | null,
  fragment: string
): string | null {
  if (current == null) return null;
  const model = current.getModel();
  if (model == null) return null;
  const end = model.getPositionAt(model.getValueLength());
  const range = current.getSelection() ?? {
    startLineNumber: end.lineNumber,
    startColumn: end.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  };
  current.executeEdits('sql-worksheet-reference', [
    { range, text: fragment, forceMoveMarkers: true },
  ]);
  current.focus();
  return current.getValue();
}

function receiveSqlWorksheetDrop(
  event: DragEvent<HTMLDivElement>,
  current: editor.IStandaloneCodeEditor | null,
  props: Props
): void {
  if (!event.dataTransfer.types.includes(SQL_WORKSHEET_REFERENCE_MIME)) return;
  event.preventDefault();
  event.stopPropagation();
  const reference = readSqlWorksheetDrag(
    event.dataTransfer.getData(SQL_WORKSHEET_REFERENCE_MIME),
    props.dragScopeKey
  );
  if (reference == null) return;
  if (current == null) return;
  const position = current.getTargetAtClientPoint(event.clientX, event.clientY)?.position;
  if (position != null) current.setPosition(position);
  props.onReference(reference);
}

export const SqlWorksheetMonaco = forwardRef<SqlWorksheetMonacoHandle, Props>(
  function SqlWorksheetMonaco(props, ref) {
    const instance = useRef<editor.IStandaloneCodeEditor | null>(null);
    const latest = useRef(props);
    latest.current = props;
    useImperativeHandle(
      ref,
      () => ({
        value: () => instance.current?.getValue() ?? latest.current.sql,
        insert: (fragment) => insertSqlWorksheetFragment(instance.current, fragment),
      }),
      []
    );
    const mount = useCallback<MonacoCodeEditorMount>((current, api) => {
      instance.current = current;
      current.addCommand(api.KeyMod.CtrlCmd | api.KeyCode.Enter, () => latest.current.onRun());
      current.onDidDispose(() => {
        if (instance.current === current) instance.current = null;
      });
    }, []);
    return (
      <div
        className={styles.editor}
        data-slot="sql-worksheet-editor"
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(SQL_WORKSHEET_REFERENCE_MIME)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDropCapture={(event) => receiveSqlWorksheetDrop(event, instance.current, latest.current)}
      >
        <MonacoCodeEditor
          ariaLabel={props.copy.editor}
          loadingLabel={props.copy.editorLoading}
          language="sql"
          containerClassName={styles.editorSurface}
          path={`inmemory://dvt-sql/${encodeURIComponent(props.scopeKey)}/query.sql`}
          value={props.sql}
          onChange={props.onChange}
          onMount={mount}
          diagnostics={props.diagnostics}
        />
      </div>
    );
  }
);

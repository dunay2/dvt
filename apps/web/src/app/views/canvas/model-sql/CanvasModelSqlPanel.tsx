/** Compose SQL source, diagnostics and the existing data drawer without another save controller. */
import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { MODEL_SQL_MAX_LENGTH } from '@dvt/contracts';
import {
  MonacoCodeEditor,
  type MonacoCodeEditorMount,
} from '../../../components/monaco/MonacoCodeEditor';
import { useOptionalCanvasModelSqlQueryPort } from '../../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../../types/canonical';
import { CanvasModelDataPanel } from '../CanvasModelDataPanel';
import { resolveCanvasSemanticEditorCopy } from '../canvasSemanticEditorCopy';
import type { CanvasModelPreviewPreparation } from '../canvasDraftLifecycle.types';
import type {
  CanvasRelationalTreeAuthoringContract,
  CanvasModelLayoutCapture,
} from '../canvasRelationalTreeWorkbench.types';
import type { CanvasRelationalTreeWorkbenchHandle } from '../useCanvasRelationalTreeWorkbenchHandle';
import { CanvasModelSqlToolbar } from './CanvasModelSqlToolbar';
import { resolveModelSqlCopy } from './modelSqlCopy';
import { installModelSqlEditorActions } from './modelSqlEditorActions';
import { useCanvasModelSql } from './useCanvasModelSql';
import styles from './CanvasModelSqlPanel.module.css';

type CanvasModelSqlPanelProps = Readonly<{
  canvasId: string;
  panelId: string;
  node: CanonicalNode;
  revision: string;
  scopeKey?: string;
  open: boolean;
  active: boolean;
  onClose: () => void;
  visual: RefObject<CanvasRelationalTreeWorkbenchHandle>;
  authoring?: CanvasRelationalTreeAuthoringContract;
  preparePreview?: CanvasModelPreviewPreparation;
  dataHost?: HTMLDivElement | null;
  ownsData: boolean;
  onOpenData: () => void;
  onApplyingChange?: (applying: boolean) => void;
  captureGeneratedLayout?: CanvasModelLayoutCapture;
}>;
type CanvasModelSqlState = ReturnType<typeof useCanvasModelSql>;

export const CanvasModelSqlPanel = forwardRef<
  CanvasRelationalTreeWorkbenchHandle,
  CanvasModelSqlPanelProps
>(function CanvasModelSqlPanel(props, ref) {
  const language = useApplicationLanguageStore((value) => value.language);
  const copy = resolveModelSqlCopy(language);
  const dataCopy = resolveCanvasSemanticEditorCopy(language);
  const query = useOptionalCanvasModelSqlQueryPort();
  const model = useCanvasModelSql({ ...props, query, open: props.open && props.active });
  const mount = useCanvasModelSqlEditor(model, copy.execute);
  useImperativeHandle(ref, () =>
    modelSqlDraftHandle(model, query != null && props.authoring?.canEditNode === true)
  );
  const diagnostics = model.diagnostics;
  const { tooLong, ready } = modelSqlPanelReadiness(model.state, query != null);
  return (
    <section
      id={props.panelId}
      data-slot="canvas-model-sql"
      hidden={!props.open}
      aria-label={copy.editor}
      className={styles.panel}
    >
      {tooLong ? (
        <p role="alert" className={`${styles.message} ${styles.error}`}>
          {copy.tooLong}
        </p>
      ) : null}
      <CanvasModelSqlToolbar
        copy={copy}
        pending={model.pending}
        ready={ready}
        dirty={model.dirty}
        valid={model.analysis?.status === 'valid'}
        editable={props.authoring?.canEditNode === true}
        actions={{
          validate: () => void model.validate(),
          execute: () => void model.execute(),
          generate: () => void model.generate(),
          refresh: () => void model.loadContext(),
          close: props.onClose,
          cancel: model.cancel,
          discard: model.discard,
        }}
      />
      {props.open ? (
        <CanvasModelSqlEditorContents
          node={props.node}
          canvasId={props.canvasId}
          scopeKey={props.scopeKey}
          sql={model.state.sql}
          onSqlChange={model.setSql}
          readOnly={model.pending === 'generate'}
          context={model.state.context}
          diagnostics={diagnostics}
          mount={mount}
          copy={copy}
        />
      ) : null}
      <CanvasModelSqlMessages
        failure={model.state.failure}
        problem={model.problem}
        pending={model.pending}
        hasContext={model.state.context != null}
        diagnostics={diagnostics}
        copy={copy}
      />
      <CanvasModelSqlData
        active={props.active}
        ownsData={props.ownsData}
        dataHost={props.dataHost}
        nodeName={props.node.name}
        model={model}
        ready={ready}
        copy={copy}
        dataCopy={dataCopy}
      />
    </section>
  );
});

function CanvasModelSqlInputs({
  inputs,
  copy,
}: Readonly<{
  inputs: NonNullable<CanvasModelSqlState['state']['context']>['inputs'] | undefined;
  copy: ReturnType<typeof resolveModelSqlCopy>;
}>): JSX.Element {
  return (
    <aside aria-label={copy.inputs} className={styles.inputs}>
      {inputs?.length === 0 ? <p className={styles.meta}>{copy.noInputs}</p> : null}
      {inputs?.map((input) => (
        <details className={styles.input} key={input.sqlName}>
          <summary>
            <code>{input.sqlName}</code> <span className={styles.meta}>{input.columns.length}</span>
          </summary>
          {input.columns.map((column) => (
            <div className={styles.column} key={column.id}>
              <code>{column.name}</code>
              <span className={styles.meta}>{column.dataType ?? copy.unknown}</span>
            </div>
          ))}
        </details>
      ))}
    </aside>
  );
}

function CanvasModelSqlEditorContents({
  node,
  canvasId,
  scopeKey,
  sql,
  onSqlChange,
  readOnly,
  context,
  diagnostics,
  mount,
  copy,
}: Readonly<{
  node: CanonicalNode;
  canvasId: string;
  scopeKey?: string;
  sql: string;
  onSqlChange: (sql: string) => void;
  readOnly: boolean;
  context: CanvasModelSqlState['state']['context'];
  diagnostics: NonNullable<CanvasModelSqlState['state']['context']>['diagnostics'];
  mount: MonacoCodeEditorMount;
  copy: ReturnType<typeof resolveModelSqlCopy>;
}>): JSX.Element {
  return (
    <div className={styles.body}>
      <MonacoCodeEditor
        ariaLabel={copy.editor}
        loadingLabel={copy.loading}
        language="sql"
        path={`dvt-model-sql:///${encodeURIComponent(scopeKey ?? '')}/${encodeURIComponent(canvasId)}/${encodeURIComponent(node.id)}.sql`}
        value={sql}
        onChange={onSqlChange}
        readOnly={readOnly}
        diagnostics={diagnostics}
        onMount={mount}
        containerClassName={styles.editor}
      />
      <CanvasModelSqlInputs inputs={context?.inputs} copy={copy} />
    </div>
  );
}

function CanvasModelSqlMessages({
  failure,
  problem,
  pending,
  hasContext,
  diagnostics,
  copy,
}: Readonly<{
  failure: CanvasModelSqlState['state']['failure'];
  problem: CanvasModelSqlState['problem'];
  pending: CanvasModelSqlState['pending'];
  hasContext: boolean;
  diagnostics: NonNullable<CanvasModelSqlState['state']['context']>['diagnostics'];
  copy: ReturnType<typeof resolveModelSqlCopy>;
}>): JSX.Element {
  return (
    <>
      {' '}
      {failure != null ? (
        <p role="alert" className={`${styles.message} ${styles.error}`}>
          {copy.failure[failure]}
        </p>
      ) : null}
      {problem != null ? (
        <p role="alert" className={`${styles.message} ${styles.error}`}>
          {copy[problem]}
        </p>
      ) : null}
      {diagnostics.length > 0 ? (
        <ul aria-label={copy.diagnostics} className={`${styles.diagnostics} ${styles.error}`}>
          {diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}:${index}`}>{diagnostic.message}</li>
          ))}
        </ul>
      ) : null}
      <p className={styles.message} title={copy.unsupported}>
        {!hasContext && pending == null ? copy.contextRequired : copy.hint}
      </p>
    </>
  );
}

function CanvasModelSqlData({
  active,
  ownsData,
  dataHost,
  nodeName,
  model,
  ready,
  copy,
  dataCopy,
}: Pick<CanvasModelSqlPanelProps, 'active' | 'ownsData' | 'dataHost'> &
  Readonly<{
    nodeName: string;
    model: Pick<CanvasModelSqlState, 'state' | 'pending' | 'staleData' | 'execute'>;
    ready: boolean;
    copy: ReturnType<typeof resolveModelSqlCopy>;
    dataCopy: ReturnType<typeof resolveCanvasSemanticEditorCopy>;
  }>): React.ReactPortal | null {
  return active && ownsData && dataHost != null
    ? createPortal(
        <CanvasModelDataPanel
          compact
          nodeName={`${nodeName} · ${copy.data}`}
          copy={{
            ...dataCopy,
            previewHint: copy.dataHint,
            stale: copy.staleDataTitle,
            staleHint: copy.staleData,
          }}
          data={{
            sample: model.state.data?.result.sample ?? null,
            loading: model.pending === 'execute',
            error: model.state.failure == null ? null : copy.failure[model.state.failure],
            available: ready && model.pending == null,
            stale: model.staleData,
          }}
          actions={{
            load: async () => {
              await model.execute();
            },
          }}
        />,
        dataHost
      )
    : null;
}

function useCanvasModelSqlEditor(
  model: CanvasModelSqlState,
  executeLabel: string
): MonacoCodeEditorMount {
  const current = useRef(model);
  current.current = model;
  const editorActions = useRef<{ dispose: () => void } | null>(null);
  useEffect(() => () => editorActions.current?.dispose(), []);
  const mount: MonacoCodeEditorMount = (editor, monaco) => {
    editorActions.current?.dispose();
    editorActions.current = installModelSqlEditorActions(
      editor,
      monaco,
      () => current.current.state.context?.inputs ?? [],
      () => {
        void current.current.execute();
      },
      executeLabel
    );
  };
  return mount;
}

function modelSqlDraftHandle(
  model: CanvasModelSqlState,
  editable: boolean
): CanvasRelationalTreeWorkbenchHandle {
  return {
    hasUnappliedChanges: model.dirty || model.pending === 'generate',
    canApply: editable && model.state.sql.trim().length > 0 && model.pending == null,
    applying: model.pending === 'generate',
    applyRejection: null,
    apply: async () =>
      (await model.generate()) ?? { outcome: 'rejected', reason: 'command_unavailable' },
    cancel: model.discard,
  };
}

function modelSqlPanelReadiness(
  state: CanvasModelSqlState['state'],
  available: boolean
): Readonly<{ tooLong: boolean; ready: boolean }> {
  const tooLong = state.sql.length > MODEL_SQL_MAX_LENGTH;
  return {
    tooLong,
    ready: available && state.context != null && state.sql.trim().length > 0 && !tooLong,
  };
}

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
import type { CanvasRelationalTreeAuthoringContract } from '../canvasRelationalTreeWorkbench.types';
import type { CanvasRelationalTreeWorkbenchHandle } from '../useCanvasRelationalTreeWorkbenchHandle';
import { CanvasModelSqlToolbar } from './CanvasModelSqlToolbar';
import { resolveModelSqlCopy } from './modelSqlCopy';
import { installModelSqlEditorActions } from './modelSqlEditorActions';
import { useCanvasModelSql } from './useCanvasModelSql';
import styles from './CanvasModelSqlPanel.module.css';

export const CanvasModelSqlPanel = forwardRef<
  CanvasRelationalTreeWorkbenchHandle,
  Readonly<{
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
  }>
>(function CanvasModelSqlPanel(props, ref) {
  const language = useApplicationLanguageStore((value) => value.language);
  const copy = resolveModelSqlCopy(language);
  const dataCopy = resolveCanvasSemanticEditorCopy(language);
  const query = useOptionalCanvasModelSqlQueryPort();
  const model = useCanvasModelSql({ ...props, query, open: props.open && props.active });
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
      copy.execute
    );
  };
  useImperativeHandle(ref, () => ({
    hasUnappliedChanges: model.dirty || model.pending === 'generate',
    canApply:
      query != null &&
      props.authoring?.canEditNode === true &&
      model.state.sql.trim().length > 0 &&
      model.pending == null,
    applying: model.pending === 'generate',
    applyRejection: null,
    apply: async () =>
      (await model.generate()) ?? { outcome: 'rejected', reason: 'command_unavailable' },
    cancel: model.discard,
  }));
  const diagnostics = model.analysis?.diagnostics ?? model.state.context?.diagnostics ?? [];
  const tooLong = model.state.sql.length > MODEL_SQL_MAX_LENGTH;
  const ready =
    query != null && model.state.context != null && model.state.sql.trim().length > 0 && !tooLong;
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
        <div className={styles.body}>
          <MonacoCodeEditor
            ariaLabel={copy.editor}
            loadingLabel={copy.loading}
            language="sql"
            path={`dvt-model-sql:///${encodeURIComponent(props.scopeKey ?? '')}/${encodeURIComponent(props.canvasId)}/${encodeURIComponent(props.node.id)}.sql`}
            value={model.state.sql}
            onChange={model.setSql}
            readOnly={model.pending === 'generate'}
            diagnostics={diagnostics}
            onMount={mount}
            containerClassName={styles.editor}
          />
          <aside aria-label={copy.inputs} className={styles.inputs}>
            {model.state.context?.inputs.length === 0 ? (
              <p className={styles.meta}>{copy.noInputs}</p>
            ) : null}
            {model.state.context?.inputs.map((input) => (
              <details className={styles.input} key={input.sqlName}>
                <summary>
                  <code>{input.sqlName}</code>{' '}
                  <span className={styles.meta}>{input.columns.length}</span>
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
        </div>
      ) : null}
      {model.state.failure != null ? (
        <p role="alert" className={`${styles.message} ${styles.error}`}>
          {copy.failure[model.state.failure]}
        </p>
      ) : null}
      {model.problem != null ? (
        <p role="alert" className={`${styles.message} ${styles.error}`}>
          {copy[model.problem]}
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
        {model.state.context == null && model.pending == null ? copy.contextRequired : copy.hint}
      </p>
      {props.active && props.ownsData && props.dataHost != null
        ? createPortal(
            <CanvasModelDataPanel
              compact
              nodeName={`${props.node.name} · ${copy.data}`}
              copy={{ ...dataCopy, previewHint: copy.dataHint, staleHint: copy.staleData }}
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
            props.dataHost
          )
        : null}
    </section>
  );
});

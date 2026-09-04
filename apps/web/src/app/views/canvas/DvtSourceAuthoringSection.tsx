/** Owned concern: render DVT source authoring fields. */
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useOptionalWarehouseSourceImportPort } from '../../services/AppServicesContext';
import type { TestWarehouseConnectionResult, WarehouseConnection } from '../../ports/workspace';
import type { CanonicalNode } from '../../types/canonical';
import type { DvtSourceAuthoringMetadata } from './canvasDvtAuthoringModel';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';

export function DvtSourceAuthoringSection({
  node,
  disabled,
  draft,
  errors,
  sourceTarget,
  onChange,
}: Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: DvtSourceAuthoringMetadata;
  errors: CanvasInspectorNodeDraftErrors['dvt'];
  sourceTarget: string;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  const warehouseSourceImport = useOptionalWarehouseSourceImportPort();
  const [connections, setConnections] = useState<readonly WarehouseConnection[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [testResult, setTestResult] = useState<TestWarehouseConnectionResult | null>(null);
  const connectionTestSequence = useRef(0);
  const isImportedSource = node.pluginId === 'dvt.warehouse-source';

  useEffect(() => {
    if (!warehouseSourceImport || isImportedSource) {
      return;
    }

    let active = true;
    setLoadState('loading');
    void warehouseSourceImport
      .listWarehouseConnections()
      .then((result) => {
        if (!active) return;
        setConnections(result.filter((connection) => connection.type === 'postgres'));
        setLoadState('idle');
      })
      .catch(() => {
        if (active) setLoadState('failed');
      });

    return () => {
      active = false;
    };
  }, [isImportedSource, warehouseSourceImport]);

  const selectedConnectionId = draft.connectionRef?.connectionId ?? '';
  const selectedConnectionIdRef = useRef(selectedConnectionId);
  selectedConnectionIdRef.current = selectedConnectionId;
  useEffect(() => {
    connectionTestSequence.current += 1;
    setTestResult(null);
  }, [node.id, selectedConnectionId]);
  const selectedConnectionMissingFromList =
    selectedConnectionId.length > 0 &&
    !connections.some((connection) => connection.id === selectedConnectionId);

  return (
    <div className={inspectorVisualClasses.inspectorDbtSection}>
      <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {canvasViewCopy.inspectorDvtSourceTitle}
      </h3>
      <div className="mb-3 grid grid-cols-1 gap-2 rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] p-3 text-xs">
        <div>
          <span className="block text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSourceTargetLabel}
          </span>
          <code className="mt-1 block truncate text-(--text-default)">{sourceTarget}</code>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-source-connection-${node.id}`}>
            {canvasViewCopy.inspectorDvtConnectionLabel}
          </Label>
          {isImportedSource ? (
            <code className="block rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-(--text-default)">
              {selectedConnectionId || '-'}
            </code>
          ) : (
            <select
              id={`inspector-dvt-source-connection-${node.id}`}
              name="dvt-source-connection"
              value={selectedConnectionId}
              disabled={disabled || loadState === 'loading' || warehouseSourceImport == null}
              className={inspectorVisualClasses.inspectorSelectInput}
              aria-invalid={errors?.connectionRef ? 'true' : undefined}
              onChange={(event) => {
                const connection = connections.find(
                  (candidate) => candidate.id === event.currentTarget.value
                );
                connectionTestSequence.current += 1;
                setTestResult(null);
                onChange((currentDraft) =>
                  currentDraft.dvt?.kind === 'source'
                    ? {
                        ...currentDraft,
                        dvt: {
                          ...currentDraft.dvt,
                          connectionRef: connection
                            ? {
                                schemaVersion: 'connection-ref.v1',
                                connectionId: connection.id,
                                provider: connection.type,
                              }
                            : undefined,
                        },
                      }
                    : currentDraft
                );
              }}
            >
              <option value="">
                {loadState === 'loading'
                  ? canvasViewCopy.inspectorDvtConnectionLoadingLabel
                  : canvasViewCopy.inspectorDvtConnectionPlaceholder}
              </option>
              {selectedConnectionMissingFromList ? (
                <option value={selectedConnectionId}>{selectedConnectionId}</option>
              ) : null}
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name} ({connection.database})
                </option>
              ))}
            </select>
          )}
          {loadState === 'failed' ? (
            <p className={inspectorVisualClasses.inspectorErrorText} role="alert">
              {canvasViewCopy.inspectorDvtConnectionLoadFailedMessage}
            </p>
          ) : null}
          {errors?.connectionRef ? (
            <p className={inspectorVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.connectionRef, canvasViewCopy)}
            </p>
          ) : null}
          {!isImportedSource && warehouseSourceImport && selectedConnectionId ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  const testedConnectionId = selectedConnectionId;
                  const testSequence = ++connectionTestSequence.current;
                  void warehouseSourceImport
                    .testWarehouseConnection(testedConnectionId)
                    .then((result) => {
                      if (
                        connectionTestSequence.current === testSequence &&
                        selectedConnectionIdRef.current === testedConnectionId &&
                        result.connectionId === testedConnectionId
                      ) {
                        setTestResult(result);
                      }
                    })
                    .catch(() => {
                      if (
                        connectionTestSequence.current === testSequence &&
                        selectedConnectionIdRef.current === testedConnectionId
                      ) {
                        setTestResult(null);
                      }
                    });
                }}
              >
                {canvasViewCopy.inspectorDvtConnectionTestLabel}
              </Button>
              {testResult ? (
                <span
                  className={
                    testResult.status === 'passed'
                      ? 'text-xs text-(--status-success)'
                      : inspectorVisualClasses.inspectorErrorText
                  }
                  role="status"
                >
                  {testResult.status === 'passed'
                    ? canvasViewCopy.inspectorDvtConnectionTestPassedMessage
                    : canvasViewCopy.inspectorDvtConnectionTestFailedMessage}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {isImportedSource ? (
          <div className="space-y-2">
            <span className="block text-sm font-medium">
              {canvasViewCopy.inspectorDvtSchemaLabel}
            </span>
            <code
              data-slot="dvt-source-schema-readonly"
              aria-label={`${canvasViewCopy.inspectorDvtSchemaLabel}: ${draft.schema || '-'}`}
              className="block rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-(--text-default)"
            >
              {draft.schema || '-'}
            </code>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`inspector-dvt-source-schema-${node.id}`}>
              {canvasViewCopy.inspectorDvtSchemaLabel}
            </Label>
            <Input
              id={`inspector-dvt-source-schema-${node.id}`}
              name="dvt-source-schema"
              value={draft.schema}
              disabled={disabled}
              aria-invalid={errors?.schema ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) =>
                  currentDraft.dvt?.kind === 'source'
                    ? {
                        ...currentDraft,
                        dvt: { ...currentDraft.dvt, schema: event.target.value },
                      }
                    : currentDraft
                )
              }
            />
            {errors?.schema ? (
              <p className={inspectorVisualClasses.inspectorErrorText}>
                {formatCanvasInspectorNodeDraftError(errors.schema, canvasViewCopy)}
              </p>
            ) : null}
          </div>
        )}
        {isImportedSource ? (
          <div className="space-y-2">
            <span className="block text-sm font-medium">
              {canvasViewCopy.inspectorDvtTableLabel}
            </span>
            <code
              data-slot="dvt-source-table-readonly"
              aria-label={`${canvasViewCopy.inspectorDvtTableLabel}: ${draft.table || '-'}`}
              className="block rounded border border-[color:var(--border-default)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-(--text-default)"
            >
              {draft.table || '-'}
            </code>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`inspector-dvt-source-table-${node.id}`}>
              {canvasViewCopy.inspectorDvtTableLabel}
            </Label>
            <Input
              id={`inspector-dvt-source-table-${node.id}`}
              name="dvt-source-table"
              value={draft.table}
              disabled={disabled}
              aria-invalid={errors?.table ? 'true' : undefined}
              onChange={(event) =>
                onChange((currentDraft) =>
                  currentDraft.dvt?.kind === 'source'
                    ? {
                        ...currentDraft,
                        dvt: { ...currentDraft.dvt, table: event.target.value },
                      }
                    : currentDraft
                )
              }
            />
            {errors?.table ? (
              <p className={inspectorVisualClasses.inspectorErrorText}>
                {formatCanvasInspectorNodeDraftError(errors.table, canvasViewCopy)}
              </p>
            ) : null}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor={`inspector-dvt-source-alias-${node.id}`}>
            {canvasViewCopy.inspectorDvtAliasLabel}
          </Label>
          <Input
            id={`inspector-dvt-source-alias-${node.id}`}
            name="dvt-source-alias"
            value={draft.alias}
            disabled={disabled}
            aria-invalid={errors?.alias ? 'true' : undefined}
            onChange={(event) =>
              onChange((currentDraft) =>
                currentDraft.dvt?.kind === 'source'
                  ? {
                      ...currentDraft,
                      dvt: { ...currentDraft.dvt, alias: event.target.value },
                    }
                  : currentDraft
              )
            }
          />
          {errors?.alias ? (
            <p className={inspectorVisualClasses.inspectorErrorText}>
              {formatCanvasInspectorNodeDraftError(errors.alias, canvasViewCopy)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { CheckCircle2, Database, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  CreateWarehouseConnectionInput,
  RenameWarehouseConnectionInput,
  TestWarehouseConnectionResult,
  WarehouseConnection,
} from '../../ports/workspace';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { type SourceImportWizardCopy, useSourceImportLocalization } from './copy';
import type { SourceImportFailureCode } from './types';
import { WarehouseConnectionCreateForm } from './WarehouseConnectionCreateForm';
import { WarehouseConnectionRenameForm } from './WarehouseConnectionRenameForm';

interface ConnectionStepProps {
  connections: WarehouseConnection[];
  selectedConnection: string | null;
  createConnectionFormOpen: boolean;
  createConnectionForm: CreateWarehouseConnectionInput;
  renameConnectionFormOpen: boolean;
  renameConnectionForm: RenameWarehouseConnectionInput;
  isLoadingConnections: boolean;
  isCreatingConnection: boolean;
  isRenamingConnection: boolean;
  isTestingConnection: boolean;
  connectionTestResult: TestWarehouseConnectionResult | null;
  loadError: string | null;
  createConnectionError: string | null;
  createConnectionErrorCode: SourceImportFailureCode | null;
  renameConnectionError: string | null;
  renameConnectionSucceeded: boolean;
  onSelectConnection: (connectionId: string) => void;
  onOpenCreateConnectionForm: () => void;
  onCancelCreateConnectionForm: () => void;
  onCreateConnectionFormChange: <Field extends keyof CreateWarehouseConnectionInput>(
    field: Field,
    value: CreateWarehouseConnectionInput[Field]
  ) => void;
  onOpenRenameConnectionForm: () => void;
  onCancelRenameConnectionForm: () => void;
  onRenameConnectionNameChange: (name: string) => void;
  onCreateConnection: () => void;
  onTestConnection: () => void;
  onRenameConnection: () => void;
}

function filterConnections(
  connections: readonly WarehouseConnection[],
  searchValue: string
): readonly WarehouseConnection[] {
  const normalizedSearch = searchValue.trim().toLowerCase();
  if (!normalizedSearch) {
    return connections;
  }

  return connections.filter((connection) =>
    [
      connection.id,
      connection.name,
      connection.type,
      connection.database,
      'database source registry governed catalog connection warehouse',
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  );
}

function formatConnectionCatalogSummary(
  connectionCount: number,
  copy: SourceImportWizardCopy['connection']
): string {
  const template = connectionCount === 1 ? copy.catalogSummarySingular : copy.catalogSummaryPlural;
  return template.replace('{count}', String(connectionCount));
}

interface ConnectionFeedbackProps {
  loadError: string | null;
  connectionTestResult: TestWarehouseConnectionResult | null;
  renameConnectionSucceeded: boolean;
}

function ConnectionFeedback({
  loadError,
  connectionTestResult,
  renameConnectionSucceeded,
}: ConnectionFeedbackProps) {
  const { copy } = useSourceImportLocalization();
  const hasFeedback =
    loadError !== null || connectionTestResult !== null || renameConnectionSucceeded;

  if (!hasFeedback) return null;

  return (
    <div data-slot="source-import-connection-feedback" className="space-y-2">
      {loadError ? (
        <Alert
          data-slot="source-import-connection-load-error"
          aria-live="assertive"
          aria-atomic="true"
          variant="destructive"
          className="border-red-700 bg-red-950/30 px-3 py-2 text-sm text-red-200"
        >
          <AlertDescription className="text-red-200">{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {renameConnectionSucceeded ? (
        <div
          data-slot="source-import-rename-connection-success"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="rounded-md border border-emerald-800/70 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200"
        >
          {copy.connection.renameSuccess}
        </div>
      ) : null}

      {connectionTestResult?.status === 'failed' ? (
        <Alert
          data-slot="source-import-connection-test-failure"
          aria-live="assertive"
          aria-atomic="true"
          variant="destructive"
          className="border-red-700 bg-red-950/30 px-3 py-2 text-sm text-red-100"
        >
          <AlertTitle>{copy.connection.testFailed}</AlertTitle>
          <AlertDescription className="text-xs text-red-100/85">
            {copy.connection.testFailedDetail}
          </AlertDescription>
        </Alert>
      ) : null}

      {connectionTestResult?.status === 'passed' ? (
        <div
          data-slot="source-import-connection-test-success"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-emerald-800/70 bg-emerald-950/20 px-3 py-2 text-xs leading-4 text-emerald-200"
        >
          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium">{copy.connection.testPassed}</span>
          <span className="text-emerald-300/80">
            {connectionTestResult.objectCount} {copy.connection.reachableObjects}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function ConnectionStep({
  connections,
  selectedConnection,
  createConnectionFormOpen,
  createConnectionForm,
  renameConnectionFormOpen,
  renameConnectionForm,
  isLoadingConnections,
  isCreatingConnection,
  isRenamingConnection,
  isTestingConnection,
  connectionTestResult,
  loadError,
  createConnectionError,
  createConnectionErrorCode,
  renameConnectionError,
  renameConnectionSucceeded,
  onSelectConnection,
  onOpenCreateConnectionForm,
  onCancelCreateConnectionForm,
  onCreateConnectionFormChange,
  onOpenRenameConnectionForm,
  onCancelRenameConnectionForm,
  onRenameConnectionNameChange,
  onCreateConnection,
  onTestConnection,
  onRenameConnection,
}: ConnectionStepProps) {
  const { copy } = useSourceImportLocalization();
  const [searchValue, setSearchValue] = useState('');
  const selectedConnectionOptionRef = useRef<HTMLButtonElement | null>(null);
  const renameConnectionActionRef = useRef<HTMLButtonElement | null>(null);
  const selectedConnectionObject = connections.find(
    (connection) => connection.id === selectedConnection
  );
  const isConnectionActionBusy =
    isCreatingConnection || isRenamingConnection || isTestingConnection;
  const visibleConnections = useMemo(
    () => filterConnections(connections, searchValue),
    [connections, searchValue]
  );

  useEffect(() => {
    const selectedOption = selectedConnectionOptionRef.current;
    if (
      !selectedConnection ||
      !selectedOption ||
      typeof selectedOption.scrollIntoView !== 'function'
    ) {
      return;
    }

    selectedOption.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [selectedConnection]);

  const cancelRenameConnection = () => {
    onCancelRenameConnectionForm();
    queueMicrotask(() => renameConnectionActionRef.current?.focus());
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-lg font-medium">{copy.connection.title}</h3>
          <Badge variant="outline">{copy.connection.databaseBadge}</Badge>
        </div>
        <p className="mb-4 text-sm text-slate-300">{copy.connection.description}</p>
      </div>

      <div className="space-y-2">
        {isLoadingConnections ? (
          <Card className="flex items-center gap-3 border-slate-600 p-4 text-slate-300">
            <Loader2 className="size-4 animate-spin" />
            {copy.connection.loading}
          </Card>
        ) : (
          <>
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
              <div
                data-slot="source-import-connection-summary"
                className="mb-2 flex min-w-0 flex-col items-stretch gap-3 text-xs text-slate-300 md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0">
                  <div>{formatConnectionCatalogSummary(connections.length, copy.connection)}</div>
                  <div className="truncate text-slate-400">{copy.connection.catalogSource}</div>
                </div>
                <div
                  data-slot="source-import-connection-actions"
                  className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 md:w-auto md:shrink-0"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full min-w-0"
                    disabled={isConnectionActionBusy}
                    onClick={onOpenCreateConnectionForm}
                  >
                    {copy.connection.createAction}
                  </Button>
                  <Button
                    ref={renameConnectionActionRef}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full min-w-0"
                    disabled={!selectedConnection || isConnectionActionBusy}
                    onClick={onOpenRenameConnectionForm}
                  >
                    {copy.connection.renameAction}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full min-w-0"
                    disabled={!selectedConnection || isConnectionActionBusy}
                    onClick={onTestConnection}
                  >
                    {isTestingConnection
                      ? copy.connection.testingAction
                      : copy.connection.testAction}
                  </Button>
                </div>
              </div>
              <label className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2">
                <Search className="size-4 shrink-0 text-slate-400" />
                <input
                  data-slot="source-import-connection-search"
                  value={searchValue}
                  aria-label={copy.connection.searchLabel}
                  placeholder={copy.connection.searchLabel}
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  onInput={(event) => setSearchValue(event.currentTarget.value)}
                  onChange={(event) => setSearchValue(event.currentTarget.value)}
                />
              </label>
            </div>

            {createConnectionFormOpen ? (
              <WarehouseConnectionCreateForm
                form={createConnectionForm}
                isCreating={isCreatingConnection}
                error={createConnectionError}
                errorCode={createConnectionErrorCode}
                onFieldChange={onCreateConnectionFormChange}
                onCancel={onCancelCreateConnectionForm}
                onSubmit={onCreateConnection}
              />
            ) : null}

            {renameConnectionFormOpen && selectedConnectionObject ? (
              <WarehouseConnectionRenameForm
                currentName={selectedConnectionObject.name}
                form={renameConnectionForm}
                isRenaming={isRenamingConnection}
                error={renameConnectionError}
                onNameChange={onRenameConnectionNameChange}
                onCancel={cancelRenameConnection}
                onSubmit={onRenameConnection}
              />
            ) : null}

            {connections.length === 0 ? (
              <Card className="border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
                <div className="font-medium text-slate-100">{copy.connection.empty}</div>
                <div className="mt-1">{copy.connection.emptyHint}</div>
              </Card>
            ) : visibleConnections.length === 0 ? (
              <Card className="border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
                {copy.connection.noMatches}
              </Card>
            ) : (
              visibleConnections.map((connection) => {
                const isSelected = selectedConnection === connection.id;

                return (
                  <button
                    type="button"
                    key={connection.id}
                    ref={isSelected ? selectedConnectionOptionRef : undefined}
                    data-slot="source-import-connection-option"
                    aria-pressed={isSelected}
                    className={`flex w-full min-w-0 flex-col gap-6 overflow-hidden rounded-xl border bg-card p-4 text-left text-card-foreground transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-slate-600 hover:border-gray-600'
                    }`}
                    onClick={() => onSelectConnection(connection.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <Database className="size-5 shrink-0 text-blue-400" />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{connection.name}</div>
                          <div className="text-xs text-slate-300">
                            {connection.type} - {connection.database}
                          </div>
                          <div className="mt-1 truncate text-[11px] text-slate-400">
                            {connection.id}
                          </div>
                        </div>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="size-5 shrink-0 text-blue-400" />
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}

            <ConnectionFeedback
              loadError={loadError}
              connectionTestResult={connectionTestResult}
              renameConnectionSucceeded={renameConnectionSucceeded}
            />
          </>
        )}
      </div>
    </div>
  );
}

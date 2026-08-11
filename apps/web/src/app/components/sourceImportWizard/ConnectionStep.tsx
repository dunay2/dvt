import { CheckCircle2, Database, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  CreateWarehouseConnectionInput,
  TestWarehouseConnectionResult,
  WarehouseConnection,
} from '../../ports/workspace';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { type SourceImportWizardCopy, useSourceImportWizardLocalization } from './copy';
import { WarehouseConnectionCreateForm } from './WarehouseConnectionCreateForm';

interface ConnectionStepProps {
  connections: WarehouseConnection[];
  selectedConnection: string | null;
  createConnectionFormOpen: boolean;
  createConnectionForm: CreateWarehouseConnectionInput;
  isLoadingConnections: boolean;
  isCreatingConnection: boolean;
  isTestingConnection: boolean;
  connectionTestResult: TestWarehouseConnectionResult | null;
  loadError: string | null;
  createConnectionError: string | null;
  onSelectConnection: (connectionId: string) => void;
  onOpenCreateConnectionForm: () => void;
  onCancelCreateConnectionForm: () => void;
  onCreateConnectionFormChange: <Field extends keyof CreateWarehouseConnectionInput>(
    field: Field,
    value: CreateWarehouseConnectionInput[Field]
  ) => void;
  onCreateConnection: () => void;
  onTestConnection: () => void;
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

export function ConnectionStep({
  connections,
  selectedConnection,
  createConnectionFormOpen,
  createConnectionForm,
  isLoadingConnections,
  isCreatingConnection,
  isTestingConnection,
  connectionTestResult,
  loadError,
  createConnectionError,
  onSelectConnection,
  onOpenCreateConnectionForm,
  onCancelCreateConnectionForm,
  onCreateConnectionFormChange,
  onCreateConnection,
  onTestConnection,
}: ConnectionStepProps) {
  const { copy } = useSourceImportWizardLocalization();
  const [searchValue, setSearchValue] = useState('');
  const selectedConnectionOptionRef = useRef<HTMLButtonElement | null>(null);
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

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-lg font-medium">{copy.connection.title}</h3>
          <Badge variant="outline">{copy.connection.databaseBadge}</Badge>
        </div>
        <p className="mb-4 text-sm text-slate-300">{copy.connection.description}</p>
      </div>

      {loadError ? (
        <Card className="border-red-700 bg-red-950/30 p-3 text-sm text-red-200">{loadError}</Card>
      ) : null}

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
                className="mb-2 flex flex-wrap items-start justify-between gap-3 text-xs text-slate-300"
              >
                <div className="min-w-0">
                  <div>{formatConnectionCatalogSummary(connections.length, copy.connection)}</div>
                  <div className="truncate text-slate-400">{copy.connection.catalogSource}</div>
                </div>
                <div
                  data-slot="source-import-connection-actions"
                  className="flex min-w-0 flex-wrap gap-2"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCreatingConnection}
                    onClick={onOpenCreateConnectionForm}
                  >
                    {copy.connection.createAction}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedConnection || isTestingConnection}
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
                onFieldChange={onCreateConnectionFormChange}
                onCancel={onCancelCreateConnectionForm}
                onSubmit={onCreateConnection}
              />
            ) : null}

            {connectionTestResult ? (
              <Card
                className={
                  connectionTestResult.status === 'passed'
                    ? 'border-emerald-700 bg-emerald-950/30 p-3 text-sm text-emerald-100'
                    : 'border-red-700 bg-red-950/30 p-3 text-sm text-red-100'
                }
              >
                <div className="font-medium">
                  {connectionTestResult.status === 'passed'
                    ? copy.connection.testPassed
                    : copy.connection.testFailed}
                </div>
                <div className="mt-1 text-xs opacity-85">
                  {connectionTestResult.status === 'passed'
                    ? `${connectionTestResult.objectCount} ${copy.connection.reachableObjects}`
                    : connectionTestResult.message}
                </div>
              </Card>
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
          </>
        )}
      </div>
    </div>
  );
}

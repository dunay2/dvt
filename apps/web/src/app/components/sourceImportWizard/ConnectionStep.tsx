import { CheckCircle2, Database, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  CreateWarehouseConnectionInput,
  RenameWarehouseConnectionInput,
  WarehouseConnection,
} from '../../ports/workspace';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  resolveSourceImportFailureMessage,
  type SourceImportWizardCopy,
  useSourceImportLocalization,
} from './copy';
import type { SourceImportConnectionTestBinding } from './sourceImportConnectionTest.binding';
import type { SourceImportFailureCode } from './types';
import { WarehouseConnectionCreateForm } from './WarehouseConnectionCreateForm';
import { WarehouseConnectionRenameForm } from './WarehouseConnectionRenameForm';
import styles from './ConnectionStep.module.css';

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
  testBinding: SourceImportConnectionTestBinding;
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
  testBinding: SourceImportConnectionTestBinding;
  renameConnectionSucceeded: boolean;
}

function ConnectionFeedback({
  loadError,
  testBinding,
  renameConnectionSucceeded,
}: ConnectionFeedbackProps) {
  const { copy } = useSourceImportLocalization();
  const connectionTestResult =
    testBinding.model.status === 'succeeded' ? testBinding.model.value : null;
  const testError =
    testBinding.model.status === 'failed'
      ? resolveSourceImportFailureMessage(copy, testBinding.model.failure)
      : null;
  const hasFeedback =
    loadError !== null ||
    testError !== null ||
    connectionTestResult !== null ||
    renameConnectionSucceeded;

  if (!hasFeedback) return null;

  return (
    <div data-slot="source-import-connection-feedback" className={styles.feedback}>
      {loadError ? (
        <Alert
          data-slot="source-import-connection-load-error"
          aria-live="assertive"
          aria-atomic="true"
          variant="destructive"
          className={styles.loadError}
        >
          <AlertDescription className={styles.loadErrorDescription}>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {renameConnectionSucceeded ? (
        <div
          data-slot="source-import-rename-connection-success"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={styles.renameSuccess}
        >
          {copy.connection.renameSuccess}
        </div>
      ) : null}

      {testError !== null || connectionTestResult?.status === 'failed' ? (
        <Alert
          data-slot="source-import-connection-test-failure"
          aria-live="assertive"
          aria-atomic="true"
          variant="destructive"
          className={styles.testFailure}
        >
          <AlertTitle>{copy.connection.testFailed}</AlertTitle>
          <AlertDescription className={styles.testFailureDescription}>
            {testError ?? copy.connection.testFailedDetail}
          </AlertDescription>
        </Alert>
      ) : null}

      {connectionTestResult?.status === 'passed' ? (
        <div
          data-slot="source-import-connection-test-success"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={styles.testSuccess}
        >
          <CheckCircle2 className={styles.successIcon} aria-hidden="true" />
          <span className={styles.feedbackTitle}>{copy.connection.testPassed}</span>
          <span className={styles.reachableObjects}>
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
  testBinding,
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
  onRenameConnection,
}: ConnectionStepProps) {
  const { copy } = useSourceImportLocalization();
  const [searchValue, setSearchValue] = useState('');
  const selectedConnectionOptionRef = useRef<HTMLButtonElement | null>(null);
  const renameConnectionActionRef = useRef<HTMLButtonElement | null>(null);
  const selectedConnectionObject = connections.find(
    (connection) => connection.id === selectedConnection
  );
  const isTestingConnection = testBinding.model.status === 'loading';
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
    <div className={styles.root}>
      <div>
        <div className={styles.heading}>
          <h3 className={styles.title}>{copy.connection.title}</h3>
          <Badge variant="outline">{copy.connection.databaseBadge}</Badge>
        </div>
        <p className={styles.description}>{copy.connection.description}</p>
      </div>

      <div className={styles.list}>
        {isLoadingConnections ? (
          <Card className={styles.loading}>
            <Loader2 className={styles.spinner} />
            {copy.connection.loading}
          </Card>
        ) : (
          <>
            <div className={styles.catalogControls}>
              <div data-slot="source-import-connection-summary" className={styles.summary}>
                <div className={styles.summaryText}>
                  <div>{formatConnectionCatalogSummary(connections.length, copy.connection)}</div>
                  <div className={styles.catalogSource}>{copy.connection.catalogSource}</div>
                </div>
                <div data-slot="source-import-connection-actions" className={styles.actions}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={styles.action}
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
                    className={styles.action}
                    disabled={!selectedConnection || isConnectionActionBusy}
                    onClick={onOpenRenameConnectionForm}
                  >
                    {copy.connection.renameAction}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={styles.action}
                    disabled={!selectedConnection || isConnectionActionBusy}
                    onClick={() => void testBinding.test()}
                  >
                    {isTestingConnection
                      ? copy.connection.testingAction
                      : copy.connection.testAction}
                  </Button>
                </div>
              </div>
              <label className={styles.search}>
                <Search className={styles.searchIcon} />
                <input
                  data-slot="source-import-connection-search"
                  value={searchValue}
                  aria-label={copy.connection.searchLabel}
                  placeholder={copy.connection.searchLabel}
                  className={styles.searchInput}
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
              <Card className={styles.empty}>
                <div className={styles.emptyTitle}>{copy.connection.empty}</div>
                <div className={styles.emptyHint}>{copy.connection.emptyHint}</div>
              </Card>
            ) : visibleConnections.length === 0 ? (
              <Card className={styles.empty}>{copy.connection.noMatches}</Card>
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
                    className={styles.connectionOption}
                    onClick={() => onSelectConnection(connection.id)}
                  >
                    <div className={styles.connectionRow}>
                      <div className={styles.connectionIdentity}>
                        <Database className={styles.connectionIcon} />
                        <div className={styles.connectionText}>
                          <div className={styles.connectionName}>{connection.name}</div>
                          <div className={styles.connectionDetails}>
                            {connection.type} - {connection.database}
                          </div>
                          <div className={styles.connectionId}>{connection.id}</div>
                        </div>
                      </div>
                      {isSelected ? <CheckCircle2 className={styles.connectionIcon} /> : null}
                    </div>
                  </button>
                );
              })
            )}

            <ConnectionFeedback
              loadError={loadError}
              testBinding={testBinding}
              renameConnectionSucceeded={renameConnectionSucceeded}
            />
          </>
        )}
      </div>
    </div>
  );
}

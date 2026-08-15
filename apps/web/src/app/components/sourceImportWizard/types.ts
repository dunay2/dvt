import type {
  CreateWarehouseConnectionInput,
  ImportSourcesResult,
  RelationalSourceObject,
  SourceObject,
  TestWarehouseConnectionResult,
  WarehouseConnection,
  RenameWarehouseConnectionInput,
} from '../../ports/workspace';
import type { SourceImportOptionContribution } from '../../plugins/registry';

export interface SourceImportWizardProps {
  open: boolean;
  canvasId: string;
  onClose: () => void;
  onRestoreFocus?: () => void;
  onComplete?: (result: ImportSourcesResult) => void;
  onConnectionRenamed?: (connection: WarehouseConnection) => void | Promise<void>;
  sourceImportOptions?: readonly SourceImportOptionContribution[];
  initialSelection?: SourceImportInitialSelection | null;
}

export type SourceImportInitialSelection = Readonly<{
  connectionId: string;
  sourceObjects: readonly SourceObject[];
}>;

export type WizardStep = 'connection' | 'selection' | 'grouping' | 'options' | 'review' | 'result';

export type SourceImportSection = 'connections' | 'browse' | 'metadata' | 'selected';

export const SOURCE_IMPORT_GROUPING_STRATEGIES = ['schema', 'database'] as const;

export type SourceImportGroupingStrategy = (typeof SOURCE_IMPORT_GROUPING_STRATEGIES)[number];

export type SelectableSourceObject = SourceObject & {
  selected: boolean;
};

export type SelectableRelationalSourceObject = RelationalSourceObject & {
  selected: boolean;
};

export type SourceImportSchemaIdentity = Readonly<{
  database: string;
  schema: string;
}>;

export type SourceImportDatabaseIdentity = Readonly<{
  database: string;
}>;

export type SourceImportFailureCode =
  | 'select-connection'
  | 'load-connections'
  | 'load-source-objects'
  | 'test-connection'
  | 'create-connection-validation'
  | 'create-connection-credential-reference'
  | 'create-connection'
  | 'connection-name-conflict'
  | 'rename-connection-validation'
  | 'rename-connection'
  | 'import-sources';

export type SourceImportFailure = Readonly<{
  code: SourceImportFailureCode;
  diagnostic: string | null;
}>;

export function buildSourceImportFailure(
  code: SourceImportFailureCode,
  cause?: unknown
): SourceImportFailure {
  return {
    code,
    diagnostic: cause instanceof Error ? cause.message : null,
  };
}

export interface SourceImportWizardState {
  currentStep: WizardStep;
  connections: WarehouseConnection[];
  selectedConnection: string | null;
  createConnectionFormOpen: boolean;
  createConnectionForm: CreateWarehouseConnectionInput;
  renameConnectionFormOpen: boolean;
  renameConnectionForm: RenameWarehouseConnectionInput;
  sourceObjects: SelectableSourceObject[];
  groupingStrategy: SourceImportGroupingStrategy;
  includeColumns: boolean;
  addTests: boolean;
  addFreshness: boolean;
  isProcessing: boolean;
  isLoadingConnections: boolean;
  isLoadingSourceObjects: boolean;
  isCreatingConnection: boolean;
  isRenamingConnection: boolean;
  isTestingConnection: boolean;
  connectionTestResult: TestWarehouseConnectionResult | null;
  loadError: SourceImportFailure | null;
  createConnectionError: SourceImportFailure | null;
  renameConnectionError: SourceImportFailure | null;
  renameConnectionSucceeded: boolean;
  importResult: ImportSourcesResult | null;
  activeSourceObjectKey: string | null;
  sourceObjectSearchQuery: string;
}

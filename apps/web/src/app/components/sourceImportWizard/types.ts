import type {
  CreateWarehouseConnectionInput,
  ImportSourcesResult,
  RelationalSourceObject,
  SourceObject,
  TestWarehouseConnectionResult,
  WarehouseConnection,
} from '../../ports/workspace';
import type { SourceImportOptionContribution } from '../../plugins/registry';

export interface SourceImportWizardProps {
  open: boolean;
  canvasId: string;
  onClose: () => void;
  onComplete?: (result: ImportSourcesResult) => void;
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

export interface SourceImportWizardState {
  currentStep: WizardStep;
  connections: WarehouseConnection[];
  selectedConnection: string | null;
  createConnectionFormOpen: boolean;
  createConnectionForm: CreateWarehouseConnectionInput;
  sourceObjects: SelectableSourceObject[];
  groupingStrategy: SourceImportGroupingStrategy;
  includeColumns: boolean;
  addTests: boolean;
  addFreshness: boolean;
  isProcessing: boolean;
  isLoadingConnections: boolean;
  isLoadingSourceObjects: boolean;
  isCreatingConnection: boolean;
  isTestingConnection: boolean;
  connectionTestResult: TestWarehouseConnectionResult | null;
  loadError: string | null;
  createConnectionError: string | null;
  importResult: ImportSourcesResult | null;
  activeSourceObjectKey: string | null;
  sourceObjectSearchQuery: string;
}

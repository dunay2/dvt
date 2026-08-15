/** Owned concern: define dbt source YAML artifact DTOs for warehouse source import. */
import type { RelationalSourceObject } from '@dvt/contracts';

import type { SourceImportGrouping } from '../ports/warehouseSourceImport.js';

export type ConnectedRelationalSourceObject = RelationalSourceObject & {
  readonly connectionId: string;
};

export type SourceYamlMetadata = Readonly<Record<string, unknown>>;

export type SourceYamlColumn = {
  readonly name: string;
  readonly dataType?: string;
  readonly tests?: readonly unknown[];
  readonly metadata: SourceYamlMetadata;
};

export type SourceYamlTable = {
  readonly name: string;
  readonly identifier?: string;
  readonly columns: readonly SourceYamlColumn[];
  readonly metadata: SourceYamlMetadata;
};

export type GeneratedSourceYamlFreshness = {
  readonly warnAfterCount: number;
  readonly warnAfterPeriod: 'hour';
  readonly errorAfterCount: number;
  readonly errorAfterPeriod: 'hour';
};

export type SourceYamlFreshness = GeneratedSourceYamlFreshness | SourceYamlMetadata;

export type SourceYamlSource = {
  readonly name: string;
  readonly database?: string;
  readonly schema?: string;
  readonly freshness?: SourceYamlFreshness;
  readonly tables: readonly SourceYamlTable[];
  readonly metadata: SourceYamlMetadata;
};

export type SourceYamlDocument = {
  readonly sources: readonly SourceYamlSource[];
  readonly metadata: SourceYamlMetadata;
};

export type WarehouseSourceYamlArtifactDescriptor = {
  readonly pluginId: string;
  readonly artifactKind: string;
  readonly pathForSourceObject: (
    sourceObject: ConnectedRelationalSourceObject,
    groupingStrategy: SourceImportGrouping
  ) => string;
  readonly sourceNameForSourceObject: (sourceObject: ConnectedRelationalSourceObject) => string;
  readonly tableNameForSourceObject: (sourceObject: ConnectedRelationalSourceObject) => string;
  readonly generatedFreshness: GeneratedSourceYamlFreshness;
  readonly reservedKeys: {
    readonly document: readonly string[];
    readonly source: readonly string[];
    readonly table: readonly string[];
    readonly column: readonly string[];
  };
};

export class InvalidWarehouseSourceYamlError extends Error {
  public constructor(readonly cause: unknown) {
    super('Existing dbt source YAML could not be parsed.');
    this.name = 'InvalidWarehouseSourceYamlError';
  }
}

export type WarehouseSourceYamlUpdate = {
  readonly path: string;
  readonly content: string;
};

export type WarehouseSourceYamlBinding = {
  readonly path: string;
  readonly sourceName: string;
  readonly tableName: string;
};

export type BuildWarehouseSourceYamlBindingsInput = {
  readonly sourceObjects: readonly ConnectedRelationalSourceObject[];
  readonly groupingStrategy: SourceImportGrouping;
  readonly existingFiles: ReadonlyMap<string, string>;
};

export type BuildWarehouseSourceYamlUpdatesInput = {
  readonly sourceObjects: readonly ConnectedRelationalSourceObject[];
  readonly databaseUser?: string;
  readonly groupingStrategy: SourceImportGrouping;
  readonly includeColumns: boolean;
  readonly addTests: boolean;
  readonly addFreshness: boolean;
  readonly existingFiles: ReadonlyMap<string, string>;
};

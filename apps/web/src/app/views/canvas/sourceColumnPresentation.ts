/** Owned concern: project existing Inspector facts into the Source Columns A-v2 presentation DTO. */
import type {
  NodePropertiesReadModel,
  NodePropertySection,
  NodePropertyTableRow,
} from '../../components/inspector/nodePropertiesReadModel';

export type SourceColumnBadge = 'PK' | 'FK' | 'UK' | 'IDX' | 'NN';
export type SourceColumnNullability = 'not-null' | 'nullable' | 'unknown';
export type SourceColumnTypeFamily =
  | 'text'
  | 'number'
  | 'boolean'
  | 'structured'
  | 'uuid'
  | 'datetime'
  | 'network'
  | 'generic';

export type SourceColumnPresentation = Readonly<{
  id: string;
  name: string;
  physicalType: string;
  typeFamily: SourceColumnTypeFamily;
  nullability: SourceColumnNullability;
  badges: readonly SourceColumnBadge[];
  defaultValue?: string;
  databaseComment?: string;
  foreignKeyTargets: readonly string[];
  uniqueKeyNames: readonly string[];
  indexNames: readonly string[];
}>;

function sectionById(
  model: NodePropertiesReadModel,
  id: NodePropertySection['id']
): NodePropertySection | undefined {
  return model.sections.find((section) => section.id === id);
}

function cell(row: NodePropertyTableRow, key: string): string {
  return row.cells[key]?.trim() ?? '';
}

function splitColumns(value: string): readonly string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function includesColumn(row: NodePropertyTableRow, cellName: string, columnName: string): boolean {
  return splitColumns(cell(row, cellName)).includes(columnName);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter(Boolean))];
}

export function classifySourceColumnType(type: string): SourceColumnTypeFamily {
  const normalized = type.trim().toLowerCase();

  if (/\b(jsonb?|struct|map|array|variant|object)\b/.test(normalized)) return 'structured';
  if (/\buuid\b/.test(normalized)) return 'uuid';
  if (/\b(date|time|timestamp|timestamptz|timetz|datetime)\b/.test(normalized)) return 'datetime';
  if (/\b(inet|cidr|macaddr|network)\b/.test(normalized)) return 'network';
  if (/\b(bool|boolean)\b/.test(normalized)) return 'boolean';
  if (/\b(smallint|integer|bigint|int\d*|serial|bigserial|numeric|decimal|number|real|float\d*|double)\b/.test(normalized)) {
    return 'number';
  }
  if (/\b(text|varchar|char|character|string|clob|enum)\b/.test(normalized)) return 'text';
  return 'generic';
}

function resolveNullability(row: NodePropertyTableRow): SourceColumnNullability {
  const value = cell(row, 'nullable').toLowerCase();
  if (value === 'not null') return 'not-null';
  if (value === 'nullable') return 'nullable';
  return 'unknown';
}

function resolveForeignKeyTargets(
  foreignKeys: readonly NodePropertyTableRow[],
  columnName: string
): readonly string[] {
  return uniqueStrings(
    foreignKeys.flatMap((row): readonly string[] => {
      const localColumns = splitColumns(cell(row, 'localColumns'));
      const localIndex = localColumns.indexOf(columnName);
      if (localIndex < 0) return [];

      const referencedTable = cell(row, 'referencedTable');
      const referencedColumns = splitColumns(cell(row, 'referencedColumns'));
      const referencedColumn = referencedColumns[localIndex];
      if (!referencedTable) return [];
      return [referencedColumn ? `${referencedTable}.${referencedColumn}` : referencedTable];
    })
  );
}

export function projectSourceColumns(
  model: NodePropertiesReadModel
): readonly SourceColumnPresentation[] {
  const columns = sectionById(model, 'columns')?.tableRows ?? [];
  const keys = sectionById(model, 'keys')?.tableRows ?? [];
  const indexes = sectionById(model, 'indexes')?.tableRows ?? [];
  const foreignKeys = sectionById(model, 'foreign-keys')?.tableRows ?? [];

  return columns.map((row) => {
    const name = cell(row, 'name') || row.id;
    const physicalType = cell(row, 'type') || 'unknown';
    const nullability = resolveNullability(row);
    const primaryKey = cell(row, 'key').toUpperCase() === 'PK';
    const uniqueKeyNames = uniqueStrings(
      keys
        .filter(
          (keyRow) =>
            cell(keyRow, 'type').toLowerCase() === 'unique' &&
            includesColumn(keyRow, 'columns', name)
        )
        .map((keyRow) => cell(keyRow, 'name'))
    );
    const indexNames = uniqueStrings(
      indexes
        .filter((indexRow) => includesColumn(indexRow, 'columns', name))
        .map((indexRow) => cell(indexRow, 'name'))
    );
    const foreignKeyTargets = resolveForeignKeyTargets(foreignKeys, name);
    const badges: SourceColumnBadge[] = [];

    if (primaryKey) badges.push('PK');
    if (foreignKeyTargets.length > 0) badges.push('FK');
    if (uniqueKeyNames.length > 0) badges.push('UK');
    if (indexNames.length > 0) badges.push('IDX');
    if (!primaryKey && nullability === 'not-null') badges.push('NN');

    const defaultValue = cell(row, 'default');
    const databaseComment = cell(row, 'comment');

    return {
      id: row.id,
      name,
      physicalType,
      typeFamily: classifySourceColumnType(physicalType),
      nullability,
      badges,
      ...(defaultValue ? { defaultValue } : {}),
      ...(databaseComment ? { databaseComment } : {}),
      foreignKeyTargets,
      uniqueKeyNames,
      indexNames,
    };
  });
}

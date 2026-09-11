export function loadSemanticWorkbenchDataset(input: unknown) {
  type ColumnType = 'integer' | 'numeric' | 'text' | 'boolean' | 'timestamp';
  type Value = string | number | boolean;
  const columnTypes = new Set<ColumnType>(['integer', 'numeric', 'text', 'boolean', 'timestamp']);
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  const requireTrimmedString = (record: Record<string, unknown>, key: string): string => {
    const value = record[key];
    if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
      throw new Error(`Semantic Workbench dataset field "${key}" must be a non-blank string.`);
    }
    return value;
  };
  const valueMatchesType = (value: unknown, type: ColumnType): boolean => {
    switch (type) {
      case 'integer':
        return typeof value === 'number' && Number.isInteger(value);
      case 'numeric':
        return typeof value === 'number' && Number.isFinite(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'timestamp':
        return typeof value === 'string' && !Number.isNaN(Date.parse(value));
      case 'text':
        return typeof value === 'string';
    }
  };

  if (!isRecord(input)) throw new Error('Semantic Workbench dataset must be an object.');
  if (input.schemaVersion !== 'semantic-workbench-dataset.v1') {
    throw new Error('Semantic Workbench dataset schema version is unsupported.');
  }

  const displayName = requireTrimmedString(input, 'displayName');
  const schema = requireTrimmedString(input, 'schema');
  const tableName = requireTrimmedString(input, 'tableName');
  const observedAt = requireTrimmedString(input, 'observedAt');
  if (
    !Number.isFinite(Date.parse(observedAt)) ||
    new Date(observedAt).toISOString() !== observedAt
  ) {
    throw new Error(`${tableName} observedAt must be a canonical ISO-8601 timestamp.`);
  }
  const primaryKey = requireTrimmedString(input, 'primaryKey');
  if (!Array.isArray(input.columns) || input.columns.length === 0) {
    throw new Error(`${tableName} must declare at least one column.`);
  }

  const columnNames = new Set<string>();
  const columns = input.columns.map((value) => {
    if (!isRecord(value)) throw new Error(`${tableName} columns must be objects.`);
    const name = requireTrimmedString(value, 'name');
    const type = value.type;
    if (typeof type !== 'string' || !columnTypes.has(type as ColumnType)) {
      throw new Error(`${tableName} column "${name}" has an unsupported type.`);
    }
    if (columnNames.has(name)) throw new Error(`${tableName} column "${name}" is duplicated.`);
    columnNames.add(name);
    return Object.freeze({ name, type: type as ColumnType });
  });
  if (!columnNames.has(primaryKey)) {
    throw new Error(`${tableName} primary key "${primaryKey}" is not a declared column.`);
  }
  if (!Array.isArray(input.rows)) throw new Error(`${tableName} rows must be an array.`);

  const primaryValues = new Set<Value>();
  const rows = input.rows.map((value, index) => {
    if (!isRecord(value)) throw new Error(`${tableName} row ${index + 1} must be an object.`);
    const unknownKey = Object.keys(value).find((key) => !columnNames.has(key));
    if (unknownKey != null) {
      throw new Error(`${tableName} row ${index + 1} field "${unknownKey}" is not declared.`);
    }
    const row: Record<string, Value> = {};
    columns.forEach((column) => {
      const fieldValue = value[column.name];
      if (!valueMatchesType(fieldValue, column.type)) {
        throw new Error(
          `${tableName} row ${index + 1} field "${column.name}" must be ${column.type}.`
        );
      }
      row[column.name] = fieldValue as Value;
    });
    const primaryValue = row[primaryKey]!;
    if (primaryValues.has(primaryValue)) {
      throw new Error(`${tableName} primary key "${primaryKey}" must be unique.`);
    }
    primaryValues.add(primaryValue);
    return Object.freeze(row);
  });

  return Object.freeze({
    schemaVersion: 'semantic-workbench-dataset.v1' as const,
    displayName,
    schema,
    tableName,
    observedAt,
    primaryKey,
    columns: Object.freeze(columns),
    rows: Object.freeze(rows),
  });
}

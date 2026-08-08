/** Owned concern: export and restore the complete current architecture catalog. */
const architectureStateTableNames = [
  'component',
  'design',
  'decision',
  'evidence',
  'component_health_check',
  'contract',
  'component_dependency_scan',
  'component_flow',
  'component_metric',
  'component_observability',
  'component_relation',
  'component_responsibility',
  'component_test',
  'component_transformation',
  'component_port',
  'component_event_io',
  'component_storage_io',
  'component_flow_step',
  'component_dependency_observation',
  'component_fitness_evaluation',
  'risk',
  'design_scope',
  'design_operations',
];
const architectureStateTableSet = new Set(architectureStateTableNames);
const postgresParameterLimit = 60000;
const jsonColumns = new Set([
  'component_dependency_observation.metadata',
  'component_dependency_scan.metadata',
  'component_fitness_evaluation.evidence',
  'component_relation.source_refs',
  'decision.applies_to',
  'design_operations.payload',
]);
const primaryKeyColumns = {
  component: ['component_id'],
  component_dependency_observation: ['observation_id'],
  component_dependency_scan: ['scan_id'],
  component_event_io: ['event_io_id'],
  component_fitness_evaluation: ['evaluation_id'],
  component_flow: ['flow_id'],
  component_flow_step: ['flow_id', 'step_order'],
  component_health_check: ['check_id'],
  component_metric: ['metric_id'],
  component_observability: ['observability_id'],
  component_port: ['port_id'],
  component_relation: ['relation_id'],
  component_responsibility: ['responsibility_id'],
  component_storage_io: ['storage_io_id'],
  component_test: ['test_id'],
  component_transformation: ['transformation_id'],
  contract: ['contract_id'],
  decision: ['decision_id'],
  design: ['design_id'],
  design_operations: ['operation_id'],
  design_scope: ['design_id', 'subject_kind', 'subject_id', 'scope_kind'],
  evidence: ['evidence_id'],
  risk: ['risk_id'],
};

function quoteIdentifier(value) {
  if (!/^[a-z][a-z0-9_]*$/u.test(value)) {
    throw new Error(`Invalid architecture state identifier "${value}".`);
  }
  return `"${value}"`;
}

function assertArchitectureState(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Planning DB canonical state must contain an architectureState object.');
  }
  for (const tableName of architectureStateTableNames) {
    if (!Array.isArray(snapshot[tableName])) {
      throw new Error(`Planning DB architecture state must contain ${tableName} rows.`);
    }
  }
  for (const tableName of Object.keys(snapshot)) {
    if (!architectureStateTableSet.has(tableName)) {
      throw new Error(`Planning DB architecture state contains unknown table ${tableName}.`);
    }
  }
  assertCurrentStateValue(snapshot, 'architectureState');
  return snapshot;
}

function assertCurrentStateValue(value, location = 'currentState') {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertCurrentStateValue(child, `${location}[${index}]`));
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'migrationState' || key === 'migration_state') {
        throw new Error(`Planning DB ${location} contains forbidden field ${key}.`);
      }
      assertCurrentStateValue(child, `${location}.${key}`);
    }
    return value;
  }
  if (typeof value !== 'string') {
    return value;
  }
  if (
    /tools\/planning-db\/migrations|scripts\/planning-db-migrate|pnpm planning:db:migrate|test:planning:db:migrations|schema_migrations|migration_state|current#rail-decision#|PreserveLocalFeatureMechanizationRails|mergeCanonicalFeatureMechanizationRails/iu.test(
      value
    )
  ) {
    throw new Error(`Planning DB ${location} contains forbidden history semantics.`);
  }
  return value;
}

function sortArchitectureState(snapshot) {
  const state = assertArchitectureState(snapshot);
  return Object.fromEntries(
    architectureStateTableNames.map((tableName) => {
      const rowsByPrimaryKey = new Map();
      for (const row of state[tableName]) {
        const key = primaryKeyColumns[tableName].map((column) => row[column]).join('\0');
        if (rowsByPrimaryKey.has(key)) {
          throw new Error(`Planning DB architecture state has duplicate ${tableName} key ${key}.`);
        }
        rowsByPrimaryKey.set(key, row);
      }
      return [
        tableName,
        [...rowsByPrimaryKey.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([, row]) => row),
      ];
    })
  );
}

async function readArchitectureState(client) {
  const state = {};
  for (const tableName of architectureStateTableNames) {
    const table = quoteIdentifier(tableName);
    const result = await client.query(
      `select row_to_json(current_row) as row
       from (select * from architecture.${table}) current_row
       order by row_to_json(current_row)::text`
    );
    state[tableName] = result.rows.map(({ row }) => row);
  }
  return sortArchitectureState(state);
}

async function restoreArchitectureState(client, snapshot) {
  const state = assertArchitectureState(snapshot);
  await client.query('set constraints all deferred');

  for (const tableName of architectureStateTableNames) {
    const rows = state[tableName];
    if (rows.length === 0) {
      continue;
    }
    const columns = Object.keys(rows[0]);
    if (columns.length === 0) {
      throw new Error(`Planning DB architecture state table ${tableName} has an empty row.`);
    }
    for (const row of rows) {
      if (JSON.stringify(Object.keys(row)) !== JSON.stringify(columns)) {
        throw new Error(`Planning DB architecture state table ${tableName} has unstable columns.`);
      }
    }

    const batchSize = Math.max(1, Math.floor(postgresParameterLimit / columns.length));
    for (let start = 0; start < rows.length; start += batchSize) {
      const batch = rows.slice(start, start + batchSize);
      const params = [];
      const valueGroups = batch.map((row) => {
        const placeholders = columns.map((column) => {
          quoteIdentifier(column);
          const value = row[column];
          params.push(
            value !== null && jsonColumns.has(`${tableName}.${column}`)
              ? JSON.stringify(value)
              : value
          );
          return `$${params.length}`;
        });
        return `(${placeholders.join(', ')})`;
      });
      await client.query(
        `insert into architecture.${quoteIdentifier(tableName)}
          (${columns.map(quoteIdentifier).join(', ')})
         values ${valueGroups.join(', ')}`,
        params
      );
    }
  }
}

module.exports = {
  architectureStateTableNames,
  assertArchitectureState,
  assertCurrentStateValue,
  readArchitectureState,
  restoreArchitectureState,
};

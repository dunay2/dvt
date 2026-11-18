/** Own SQL procedure recipes and their provider-specific transaction contracts. */
import { defineRecipe } from './templateCatalog';
import { field } from './templateParameters';
import procedure from './library/snowflake-procedure.sql?raw';
import stage from './library/stage-replace.sql?raw';
import merge from './library/incremental-merge.sql?raw';
import audit from './library/audit-series.sql?raw';

const common = {
  category: 'procedure',
  suffix: '.procedure.sql',
  fileNameField: 'procedureName',
} as const;
const name = (value: string) =>
  field(
    'procedureName',
    'identifier',
    value,
    ['Procedure name', 'Nombre del procedimiento'],
    ['Identifier for the generated procedure.', 'Identificador del procedimiento generado.']
  );
const source = field('sourceTable', 'table', 'raw.events', ['Source table', 'Tabla origen']);
const target = field('targetTable', 'table', 'analytics.events', ['Target table', 'Tabla destino']);
export const snowflakeProcedure = defineRecipe({
  ...common,
  id: 'snowflake-procedure',
  provider: 'Snowflake',
  referenceStyle: 'snowflake',
  labels: ['Snowflake Procedure', 'Procedimiento de Snowflake'],
  descriptions: [
    'Stored procedure scaffold for governed execution logic.',
    'Procedimiento de Snowflake Scripting con cuerpo SQL editable.',
  ],
  templateSource: procedure,
  parameters: [
    name('run_pipeline_step'),
    field('language', 'language', 'SQL', ['Language', 'Lenguaje']),
    field('procedureBody', 'sql', "return 'ok';", ['Procedure body', 'Cuerpo del procedimiento']),
  ],
});

export const procedureRecipes = [
  defineRecipe({
    ...common,
    id: 'stage-replace',
    provider: 'PostgreSQL',
    referenceStyle: 'postgresql',
    labels: ['Stage and replace a table', 'Preparar y reemplazar una tabla'],
    descriptions: [
      'Stage event_id, event_date and amount, check the minimum row count, then replace the target within the caller’s transaction.',
      'Carga event_id, event_date y amount en una tabla temporal, comprueba el mínimo de filas y reemplaza el destino dentro de la transacción.',
    ],
    templateSource: stage,
    parameters: [
      name('reload_events'),
      source,
      target,
      field(
        'cleanup',
        'cleanup',
        'delete from',
        ['Target cleanup', 'Limpieza de destino'],
        ['Use DELETE FROM or TRUNCATE TABLE.', 'Usa DELETE FROM o TRUNCATE TABLE.']
      ),
    ],
  }),
  defineRecipe({
    ...common,
    id: 'incremental-merge',
    provider: 'Snowflake',
    referenceStyle: 'snowflake',
    labels: ['Incremental event merge', 'Actualización incremental de eventos'],
    descriptions: [
      'Merge by event_id from a timestamp parameter. Each key requires a unique updated_at and ingest_seq ordering.',
      'Actualiza por event_id desde la fecha indicada. Cada clave requiere un orden único por updated_at e ingest_seq.',
    ],
    templateSource: merge,
    parameters: [name('merge_events'), source, target],
  }),
  defineRecipe({
    ...common,
    id: 'audit-series',
    provider: 'PostgreSQL',
    referenceStyle: 'postgresql',
    labels: ['Generate and audit a batch', 'Generar y auditar un lote'],
    descriptions: [
      'Insert numbered rows for a run ID and record the actual count and completion time in the same transaction.',
      'Inserta filas numeradas por ejecución y registra la cantidad y la hora de fin en la misma transacción.',
    ],
    templateSource: audit,
    parameters: [
      name('generate_batch'),
      { ...target, defaultValue: 'analytics.batch_items' },
      field('auditTable', 'table', 'analytics.batch_audit', ['Audit table', 'Tabla de auditoría']),
    ],
  }),
];

/** Own analytical models and the relation and calendar inputs required by each model. */
import { defineRecipe } from './templateCatalog';
import { field } from './templateParameters';
import calendar from './library/calendar.sql?raw';
import periods from './library/comparable-periods.sql?raw';
import latest from './library/latest-record.sql?raw';
import missing from './library/missing-days.sql?raw';
import inspect from './library/inspect-relation.sql?raw';

const dates = [
  field(
    'startDate',
    'date',
    '2024-01-01',
    ['First day', 'Primer día'],
    ['Inclusive start date (YYYY-MM-DD).', 'Fecha inicial inclusiva (AAAA-MM-DD).']
  ),
  field(
    'endDate',
    'date',
    '2024-12-31',
    ['Last day', 'Último día'],
    ['Inclusive end date (YYYY-MM-DD).', 'Fecha final inclusiva (AAAA-MM-DD).']
  ),
];
const model = field(
  'modelRelation',
  'dbtRelation',
  "{{ ref('stg_events') }}",
  ['Model reference', 'Referencia del modelo'],
  ['A dbt ref or source expression.', 'Expresión ref o source de dbt.']
);
const dbtModel = {
  category: 'model',
  provider: 'dbt · PostgreSQL',
  referenceStyle: 'dbt',
} as const;
export const modelRecipes = [
  defineRecipe({
    category: 'model',
    provider: 'PostgreSQL',
    referenceStyle: 'postgresql',
    id: 'inspect-relation',
    labels: ['Inspect a project model', 'Inspeccionar un modelo del proyecto'],
    descriptions: [
      'Select a bounded set of rows from a physical model. Add ORDER BY to choose a repeatable sample.',
      'Selecciona un conjunto acotado de filas de un modelo físico. Añade ORDER BY para que la muestra sea reproducible.',
    ],
    templateSource: inspect,
    parameters: [
      field(
        'modelRelation',
        'table',
        '',
        ['Model relation', 'Relación del modelo'],
        [
          'Choose a project model with a PostgreSQL relation.',
          'Elige un modelo del proyecto con una relación de PostgreSQL.',
        ]
      ),
      field(
        'rowLimit',
        'rowLimit',
        '100',
        ['Row limit', 'Límite de filas'],
        ['Enter a whole number from 1 to 1,000.', 'Introduce un número entero entre 1 y 1000.']
      ),
    ],
  }),
  defineRecipe({
    category: 'model',
    provider: 'PostgreSQL',
    referenceStyle: 'postgresql',
    id: 'calendar',
    labels: ['Calendar', 'Calendario'],
    descriptions: [
      'Build one row per day, including ISO weekday, start of week and start of month.',
      'Genera una fila por día con día ISO e inicio de semana y de mes.',
    ],
    templateSource: calendar,
    parameters: dates,
  }),
  defineRecipe({
    ...dbtModel,
    id: 'comparable-periods',
    labels: ['Comparable monthly periods', 'Períodos mensuales comparables'],
    descriptions: [
      'Compare event_date and amount with the previous calendar month. Missing months stay null.',
      'Compara event_date y amount con el mes natural anterior. Los meses ausentes conservan el valor nulo.',
    ],
    templateSource: periods,
    parameters: [model],
  }),
  defineRecipe({
    ...dbtModel,
    id: 'latest-record',
    labels: ['Latest record per key', 'Último registro por clave'],
    descriptions: [
      'Keep the latest event_id by updated_at and a unique ingestion sequence.',
      'Conserva el último event_id por updated_at y una secuencia de ingesta única.',
    ],
    templateSource: latest,
    parameters: [model],
  }),
  defineRecipe({
    ...dbtModel,
    id: 'missing-days',
    labels: ['Missing event days', 'Días sin eventos'],
    descriptions: [
      'Find expected dates with no matching event_date in the selected model.',
      'Encuentra las fechas esperadas que faltan en event_date del modelo.',
    ],
    templateSource: missing,
    parameters: [...dates, model],
  }),
];

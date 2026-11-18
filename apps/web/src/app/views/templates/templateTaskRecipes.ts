/** Own scheduled Snowflake task graphs and the portable workflow outline. */
import { defineRecipe } from './templateCatalog';
import { field } from './templateParameters';
import task from './library/snowflake-task.sql?raw';
import call from './library/scheduled-call.sql?raw';
import chain from './library/task-chain.sql?raw';
import diamond from './library/task-diamond.sql?raw';
import workflow from './library/etl-scaffold.yaml?raw';

const taskName = field(
  'taskName',
  'identifier',
  '',
  ['Task name', 'Nombre de la tarea'],
  ['Identifier for the generated Snowflake task.', 'Identificador de la tarea de Snowflake.']
);
const warehouse = field(
  'warehouse',
  'relation',
  '',
  ['Warehouse', 'Almacén de cómputo'],
  [
    'Snowflake warehouse that will own task execution capacity.',
    'Almacén de Snowflake que ejecutará la tarea.',
  ]
);
const schedule = field(
  'schedule',
  'literal',
  'USING CRON 0 * * * * UTC',
  ['Schedule', 'Programación'],
  ['Snowflake schedule expression.', 'Expresión de programación de Snowflake.']
);
const graphParameters = [
  { ...taskName, defaultValue: 'orders_batch' },
  { ...warehouse, defaultValue: 'analytics_wh' },
  schedule,
];
const root = field('extractProcedure', 'relation', 'pipeline.extract_orders', [
  'Extract procedure',
  'Procedimiento de extracción',
]);
const load = field('loadProcedure', 'relation', 'pipeline.publish_orders', [
  'Publish procedure',
  'Procedimiento de publicación',
]);
const common = {
  provider: 'Snowflake',
  category: 'task',
  referenceStyle: 'snowflake',
  fileNameField: 'taskName',
  suffix: '.task.sql',
} as const;

export const scheduledTask = defineRecipe({
  ...common,
  id: 'snowflake-task',
  labels: ['Snowflake Task', 'Tarea de Snowflake'],
  descriptions: [
    'Scheduled task scaffold for provider-facing SQL execution.',
    'Tarea programada para ejecutar una sentencia SQL.',
  ],
  templateSource: task,
  parameters: [
    taskName,
    warehouse,
    schedule,
    field(
      'sqlBody',
      'statement',
      'select 1;',
      ['SQL body', 'Cuerpo SQL'],
      [
        'SQL or procedure call rendered inside the task body.',
        'Sentencia SQL o llamada a un procedimiento.',
      ]
    ),
  ],
});

export const taskGraphs = [
  defineRecipe({
    ...common,
    id: 'scheduled-call',
    labels: ['Scheduled procedure call', 'Llamada programada'],
    descriptions: [
      'Call a procedure with one text argument on a recurring schedule.',
      'Llama a un procedimiento con un argumento de texto según una programación.',
    ],
    templateSource: call,
    parameters: [
      ...graphParameters,
      field('procedureName', 'relation', 'pipeline.load_orders', [
        'Procedure name',
        'Nombre del procedimiento',
      ]),
      field('batch', 'literal', 'daily', ['Batch argument', 'Argumento del lote']),
    ],
  }),
  defineRecipe({
    ...common,
    id: 'task-chain',
    labels: ['Sequential task chain', 'Cadena de tareas'],
    descriptions: [
      'Extract, publish and check in sequence. Only the root has a schedule.',
      'Extrae, publica y comprueba en secuencia. La raíz define la programación.',
    ],
    templateSource: chain,
    parameters: [
      ...graphParameters,
      root,
      load,
      field('checkProcedure', 'relation', 'pipeline.check_orders', [
        'Check procedure',
        'Procedimiento de comprobación',
      ]),
    ],
  }),
  defineRecipe({
    ...common,
    id: 'task-diamond',
    labels: ['Parallel branches and join', 'Ramas paralelas y unión'],
    descriptions: [
      'Start two tasks after extraction and publish after both predecessors succeed.',
      'Abre dos ramas tras la extracción y publica cuando terminen ambas.',
    ],
    templateSource: diamond,
    parameters: [
      ...graphParameters,
      root,
      field('leftProcedure', 'relation', 'pipeline.load_customers', [
        'Left procedure',
        'Procedimiento izquierdo',
      ]),
      field('rightProcedure', 'relation', 'pipeline.load_lines', [
        'Right procedure',
        'Procedimiento derecho',
      ]),
      load,
    ],
  }),
];

export const etlWorkflow = defineRecipe({
  id: 'etl-scaffold',
  labels: ['ETL Scaffold', 'Esquema ETL'],
  provider: 'DVT',
  category: 'workflow',
  referenceStyle: 'none',
  descriptions: [
    'Provider-neutral ETL job outline for review before backend contract work.',
    'Esquema de extracción, transformación y publicación para revisión.',
  ],
  templateSource: workflow,
  fileNameField: 'jobName',
  suffix: '.scaffold.yaml',
  parameters: [
    field('jobName', 'identifier', 'publish_orders', ['Job name', 'Nombre del proceso']),
    field('sourceRef', 'yaml', 'stg_orders', ['Source ref', 'Referencia de origen']),
    field('targetRef', 'yaml', 'fct_orders', ['Target ref', 'Referencia de destino']),
  ],
});

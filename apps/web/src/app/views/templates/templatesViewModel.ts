/** Owned concern: own execution-template catalog, parameter validation, and preview projection. */
export type ExecutionTemplateParameterDefinition = Readonly<{
  id: string;
  label: string;
  description: string;
  required: boolean;
  inputKind: 'text' | 'textarea';
  defaultValue: string;
  requiredMessage: string;
}>;

export type ExecutionTemplateDefinition = Readonly<{
  id: string;
  label: string;
  provider: string;
  description: string;
  exportFileName: string;
  parameters: readonly ExecutionTemplateParameterDefinition[];
  renderSource: (values: ExecutionTemplateParameterValues) => string;
  resolveExportFileName: (values: ExecutionTemplateParameterValues) => string;
}>;

export type ExecutionTemplateParameterValues = Readonly<Record<string, string>>;

export type ExecutionTemplatePreviewError = Readonly<{
  parameterId: string;
  message: string;
}>;

export type ExecutionTemplatePreview =
  | Readonly<{
      kind: 'blocked';
      errors: readonly ExecutionTemplatePreviewError[];
      exportFileName: string;
    }>
  | Readonly<{
      kind: 'ready';
      errors: readonly ExecutionTemplatePreviewError[];
      exportFileName: string;
      source: string;
    }>;

function valueOrDefault(
  values: ExecutionTemplateParameterValues,
  parameter: ExecutionTemplateParameterDefinition
): string {
  return values[parameter.id] ?? parameter.defaultValue;
}

function normalizeIdentifier(value: string): string {
  return value.trim().replaceAll(/\s+/g, '_').toLowerCase();
}

function renderSnowflakeTask(values: ExecutionTemplateParameterValues): string {
  const taskName = normalizeIdentifier(values.taskName ?? '');
  const warehouse = normalizeIdentifier(values.warehouse ?? '');
  const schedule = values.schedule?.trim() ?? '';
  const sqlBody = values.sqlBody?.trim() ?? '';

  return [
    `create or replace task ${taskName}`,
    `  warehouse = ${warehouse}`,
    `  schedule = '${schedule}'`,
    'as',
    `${sqlBody}`,
    ';',
  ].join('\n');
}

function renderSnowflakeProcedure(values: ExecutionTemplateParameterValues): string {
  const procedureName = normalizeIdentifier(values.procedureName ?? '');
  const language = (values.language ?? 'SQL').trim().toUpperCase();
  const body = values.procedureBody?.trim() ?? '';

  return [
    `create or replace procedure ${procedureName}()`,
    `returns string`,
    `language ${language}`,
    'as',
    '$$',
    body,
    '$$;',
  ].join('\n');
}

function renderEtlScaffold(values: ExecutionTemplateParameterValues): string {
  const jobName = normalizeIdentifier(values.jobName ?? '');
  const sourceRef = values.sourceRef?.trim() ?? '';
  const targetRef = values.targetRef?.trim() ?? '';

  return [
    `job: ${jobName}`,
    `source: ${sourceRef}`,
    `target: ${targetRef}`,
    'steps:',
    '  - validate_source',
    '  - transform',
    '  - publish_target',
  ].join('\n');
}

export const EXECUTION_TEMPLATE_CATALOG: readonly ExecutionTemplateDefinition[] = [
  {
    id: 'snowflake-task',
    label: 'Snowflake Task',
    provider: 'Snowflake',
    description: 'Scheduled task scaffold for provider-facing SQL execution.',
    exportFileName: 'snowflake-task.sql',
    parameters: [
      {
        id: 'taskName',
        label: 'Task name',
        description: 'Identifier for the generated Snowflake task.',
        required: true,
        inputKind: 'text',
        defaultValue: '',
        requiredMessage: 'Task name is required.',
      },
      {
        id: 'warehouse',
        label: 'Warehouse',
        description: 'Snowflake warehouse that will own task execution capacity.',
        required: true,
        inputKind: 'text',
        defaultValue: '',
        requiredMessage: 'Warehouse is required.',
      },
      {
        id: 'schedule',
        label: 'Schedule',
        description: 'Snowflake schedule expression.',
        required: true,
        inputKind: 'text',
        defaultValue: 'USING CRON 0 * * * * UTC',
        requiredMessage: 'Schedule is required.',
      },
      {
        id: 'sqlBody',
        label: 'SQL body',
        description: 'SQL or procedure call rendered inside the task body.',
        required: true,
        inputKind: 'textarea',
        defaultValue: 'select 1;',
        requiredMessage: 'SQL body is required.',
      },
    ],
    renderSource: renderSnowflakeTask,
    resolveExportFileName: (values) =>
      `${normalizeIdentifier(values.taskName || 'snowflake-task')}.task.sql`,
  },
  {
    id: 'snowflake-procedure',
    label: 'Snowflake Procedure',
    provider: 'Snowflake',
    description: 'Stored procedure scaffold for governed execution logic.',
    exportFileName: 'snowflake-procedure.sql',
    parameters: [
      {
        id: 'procedureName',
        label: 'Procedure name',
        description: 'Identifier for the generated procedure.',
        required: true,
        inputKind: 'text',
        defaultValue: 'run_pipeline_step',
        requiredMessage: 'Procedure name is required.',
      },
      {
        id: 'language',
        label: 'Language',
        description: 'Procedure language declaration.',
        required: true,
        inputKind: 'text',
        defaultValue: 'SQL',
        requiredMessage: 'Language is required.',
      },
      {
        id: 'procedureBody',
        label: 'Procedure body',
        description: 'Procedure implementation body.',
        required: true,
        inputKind: 'textarea',
        defaultValue: "return 'ok';",
        requiredMessage: 'Procedure body is required.',
      },
    ],
    renderSource: renderSnowflakeProcedure,
    resolveExportFileName: (values) =>
      `${normalizeIdentifier(values.procedureName || 'snowflake-procedure')}.procedure.sql`,
  },
  {
    id: 'etl-scaffold',
    label: 'ETL Scaffold',
    provider: 'DVT',
    description: 'Provider-neutral ETL job outline for review before backend contract work.',
    exportFileName: 'etl-scaffold.yaml',
    parameters: [
      {
        id: 'jobName',
        label: 'Job name',
        description: 'Identifier for the generated ETL scaffold.',
        required: true,
        inputKind: 'text',
        defaultValue: 'publish_orders',
        requiredMessage: 'Job name is required.',
      },
      {
        id: 'sourceRef',
        label: 'Source ref',
        description: 'Logical source artifact or model reference.',
        required: true,
        inputKind: 'text',
        defaultValue: 'stg_orders',
        requiredMessage: 'Source ref is required.',
      },
      {
        id: 'targetRef',
        label: 'Target ref',
        description: 'Logical target artifact or model reference.',
        required: true,
        inputKind: 'text',
        defaultValue: 'fct_orders',
        requiredMessage: 'Target ref is required.',
      },
    ],
    renderSource: renderEtlScaffold,
    resolveExportFileName: (values) =>
      `${normalizeIdentifier(values.jobName || 'etl-scaffold')}.scaffold.yaml`,
  },
] as const;

function requireDefaultExecutionTemplate(): ExecutionTemplateDefinition {
  const [defaultTemplate] = EXECUTION_TEMPLATE_CATALOG;
  if (!defaultTemplate) {
    throw new Error('Execution template catalog must contain at least one template.');
  }

  return defaultTemplate;
}

export function resolveExecutionTemplateSelection(
  templateId: string | null | undefined
): ExecutionTemplateDefinition {
  return (
    EXECUTION_TEMPLATE_CATALOG.find((template) => template.id === templateId) ??
    requireDefaultExecutionTemplate()
  );
}

export function createDefaultExecutionTemplateValues(
  template: ExecutionTemplateDefinition
): Record<string, string> {
  return Object.fromEntries(
    template.parameters.map((parameter) => [parameter.id, parameter.defaultValue])
  );
}

export function resolveExecutionTemplatePreview(
  template: ExecutionTemplateDefinition,
  values: ExecutionTemplateParameterValues
): ExecutionTemplatePreview {
  const resolvedValues = Object.fromEntries(
    template.parameters.map((parameter) => [parameter.id, valueOrDefault(values, parameter)])
  );
  const errors = template.parameters
    .filter((parameter) => parameter.required && valueOrDefault(values, parameter).trim() === '')
    .map((parameter) => ({
      parameterId: parameter.id,
      message: parameter.requiredMessage,
    }));

  if (errors.length > 0) {
    return {
      kind: 'blocked',
      errors,
      exportFileName: template.exportFileName,
    };
  }

  return {
    kind: 'ready',
    errors: [],
    exportFileName: template.resolveExportFileName(resolvedValues),
    source: template.renderSource(resolvedValues),
  };
}

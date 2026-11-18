/**
 * Own ListExecutionTemplateProfiles and GenerateExecutionTemplatePreview.
 * Git source files are data; substitution never evaluates SQL, Jinja or JavaScript.
 */
import { etlWorkflow, scheduledTask, taskGraphs } from './templateTaskRecipes';
import { procedureRecipes, snowflakeProcedure } from './templateProcedureRecipes';
import { modelRecipes } from './templateModelRecipes';
import { formatTemplateValue, templateText } from './templateParameters';
import type {
  ExecutionTemplateDefinition,
  ExecutionTemplateParameterValues,
} from './templateCatalog';

export { localizeExecutionTemplate } from './templateCatalog';
export type {
  ExecutionTemplateDefinition,
  ExecutionTemplateParameterValues,
} from './templateCatalog';
export type { ExecutionTemplateParameterDefinition } from './templateParameters';

export type ExecutionTemplatePreviewError = Readonly<{ parameterId: string; message: string }>;
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

export const EXECUTION_TEMPLATE_CATALOG: readonly ExecutionTemplateDefinition[] = [
  scheduledTask,
  snowflakeProcedure,
  etlWorkflow,
  ...taskGraphs,
  ...procedureRecipes,
  ...modelRecipes,
];

export function resolveExecutionTemplateSelection(
  templateId: string | null | undefined
): ExecutionTemplateDefinition {
  return EXECUTION_TEMPLATE_CATALOG.find((recipe) => recipe.id === templateId) ?? scheduledTask;
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
  values: ExecutionTemplateParameterValues,
  sourceOverride?: string
): ExecutionTemplatePreview {
  const source = sourceOverride ?? template.templateSource;
  const substituted = new Map<string, string>();
  const resolved: Record<string, string> = {};
  const errors: ExecutionTemplatePreviewError[] = [];
  for (const parameter of template.parameters) {
    const value = values[parameter.id] ?? parameter.defaultValue;
    resolved[parameter.id] = value;
    const formatted = formatTemplateValue(parameter.kind, value);
    if (formatted !== undefined) {
      substituted.set(parameter.id, formatted);
    } else {
      const invalid = templateText(['Invalid value', 'Valor no válido'], template.language);
      errors.push({
        parameterId: parameter.id,
        message: value.trim() ? `${invalid}: ${parameter.label}.` : parameter.requiredMessage,
      });
    }
  }
  const start = substituted.get('startDate');
  const end = substituted.get('endDate');
  if (start && end && start > end)
    errors.push({
      parameterId: 'endDate',
      message: templateText(
        [
          'The last day must be on or after the first day.',
          'El último día debe ser igual o posterior al primero.',
        ],
        template.language
      ),
    });

  const declared = new Set(template.parameters.map((parameter) => parameter.id));
  let sourceError = !source.trim();
  const rendered = source.replace(
    /\[\[(?:([A-Za-z][A-Za-z0-9_]*)\]\])?/g,
    (match: string, id: string | undefined) => {
      if (id === undefined || !declared.has(id)) sourceError = true;
      return id === undefined ? match : (substituted.get(id) ?? match);
    }
  );
  if (sourceError)
    errors.push({
      parameterId: 'source',
      message: templateText(
        [
          'Enter source using declared [[parameter]] names.',
          'Introduce código con nombres de [[parámetro]] declarados.',
        ],
        template.language
      ),
    });
  return errors.length
    ? { kind: 'blocked', errors, exportFileName: template.exportFileName }
    : {
        kind: 'ready',
        errors: [],
        source: rendered,
        exportFileName: template.resolveExportFileName(resolved),
      };
}

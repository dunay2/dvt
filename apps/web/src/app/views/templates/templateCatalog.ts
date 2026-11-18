/** Own the common recipe contract, localization of catalog metadata and export naming. */
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';
import {
  localizeParameter,
  templateText,
  type ExecutionTemplateParameterDefinition,
  type TemplateText,
} from './templateParameters';

export type ExecutionTemplateParameterValues = Readonly<Record<string, string>>;
export type ExecutionTemplateDefinition = Readonly<{
  id: string;
  label: string;
  provider: string;
  description: string;
  category: 'task' | 'procedure' | 'model' | 'workflow';
  referenceStyle: 'dbt' | 'postgresql' | 'snowflake' | 'none';
  exportFileName: string;
  fileNameField?: string;
  parameters: readonly ExecutionTemplateParameterDefinition[];
  templateSource: string;
  language: ApplicationLanguage;
  labels: TemplateText;
  descriptions: TemplateText;
  resolveExportFileName: (values: ExecutionTemplateParameterValues) => string;
}>;

type Recipe = Pick<
  ExecutionTemplateDefinition,
  | 'id'
  | 'provider'
  | 'category'
  | 'referenceStyle'
  | 'labels'
  | 'descriptions'
  | 'templateSource'
  | 'parameters'
> &
  Readonly<{ fileNameField?: string; suffix?: string }>;

export function defineRecipe(recipe: Recipe): ExecutionTemplateDefinition {
  const suffix = recipe.suffix ?? '.sql';
  return {
    ...recipe,
    language: 'en',
    label: recipe.labels[0],
    description: recipe.descriptions[0],
    templateSource: recipe.templateSource.trimEnd(),
    exportFileName: recipe.id + (suffix.endsWith('.yaml') ? '.yaml' : '.sql'),
    resolveExportFileName: (values) => {
      const stem = recipe.fileNameField && values[recipe.fileNameField];
      return (stem?.trim().toLowerCase() || recipe.id) + suffix;
    },
  };
}

export function localizeExecutionTemplate(
  template: ExecutionTemplateDefinition,
  language: ApplicationLanguage
): ExecutionTemplateDefinition {
  return {
    ...template,
    language,
    label: templateText(template.labels, language),
    description: templateText(template.descriptions, language),
    parameters: template.parameters.map((parameter) => localizeParameter(parameter, language)),
  };
}

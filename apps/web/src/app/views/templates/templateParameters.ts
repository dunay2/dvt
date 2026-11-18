/** Own typed substitutions for reviewed SQL and YAML recipe parameters. */
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';

export type TemplateParameterKind =
  | 'identifier'
  | 'relation'
  | 'table'
  | 'dbtRelation'
  | 'literal'
  | 'sql'
  | 'statement'
  | 'date'
  | 'cleanup'
  | 'language'
  | 'yaml'
  | 'rowLimit';
export type TemplateText = readonly [english: string, spanish: string];
export type ExecutionTemplateParameterDefinition = Readonly<{
  id: string;
  kind: TemplateParameterKind;
  label: string;
  description: string;
  required: boolean;
  inputKind: 'text' | 'textarea';
  defaultValue: string;
  requiredMessage: string;
  labels: TemplateText;
  descriptions: TemplateText;
}>;

const textIndex: Record<ApplicationLanguage, 0 | 1> = { en: 0, es: 1 };
export const templateText = (text: TemplateText, language: ApplicationLanguage): string =>
  text[textIndex[language]];
const requiredText: Record<ApplicationLanguage, (label: string) => string> = {
  en: (label) => `${label} is required.`,
  es: (label) => `${label} es obligatorio.`,
};

export function localizeParameter(
  parameter: ExecutionTemplateParameterDefinition,
  language: ApplicationLanguage
) {
  const label = templateText(parameter.labels, language);
  return {
    ...parameter,
    label,
    description: templateText(parameter.descriptions, language),
    requiredMessage: requiredText[language](label),
  };
}

export function field(
  id: string,
  kind: TemplateParameterKind,
  defaultValue: string,
  labels: TemplateText,
  descriptions: TemplateText = labels
): ExecutionTemplateParameterDefinition {
  return {
    id,
    kind,
    defaultValue,
    labels,
    descriptions,
    required: true,
    label: labels[0],
    description: descriptions[0],
    requiredMessage: requiredText.en(labels[0]),
    inputKind: ['sql', 'statement'].includes(kind) ? 'textarea' : 'text',
  };
}

export function acceptsProjectModel(parameter: ExecutionTemplateParameterDefinition): boolean {
  return parameter.kind === 'table' || parameter.kind === 'dbtRelation';
}

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
const part = String.raw`(?:[A-Za-z_][A-Za-z0-9_$]*|"(?:[^"\u0000]|"")+")`;
const relation = new RegExp(`^${part}(?:\\.${part}){0,2}$`);
const dbtName = String.raw`(?:'[A-Za-z0-9_.-]+'|"[A-Za-z0-9_.-]+")`;
const dbtRelation = new RegExp(
  String.raw`^\{\{\s*(?:ref\(\s*${dbtName}(?:\s*,\s*${dbtName})?\s*\)|source\(\s*${dbtName}\s*,\s*${dbtName}\s*\))\s*\}\}$`
);

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function formatTemplateValue(
  kind: TemplateParameterKind,
  value: string
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('\u0000')) return undefined;
  switch (kind) {
    case 'identifier':
      return identifier.test(trimmed) ? trimmed : undefined;
    case 'rowLimit':
      return /^(?:[1-9]\d{0,2}|1000)$/.test(trimmed) ? trimmed : undefined;
    case 'table':
    case 'relation':
      return relation.test(trimmed) ? trimmed : undefined;
    case 'dbtRelation':
      return dbtRelation.test(trimmed) ? trimmed : undefined;
    case 'literal':
      return value.replaceAll('\\', '\\\\').replaceAll("'", "''");
    case 'language':
      return trimmed.toUpperCase() === 'SQL' ? 'SQL' : undefined;
    case 'cleanup':
      return ['delete from', 'truncate table'].includes(trimmed.toLowerCase())
        ? trimmed.toLowerCase()
        : undefined;
    case 'date':
      return validDate(trimmed) ? trimmed : undefined;
    case 'sql':
      return trimmed;
    case 'statement':
      return trimmed.replace(/;+$/, '') || undefined;
    case 'yaml':
      return JSON.stringify(trimmed);
  }
}

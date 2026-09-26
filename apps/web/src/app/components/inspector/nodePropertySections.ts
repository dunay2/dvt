/** Assemble localized Inspector sections without owning node semantics. */
import type { CanvasNodePresentationCopy } from '../canvas/canvasNodePresentationCopy.contract';
import type { CanvasNodePresentationTruth } from '../canvas/canvasNodePresentationTruth.contract';
import type { NodePropertySection, NodePropertySectionId } from './nodePropertiesContracts';
import {
  interpolatePresentationTemplate,
  localizePropertyRows,
  localizePropertyTableRows,
} from './nodePropertyPresentation';

const SECTION_DEFAULTS: Partial<Record<NodePropertySectionId, readonly [string, string]>> = {
  general: ['General', ''],
  columns: ['Columns', 'No columns are recorded for this node.'],
  'inputs-outputs': ['Inputs / Outputs', 'No graph inputs or outputs are recorded for this node.'],
  tests: ['Tests', 'No dbt or data-quality tests are recorded for this node.'],
  keys: ['Keys', 'No keys are recorded for this node.'],
  indexes: ['Indexes', 'No indexes are recorded for this node.'],
  'foreign-keys': ['Foreign Keys', 'No foreign keys are recorded for this node.'],
  constraints: ['Constraints', 'No table constraints are recorded for this node.'],
  comments: ['Comments', 'No comments are recorded for this node.'],
  sink: ['Sink', 'No sink target or write policy is recorded for this node.'],
  code: ['Code', ''],
  summary: ['Summary', ''],
};

type SectionInput = Pick<NodePropertySection, 'id'> & Partial<Omit<NodePropertySection, 'id'>>;

export function presentNodePropertySection(
  section: SectionInput,
  copy?: CanvasNodePresentationCopy
): NodePropertySection {
  const defaults = SECTION_DEFAULTS[section.id];
  const label = copy?.sectionLabels?.[section.id] ?? section.label ?? defaults?.[0] ?? section.id;
  const rows = localizePropertyRows(section.rows ?? [], copy);
  const tableRows = localizePropertyTableRows(section.tableRows ?? [], copy);
  const empty = rows.length === 0 && tableRows.length === 0;
  return {
    ...section,
    label,
    rows,
    tableRows,
    ...(section.tableRows == null ? {} : { columnLabels: copy?.columnLabels }),
    emptyState:
      section.emptyState ??
      (empty
        ? (copy?.sectionEmptyStates?.[section.id] ?? (defaults?.[1] || undefined))
        : undefined),
  };
}

export function describeNodePropertyColumns(
  truth: CanvasNodePresentationTruth,
  copy?: CanvasNodePresentationCopy
): string | undefined {
  if (copy == null) return undefined;
  const columns = truth.columns;
  switch (columns.visibleProvenance) {
    case 'declared':
      return interpolatePresentationTemplate(copy.declaredColumnsDetailTemplate, {
        count: String(columns.visibleCount),
      });
    case 'inherited':
      return interpolatePresentationTemplate(copy.inheritedColumnsDetailTemplate, {
        count: String(columns.visibleCount),
      });
    case 'mixed':
      return interpolatePresentationTemplate(copy.mixedColumnsDetailTemplate, {
        declared: String(columns.declaredCount),
        available: String(columns.visibleCount - columns.declaredCount),
      });
    default:
      return copy.noColumnsDetail;
  }
}

export function buildNodePropertyCodeSection(
  truth: CanvasNodePresentationTruth,
  copy?: CanvasNodePresentationCopy
): NodePropertySection {
  const code = truth.code;
  const content =
    code.kind === 'inline' || code.kind === 'generated' || code.kind === 'canonical'
      ? code
      : undefined;
  let description: string | undefined;
  if (copy != null) {
    if (code.kind === 'workspace-file' || code.kind === 'generated') {
      description = interpolatePresentationTemplate(
        code.kind === 'workspace-file'
          ? copy.workspaceCodeDetailTemplate
          : copy.generatedCodeDetailTemplate,
        { path: code.path }
      );
    } else if (code.kind === 'canonical') {
      description = interpolatePresentationTemplate(
        copy.canonicalSubstraitCodeDetailTemplate ??
          'Canonical Substrait document {schemaVersion} · SHA-256 {digest}',
        { schemaVersion: code.schemaVersion, digest: code.digest }
      );
    }
  }
  return presentNodePropertySection(
    {
      id: 'code',
      label: copy?.codeLabel,
      code: content?.content,
      codeLanguage: content?.language,
      codePath: content != null && 'path' in content ? content.path : undefined,
      description,
      emptyState:
        code.kind === 'unavailable'
          ? code.reason === 'invalid-canonical-substrait-document'
            ? (copy?.invalidCanonicalSubstraitCodeMessage ??
              'The canonical Substrait document is missing or invalid.')
            : (copy?.codeUnavailableMessage ??
              'No inline code, generated projection, or canonical semantic document is recorded for this node.')
          : undefined,
    },
    copy
  );
}

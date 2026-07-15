/** Owned concern: project dbt import interaction state into presentation-only values. */
import type {
  DbtProjectImportDiagnostic,
  DbtProjectImportResult,
  DbtProjectImportValidationReport,
} from '@dvt/contracts';

export type DbtProjectImportPhase =
  'idle' | 'validating' | 'accepted' | 'rejected' | 'importing' | 'imported' | 'failed';

export type DbtProjectImportInteractionState = Readonly<{
  phase: DbtProjectImportPhase;
  projectRoot: string;
  canvasId: string;
  report: DbtProjectImportValidationReport | null;
  result: DbtProjectImportResult | null;
  failureMessage: string | null;
}>;

type PresentationTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

function formatByteCount(byteCount: number): string {
  if (byteCount < 1024) {
    return `${byteCount} B`;
  }

  const units = ['KiB', 'MiB', 'GiB', 'TiB'] as const;
  let value = byteCount / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2).replace(/\.0+$|(?<=\.[0-9])0$/, '')} ${units[unitIndex]}`;
}

function resolveStatus(phase: DbtProjectImportPhase): {
  readonly label: string;
  readonly tone: PresentationTone;
  readonly busy: boolean;
} {
  switch (phase) {
    case 'validating':
      return { label: 'Validating project', tone: 'info', busy: true };
    case 'accepted':
      return { label: 'Ready to import', tone: 'success', busy: false };
    case 'rejected':
      return { label: 'Validation rejected', tone: 'danger', busy: false };
    case 'importing':
      return { label: 'Importing project', tone: 'info', busy: true };
    case 'imported':
      return { label: 'Imported', tone: 'success', busy: false };
    case 'failed':
      return { label: 'Operation failed', tone: 'danger', busy: false };
    case 'idle':
      return { label: 'Not validated', tone: 'neutral', busy: false };
  }
}

function presentDiagnostic(diagnostic: DbtProjectImportDiagnostic) {
  const locationParts = [
    diagnostic.path,
    diagnostic.line == null ? null : `line ${diagnostic.line}`,
    diagnostic.column == null ? null : `column ${diagnostic.column}`,
  ].filter((part): part is string => part != null);

  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
    location: locationParts.length === 0 ? null : locationParts.join(', '),
  } as const;
}

export function buildDbtProjectImportPresentationModel(state: DbtProjectImportInteractionState) {
  const report = state.report;
  const acceptedReport = report?.status === 'accepted' ? report : null;
  const identityComplete = state.projectRoot.trim().length > 0 && state.canvasId.trim().length > 0;
  const status = resolveStatus(state.phase);
  const inventory =
    report == null
      ? null
      : {
          fileCount: report.inventory.fileCount,
          includedFileCount: report.inventory.includedFileCount,
          excludedFileCount: report.inventory.excludedFileCount,
          totalBytesLabel: formatByteCount(report.inventory.totalBytes),
          files: report.inventory.files.map((file) => ({
            path: file.path,
            classification: file.classification,
            byteSizeLabel: formatByteCount(file.byteSize),
            decisionLabel: file.decision === 'included' ? 'Included' : 'Excluded',
            reason: file.decision === 'included' ? null : file.reason,
          })),
        };

  return {
    phase: state.phase,
    projectRoot: state.projectRoot,
    canvasId: state.canvasId,
    status,
    canValidate: identityComplete && !status.busy && state.phase !== 'imported',
    canImport:
      identityComplete &&
      (state.phase === 'accepted' || state.phase === 'failed') &&
      acceptedReport != null &&
      !status.busy,
    project:
      report == null
        ? null
        : {
            name: report.projectName ?? 'Not reported',
            adapter: report.adapterType ?? 'Not reported',
          },
    inventory,
    diagnostics: report?.diagnostics.map(presentDiagnostic) ?? [],
    failureMessage: state.failureMessage,
    receipt:
      state.result == null
        ? null
        : {
            canvasId: state.result.authorityBinding.canvasId,
            projectRoot: state.result.projectRevision.projectRoot,
            projectedResourceCount: state.result.projectedResourceCount,
            revision: state.result.projectRevision.contentSetSha256.slice(0, 12),
          },
  } as const;
}

export type DbtProjectImportPresentationModel = ReturnType<
  typeof buildDbtProjectImportPresentationModel
>;

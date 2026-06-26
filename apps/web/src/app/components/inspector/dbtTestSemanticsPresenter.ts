/** Owned concern: project dbt test metadata into stable workbench display semantics. */

export type DbtTestSemanticsInput = Readonly<{
  type: string;
  expression?: string;
  severity?: string;
  selectedForExecution?: boolean;
  selectionState?: string;
  readinessImpact?: string;
  lastRunStatus?: string;
  lastRunDurationMs?: number;
}>;

export type DbtTestSemanticsProjection = Readonly<{
  assertion: string;
  selection: string;
  readinessImpact: string;
  lastRun: string;
}>;

function normalize(value: string | undefined): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_') ?? ''
  );
}

function formatDuration(durationMs: number | undefined): string {
  if (durationMs == null) {
    return '';
  }

  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1).replace(/\.0$/, '')}s`;
  }

  return `${durationMs}ms`;
}

function formatAssertion(input: DbtTestSemanticsInput): string {
  const type = normalize(input.type);

  if (type === 'not_null') {
    return 'Value is present';
  }

  if (type === 'unique') {
    return 'Values are unique';
  }

  if (type === 'accepted_values') {
    const values = input.expression?.startsWith('values: ')
      ? input.expression.slice('values: '.length).trim()
      : '';
    return values.length > 0 ? `Value is one of ${values}` : 'Value matches accepted values';
  }

  if (type === 'relationships') {
    return 'Value references related model';
  }

  return input.expression == null ? '' : 'Custom assertion';
}

function formatSelection(input: DbtTestSemanticsInput): string {
  if (input.selectionState != null && input.selectionState.trim().length > 0) {
    return input.selectionState.trim();
  }

  if (input.selectedForExecution === true) {
    return 'selected';
  }

  if (input.selectedForExecution === false) {
    return 'not selected';
  }

  return '';
}

function formatReadinessImpact(input: DbtTestSemanticsInput): string {
  if (input.readinessImpact != null && input.readinessImpact.trim().length > 0) {
    return input.readinessImpact.trim();
  }

  const severity = normalize(input.severity);
  if (severity === 'error' || severity === 'fail' || severity === 'failure') {
    return 'blocks run';
  }

  if (severity === 'warn' || severity === 'warning') {
    return 'warning';
  }

  return '';
}

function formatLastRun(input: DbtTestSemanticsInput): string {
  const status = input.lastRunStatus?.trim();
  if (status == null || status.length === 0) {
    return '';
  }

  const duration = formatDuration(input.lastRunDurationMs);
  return duration.length > 0 ? `${status} in ${duration}` : status;
}

export function projectDbtTestSemantics(input: DbtTestSemanticsInput): DbtTestSemanticsProjection {
  return {
    assertion: formatAssertion(input),
    selection: formatSelection(input),
    readinessImpact: formatReadinessImpact(input),
    lastRun: formatLastRun(input),
  };
}

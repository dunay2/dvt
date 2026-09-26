/** Owned concern: graphNodeExecutionMetrics. */
import { formatCompactNumber } from '../../components/canvas/formatCompactNumber';

import type { GraphNodeCardMetric } from './graphNodeCardStrategyContracts';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import {
  formatDurationMs,
  pushOperationalMetric,
  resolveRuntimeDurationLabel,
} from './graphNodeCardStrategyUtils';
import type { GraphNodeCardCopy } from './graphNodeOperationalValues';
import {
  firstRuntimeNumericValue,
  firstRuntimeStringValue,
  formatMinutes,
} from './graphNodeOperationalValues';
import { readNodeLastExecution } from '../../components/canvas/nodeLastExecution';

function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

function localizeTestStatus(value: string | null, copy: GraphNodeCardCopy): string | null {
  if (value == null) return null;
  return copy.testStatusLabels[value.trim().toLowerCase()] ?? value;
}

export function buildModelExecutionMetrics(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  runtimeData: Record<string, unknown>,
  rowCount: number | null,
  locale?: string
): GraphNodeCardMetric[] {
  const copy = resolveGraphNodeCardCopy(locale);
  const lastExecution = readNodeLastExecution(metadata, data, runtimeData);
  const durationSeconds = firstRuntimeNumericValue(metadata, data, runtimeData, [
    'durationSeconds',
  ]);
  const durationLabel =
    resolveRuntimeDurationLabel(metadata, runtimeData) ??
    (durationSeconds == null ? null : formatDurationMs(durationSeconds * 1000));
  const costUsd = firstRuntimeNumericValue(metadata, data, runtimeData, [
    'costUsd',
    'cost',
    'lastCost',
  ]);
  const costLabel =
    costUsd == null ? firstRuntimeStringValue(metadata, data, runtimeData, ['costLabel']) : null;
  const testStatus = firstRuntimeStringValue(metadata, data, runtimeData, [
    'testStatus',
    'testsStatus',
  ]);
  const hasModelExecutionSignal =
    lastExecution !== null ||
    durationLabel !== null ||
    costUsd !== null ||
    costLabel !== null ||
    testStatus !== null;
  const metrics: GraphNodeCardMetric[] = [];

  if (!hasModelExecutionSignal) {
    return metrics;
  }

  if (lastExecution != null) {
    metrics.push({
      id: 'last-run',
      label: copy.lastRunLabel,
      icon: 'clock',
      value: lastExecution.kind === 'age' ? formatMinutes(lastExecution.minutes) : lastExecution.at,
    });
  }
  pushOperationalMetric(metrics, 'duration', copy.durationLabel, durationLabel, { icon: 'timer' });
  pushOperationalMetric(
    metrics,
    'rows',
    copy.rowsLabel,
    rowCount == null ? null : formatCompactNumber(rowCount),
    { icon: 'rows' }
  );
  pushOperationalMetric(
    metrics,
    'cost',
    copy.costLabel,
    costUsd == null ? costLabel : formatCost(costUsd),
    {
      icon: 'cost',
    }
  );
  pushOperationalMetric(metrics, 'tests', copy.testsLabel, localizeTestStatus(testStatus, copy));

  return metrics;
}

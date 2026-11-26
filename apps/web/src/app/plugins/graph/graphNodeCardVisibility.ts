/** Select the visible contents of a card using the saved appearance of its source. */
import type { GraphNodeCardReadModel } from './graphNodeCardStrategyContracts';
import type { SourceCardAppearance } from '../../types/sourceCardAppearance';
import { isRuntimeSummaryMetric } from './graphNodeCardReadModel';

export function visibleCardSubtitle(
  model: GraphNodeCardReadModel,
  appearance?: SourceCardAppearance
) {
  if (appearance?.qualifiedName === false) return null;
  const { subtitle, path } = model;
  if (path == null || subtitle !== path) return subtitle;
  const hasCodePath = model.metrics.some(
    (metric) => metric.id === 'code' && metric.detail?.includes(path)
  );
  return hasCodePath ? null : subtitle;
}

export function visibleCardMetrics(
  model: GraphNodeCardReadModel,
  includeRuntime: boolean,
  appearance?: SourceCardAppearance
) {
  const summary = includeRuntime
    ? model.metrics
    : model.metrics.filter((metric) => !isRuntimeSummaryMetric(metric));
  const operational = model.operationalMetrics.filter(({ id }) => {
    if (appearance == null) return includeRuntime;
    if (id === 'rows') return appearance.rows;
    return id === 'size' && appearance.size;
  });
  return {
    header: summary.filter(({ placement }) => placement === 'header'),
    body: summary.filter(({ placement }) => placement !== 'header'),
    operational,
  };
}

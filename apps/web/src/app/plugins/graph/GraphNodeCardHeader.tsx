/** Render the card title, identity control and header metrics together. */
import type { ReactElement } from 'react';
import { ModelIdentitySelect } from '../../components/inspector/ModelIdentitySelect';
import { cn } from '../../components/ui/utils';
import { GraphNodeCardTitle } from './GraphNodeCardTitle';
import { GraphNodeMetricRow } from './GraphNodeMetricRow';
import { graphNodeCardLayoutClasses } from './graphCardVisualTokens';
import type { GraphNodeCardViewProps } from './graphNodeCardViewContracts';
import type { GraphNodeCardMetric } from './graphNodeCardStrategyContracts';

type HeaderProps = Pick<
  GraphNodeCardViewProps,
  'cardModel' | 'icon' | 'modelIdentity' | 'onChangeModelIcon' | 'materializationControl'
> &
  Readonly<{
    tinted: boolean;
    metrics: readonly GraphNodeCardMetric[];
  }>;

export function GraphNodeCardHeader({
  cardModel,
  icon: Icon,
  modelIdentity,
  onChangeModelIcon,
  materializationControl,
  metrics,
  tinted,
}: HeaderProps): ReactElement {
  return (
    <div
      data-slot="graph-node-card-header"
      className={cn(
        graphNodeCardLayoutClasses.header,
        tinted && graphNodeCardLayoutClasses.sourceTintedHeader
      )}
    >
      <div className={graphNodeCardLayoutClasses.titleRow}>
        {modelIdentity != null ? (
          <span data-slot="graph-node-card-icon">
            <ModelIdentitySelect
              identity={modelIdentity}
              modelName={cardModel.title}
              onChange={onChangeModelIcon}
              presentation="icon"
            />
          </span>
        ) : (
          Icon && (
            <Icon
              size={18}
              data-slot="graph-node-card-icon"
              data-tone={cardModel.accentTone}
              className={cn(
                graphNodeCardLayoutClasses.icon,
                graphNodeCardLayoutClasses.iconTone[cardModel.accentTone]
              )}
            />
          )
        )}
        <GraphNodeCardTitle cardModel={cardModel} />
      </div>
      {metrics.length === 0 ? null : (
        <div
          data-slot="graph-node-card-header-rail"
          className={graphNodeCardLayoutClasses.headerActions}
        >
          <GraphNodeMetricRow
            metrics={metrics}
            placement="header"
            materializationControl={materializationControl}
          />
        </div>
      )}
    </div>
  );
}

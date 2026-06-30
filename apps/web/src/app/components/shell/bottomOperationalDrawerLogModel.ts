import type { DataSourceMode } from '../../services/config/dataSource';

const API_IDLE_MESSAGE = 'Start a run to see live run events here.';
const LOADING_MESSAGE = 'Loading run events...';

type BottomOperationalDrawerLogModelBase = {
  readonly title: string;
  readonly modeLabel: string | null;
};

export type BottomOperationalDrawerLogModel =
  | (BottomOperationalDrawerLogModelBase & {
      readonly kind: 'idle';
      readonly runLabel: null;
      readonly message: string;
    })
  | (BottomOperationalDrawerLogModelBase & {
      readonly kind: 'loading';
      readonly runLabel: string;
      readonly message: string;
    })
  | (BottomOperationalDrawerLogModelBase & {
      readonly kind: 'streaming';
      readonly runLabel: string;
      readonly lines: readonly string[];
    });

type BuildBottomOperationalDrawerLogModelInput = {
  readonly title: string;
  readonly dataSourceMode: DataSourceMode;
  readonly runId: string | undefined;
  readonly isLoading: boolean;
  readonly lines: readonly string[];
};

export function buildBottomOperationalDrawerLogModel({
  title,
  dataSourceMode: _dataSourceMode,
  runId,
  isLoading,
  lines,
}: BuildBottomOperationalDrawerLogModelInput): BottomOperationalDrawerLogModel {
  const modeLabel = null;

  if (!runId) {
    return {
      title,
      modeLabel,
      kind: 'idle',
      runLabel: null,
      message: API_IDLE_MESSAGE,
    };
  }

  if (isLoading) {
    return {
      title,
      modeLabel,
      kind: 'loading',
      runLabel: `Run ${runId}`,
      message: LOADING_MESSAGE,
    };
  }

  return {
    title,
    modeLabel,
    kind: 'streaming',
    runLabel: `Run ${runId}`,
    lines,
  };
}

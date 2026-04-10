import type { DataSourceMode } from '../../services/config/dataSource';

const API_IDLE_MESSAGE =
  'Start a run to see run events here. Live log streaming is not available in API mode yet.';
const DEFAULT_IDLE_MESSAGE = 'Start a run to see execution output here.';
const LOADING_MESSAGE = 'Loading run events...';

type BottomConsoleDrawerModelBase = {
  readonly title: string;
  readonly modeLabel: string | null;
};

export type BottomConsoleDrawerModel =
  | (BottomConsoleDrawerModelBase & {
      readonly kind: 'idle';
      readonly runLabel: null;
      readonly message: string;
    })
  | (BottomConsoleDrawerModelBase & {
      readonly kind: 'loading';
      readonly runLabel: string;
      readonly message: string;
    })
  | (BottomConsoleDrawerModelBase & {
      readonly kind: 'streaming';
      readonly runLabel: string;
      readonly lines: readonly string[];
    });

type BuildBottomConsoleDrawerModelInput = {
  readonly title: string;
  readonly dataSourceMode: DataSourceMode;
  readonly runId: string | undefined;
  readonly isLoading: boolean;
  readonly lines: readonly string[];
};

export function buildBottomConsoleDrawerModel({
  title,
  dataSourceMode,
  runId,
  isLoading,
  lines,
}: BuildBottomConsoleDrawerModelInput): BottomConsoleDrawerModel {
  const modeLabel = dataSourceMode === 'mock' ? 'Mock' : null;

  if (!runId) {
    return {
      title,
      modeLabel,
      kind: 'idle',
      runLabel: null,
      message: dataSourceMode === 'api' ? API_IDLE_MESSAGE : DEFAULT_IDLE_MESSAGE,
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

import type { RunEventFeedHealthCopy } from '../../services/runs/runEventFeedHealthCopy';
import type {
  RunEventFeedHealthModel,
  RunEventFeedHealthState,
} from '../../services/runs/runEventFeedHealthModel';

type BottomOperationalDrawerLogModelBase = {
  readonly title: string;
};

export type BottomOperationalDrawerLogModel =
  | (BottomOperationalDrawerLogModelBase & {
      readonly kind: 'idle';
      readonly runLabel: null;
      readonly message: string;
    })
  | (BottomOperationalDrawerLogModelBase & {
      readonly kind: 'active';
      readonly runLabel: string;
      readonly healthState: Exclude<RunEventFeedHealthState, 'idle'>;
      readonly statusLabel: string;
      readonly message: string;
      readonly canRetry: boolean;
      readonly retryLabel: string;
      readonly lines: readonly string[];
    });

type BuildBottomOperationalDrawerLogModelInput = {
  readonly title: string;
  readonly runId: string | undefined;
  readonly health: RunEventFeedHealthModel;
  readonly copy: RunEventFeedHealthCopy;
  readonly lines?: readonly string[];
};

export function buildBottomOperationalDrawerLogModel({
  title,
  runId,
  health,
  copy,
  lines = [],
}: BuildBottomOperationalDrawerLogModelInput): BottomOperationalDrawerLogModel {
  if (!runId) {
    return {
      title,
      kind: 'idle',
      runLabel: null,
      message: copy.messages.idle,
    };
  }

  const healthState = health.state === 'idle' ? 'loading' : health.state;

  return {
    title,
    kind: 'active',
    runLabel: `Run ${runId}`,
    healthState,
    statusLabel: copy.states[healthState],
    message: copy.messages[healthState],
    canRetry: health.canRetry,
    retryLabel: copy.retryAction,
    lines,
  };
}

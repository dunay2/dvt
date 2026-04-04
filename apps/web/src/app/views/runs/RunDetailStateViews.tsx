import { Card } from '../../components/ui/card';
import { RunStateFrame } from './RunStateFrame';
import { runStatesCopy as copy } from './runStatesCopy';

type RunNotFoundStateProps = {
  runId: string;
};

export function RunNotFoundStateView({ runId }: RunNotFoundStateProps) {
  return (
    <RunStateFrame title={copy.runsTitle}>
      <Card className="mx-auto max-w-xl border-slate-700 bg-slate-900 p-5">
        <h2 className="mb-2 text-base font-semibold">{copy.runNotFoundTitle}</h2>
        <p className="text-sm text-slate-300">
          {copy.runNotFoundMessagePrefix} <span className="font-mono">{runId}</span>.
        </p>
      </Card>
    </RunStateFrame>
  );
}

type RunDetailLoadingStateProps = {
  runId: string;
};

export function RunDetailLoadingStateView({ runId }: RunDetailLoadingStateProps) {
  return (
    <RunStateFrame title={`Run ${runId}`}>
      <Card className="mx-auto max-w-xl border-slate-700 bg-slate-900 p-5 text-sm text-slate-300">
        {copy.runWorkspaceLoading}
      </Card>
    </RunStateFrame>
  );
}

type RunDetailErrorStateProps = {
  runId: string;
  message: string;
};

export function RunDetailErrorStateView({ runId, message }: RunDetailErrorStateProps) {
  return (
    <RunStateFrame title={`Run ${runId}`}>
      <Card className="mx-auto max-w-xl border-red-900 bg-red-950/30 p-5">
        <h2 className="mb-2 text-base font-semibold text-red-200">
          {copy.runWorkspaceUnavailable}
        </h2>
        <p className="text-sm text-red-100">{message}</p>
      </Card>
    </RunStateFrame>
  );
}

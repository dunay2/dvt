import { cn } from '../../../components/ui/utils';
import type { Run } from '../../../types/dbt';

type RunEventsTabProps = {
  run: Run;
};

export default function RunEventsTab({ run }: Readonly<RunEventsTabProps>) {
  return (
    <div className="space-y-2 font-mono text-sm">
      {run.events.map((event) => (
        <div key={event.id} className="flex gap-3 p-2 hover:bg-slate-900 rounded">
          <span className="text-slate-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
          <span
            className={cn(
              event.type.includes('Completed') && 'text-green-400',
              event.type.includes('Started') && 'text-blue-400',
              event.type.includes('Failed') && 'text-red-400'
            )}
          >
            [{event.type}]
          </span>
          <span className="text-slate-200">{event.message}</span>
        </div>
      ))}
    </div>
  );
}

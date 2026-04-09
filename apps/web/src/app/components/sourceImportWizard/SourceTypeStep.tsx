import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { SOURCE_TYPE_OPTIONS } from './constants';
import { sourceImportWizardCopy as copy } from './copy';
import type { DataObjectSourceType } from './types';

interface SourceTypeStepProps {
  selectedSourceType: DataObjectSourceType;
  onSelectSourceType: (sourceType: DataObjectSourceType) => void;
}

export function SourceTypeStep({ selectedSourceType, onSelectSourceType }: SourceTypeStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.sourceType.title}</h3>
        <p className="mb-4 text-sm text-slate-300">{copy.sourceType.description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SOURCE_TYPE_OPTIONS.map((sourceType) => {
          const Icon = sourceType.icon;
          const isSelected = selectedSourceType === sourceType.id;
          return (
            <Card
              key={sourceType.id}
              className={`p-4 transition-all ${
                sourceType.available
                  ? isSelected
                    ? 'cursor-pointer border-blue-500 bg-blue-900/20'
                    : 'cursor-pointer border-slate-600 hover:border-gray-600'
                  : 'border-slate-700 bg-slate-950/40 opacity-70'
              }`}
              onClick={() => {
                if (sourceType.available) {
                  onSelectSourceType(sourceType.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-2">
                    <Icon className="size-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium">{sourceType.label}</div>
                    <div className="mt-1 text-xs text-slate-300">{sourceType.description}</div>
                  </div>
                </div>
                <Badge variant={sourceType.available ? 'outline' : 'secondary'}>
                  {sourceType.available ? 'available' : 'not available yet'}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-400">
        {copy.sourceType.availabilityNote}
      </div>
    </div>
  );
}

import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { resolveString } from '../../plugins/contracts/PluginManifest';
import { useSourceImportLocalization } from './copy';

interface OptionsStepProps {
  sourceImportOptions: readonly SourceImportOptionContribution[];
  sourceImportOptionValues: Readonly<Record<SourceImportOptionId, boolean>>;
  onSourceImportOptionChange: (optionId: SourceImportOptionId, value: boolean) => void;
}

export function OptionsStep({
  sourceImportOptions,
  sourceImportOptionValues,
  onSourceImportOptionChange,
}: OptionsStepProps) {
  const { copy, language } = useSourceImportLocalization();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.options.title}</h3>
        <p className="mb-4 text-sm text-slate-300">{copy.options.description}</p>
      </div>

      {sourceImportOptions.map((option) => (
        <Card
          key={option.id}
          className="border-slate-600 p-4"
          data-source-import-option={option.id}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h4 className="mb-1 text-sm font-medium">{resolveString(option.label, language)}</h4>
              <p className="text-xs text-slate-300">
                {resolveString(option.description, language)}
              </p>
              <Badge variant="secondary" className="mt-2 text-xs">
                {copy.options.defaultLabel}:{' '}
                {option.defaultEnabled
                  ? copy.options.enabledShortLabel
                  : copy.options.disabledShortLabel}
              </Badge>
            </div>
            <Checkbox
              checked={sourceImportOptionValues[option.id]}
              onCheckedChange={(value) => onSourceImportOptionChange(option.id, value === true)}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}

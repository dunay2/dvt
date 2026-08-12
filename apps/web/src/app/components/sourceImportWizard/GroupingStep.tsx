import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useSourceImportLocalization } from './copy';
import { SOURCE_IMPORT_GROUPING_STRATEGIES, type SourceImportGroupingStrategy } from './types';

interface GroupingStepProps {
  groupingStrategy: SourceImportGroupingStrategy;
  onGroupingChange: (grouping: SourceImportGroupingStrategy) => void;
}

type GroupingOption = Readonly<{
  id: SourceImportGroupingStrategy;
  label: string;
  description: string;
  badge?: string;
}>;

export function GroupingStep({ groupingStrategy, onGroupingChange }: GroupingStepProps) {
  const { copy } = useSourceImportLocalization();
  const groupingOptions: readonly GroupingOption[] = SOURCE_IMPORT_GROUPING_STRATEGIES.map(
    (strategy) => ({ id: strategy, ...copy.grouping.options[strategy] })
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.grouping.title}</h3>
        <p className="mb-4 text-sm text-slate-300">{copy.grouping.description}</p>
      </div>

      <RadioGroup
        value={groupingStrategy}
        onValueChange={(value) => {
          if (isSourceImportGroupingStrategy(value)) {
            onGroupingChange(value);
          }
        }}
      >
        {groupingOptions.map((option) => (
          <Card
            key={option.id}
            className="border-slate-600 p-4"
            data-source-import-grouping-option={option.id}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value={option.id} id={option.id} />
              <div className="flex-1">
                <Label htmlFor={option.id} className="cursor-pointer font-medium">
                  {option.label}
                </Label>
                <p className="mt-1 text-xs text-slate-300">{option.description}</p>
                {option.badge ? (
                  <div className="mt-2 text-xs">
                    <Badge variant="outline" className="border-green-400 text-green-400">
                      {option.badge}
                    </Badge>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </RadioGroup>
    </div>
  );
}

function isSourceImportGroupingStrategy(value: string): value is SourceImportGroupingStrategy {
  return SOURCE_IMPORT_GROUPING_STRATEGIES.some((strategy) => strategy === value);
}

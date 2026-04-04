import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { sourceImportWizardCopy as copy } from './copy';

interface GroupingStepProps {
  groupingStrategy: 'schema' | 'database' | 'custom';
  onGroupingChange: (grouping: 'schema' | 'database' | 'custom') => void;
}

export function GroupingStep({ groupingStrategy, onGroupingChange }: GroupingStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.grouping.title}</h3>
        <p className="mb-4 text-sm text-slate-300">{copy.grouping.description}</p>
      </div>

      <RadioGroup
        value={groupingStrategy}
        onValueChange={(value) => onGroupingChange(value as 'schema' | 'database' | 'custom')}
      >
        <Card className="border-slate-600 p-4">
          <div className="flex items-start gap-3">
            <RadioGroupItem value="schema" id="schema" />
            <div className="flex-1">
              <Label htmlFor="schema" className="cursor-pointer font-medium">
                Group by Schema (Recommended)
              </Label>
              <p className="mt-1 text-xs text-slate-300">
                Creates one source per schema. Example: RAW.ERP.ORDERS -&gt; source(erp)
              </p>
              <div className="mt-2 text-xs">
                <Badge variant="outline" className="border-green-400 text-green-400">
                  Enterprise-friendly
                </Badge>
              </div>
            </div>
          </div>
        </Card>
        <Card className="border-slate-600 p-4">
          <div className="flex items-start gap-3">
            <RadioGroupItem value="database" id="database" />
            <div className="flex-1">
              <Label htmlFor="database" className="cursor-pointer font-medium">
                Group by Database
              </Label>
              <p className="mt-1 text-xs text-slate-300">
                Creates one source per database. Best for small projects.
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-slate-600 p-4">
          <div className="flex items-start gap-3">
            <RadioGroupItem value="custom" id="custom" />
            <div className="flex-1">
              <Label htmlFor="custom" className="cursor-pointer font-medium">
                Custom Grouping
              </Label>
              <p className="mt-1 text-xs text-slate-300">Manually organize sources (advanced)</p>
            </div>
          </div>
        </Card>
      </RadioGroup>
    </div>
  );
}

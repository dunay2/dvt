import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { sourceImportWizardCopy as copy } from './copy';

interface OptionsStepProps {
  includeColumns: boolean;
  addTests: boolean;
  addFreshness: boolean;
  onIncludeColumnsChange: (value: boolean) => void;
  onAddTestsChange: (value: boolean) => void;
  onAddFreshnessChange: (value: boolean) => void;
}

export function OptionsStep({
  includeColumns,
  addTests,
  addFreshness,
  onIncludeColumnsChange,
  onAddTestsChange,
  onAddFreshnessChange,
}: OptionsStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.options.title}</h3>
        <p className="mb-4 text-sm text-slate-300">{copy.options.description}</p>
      </div>

      <Card className="border-slate-600 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="mb-1 text-sm font-medium">Include Column Metadata</h4>
            <p className="text-xs text-slate-300">
              Add column names and data types to YAML (stored under meta.warehouse_data_type)
            </p>
            <Badge variant="secondary" className="mt-2 text-xs">
              Default: OFF (Minimal YAML)
            </Badge>
          </div>
          <Checkbox checked={includeColumns} onCheckedChange={onIncludeColumnsChange} />
        </div>
      </Card>

      <Card className="border-slate-600 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="mb-1 text-sm font-medium">Add Generic Tests</h4>
            <p className="text-xs text-slate-300">
              Automatically add not_null and unique tests for detected primary keys
            </p>
            <Badge variant="secondary" className="mt-2 text-xs">
              Default: OFF
            </Badge>
          </div>
          <Checkbox checked={addTests} onCheckedChange={onAddTestsChange} />
        </div>
      </Card>

      <Card className="border-slate-600 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="mb-1 text-sm font-medium">Add Freshness Checks</h4>
            <p className="text-xs text-slate-300">
              Add default freshness thresholds (warn_after: 24h, error_after: 48h)
            </p>
            <Badge variant="secondary" className="mt-2 text-xs">
              Default: OFF
            </Badge>
          </div>
          <Checkbox checked={addFreshness} onCheckedChange={onAddFreshnessChange} />
        </div>
      </Card>
    </div>
  );
}

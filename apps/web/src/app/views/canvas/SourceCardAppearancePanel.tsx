/** Present one Source placement's visual controls through the existing layout command. */
import { InspectorPropertyField } from '../../components/inspector/InspectorPropertyField';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import type { SourceCardAppearance } from '../../types/sourceCardAppearance';
import { DEFAULT_CANVAS_GRID_COLOR } from './canvasPalette';
import type { SourceCardAppearanceCopy } from './sourceCardAppearanceCopy';

const visibilityFields = [
  'tags',
  'columns',
  'qualifiedName',
  'types',
  'nullability',
  'rows',
  'size',
] as const;

export function SourceCardAppearancePanel({
  appearance,
  copy,
  onChange,
}: Readonly<{
  appearance: SourceCardAppearance;
  copy: SourceCardAppearanceCopy;
  onChange: (patch: Partial<SourceCardAppearance> | null) => void;
}>): JSX.Element {
  return (
    <div className="grid gap-2" data-slot="source-card-appearance">
      <InspectorPropertyField label={copy.color} action={null}>
        <Input
          type="color"
          className="h-7 cursor-pointer px-1 py-0.5"
          aria-label={copy.color}
          value={appearance.color ?? DEFAULT_CANVAS_GRID_COLOR}
          onChange={(event) => onChange({ color: event.currentTarget.value })}
        />
      </InspectorPropertyField>
      {visibilityFields.map((field) => (
        <InspectorPropertyField key={field} label={copy[field]} action={null}>
          <Switch
            aria-label={copy[field]}
            data-slot={`source-card-appearance-${field}`}
            checked={appearance[field]}
            onCheckedChange={(visible) => onChange({ [field]: visible })}
          />
        </InspectorPropertyField>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="justify-self-end"
        onClick={() => onChange(null)}
      >
        {copy.reset}
      </Button>
    </div>
  );
}

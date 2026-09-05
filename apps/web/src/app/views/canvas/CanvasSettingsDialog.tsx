/** Owned concern: render one contextual Canvas properties edit buffer. */
import { useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import {
  WorkbenchPropertiesWindow,
  type WorkbenchPropertiesSection,
} from '../../components/workbench/WorkbenchPropertiesWindow';
import {
  DEFAULT_CANVAS_GRID_COLOR,
  normalizeCanvasHexColor,
  normalizeCanvasPaletteId,
  type CanvasPaletteId,
} from './canvasPalette';
import { canvasViewCopy } from './copy';
import type { CanvasViewCopy } from './canvasCopy.types';

const GRID_OPTIONS = [10, 15, 20, 30, 40] as const;
const DEFAULT_GRID_SIZE = 20;

type CanvasSettingsDialogProps = Readonly<{
  open: boolean;
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  canUseCostOverlay: boolean;
  costOverlayEnabled: boolean;
  gridSize: number;
  canvasPalette: CanvasPaletteId;
  canvasGridVisible: boolean;
  canvasGridColor: CanvasPaletteId;
  canvasSnapToGrid: boolean;
  canAutoLayout: boolean;
  copy?: CanvasViewCopy;
  onToggleImpact: () => void;
  onToggleColumns: () => void;
  onToggleCostOverlay?: () => void;
  onGridSizeChange: (size: number) => void;
  onCanvasPaletteChange: (color: CanvasPaletteId) => void;
  onToggleGridVisible: () => void;
  onGridColorChange: (color: CanvasPaletteId) => void;
  onToggleSnapToGrid: () => void;
  onAutoLayout?: () => void;
  onRestoreFocus?: () => void;
  onClose: () => void;
}>;

type CanvasPropertiesEditBuffer = Readonly<{
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  costOverlayEnabled: boolean;
  gridSize: number;
  canvasPaletteInput: string;
  canvasGridVisible: boolean;
  canvasGridColorInput: string;
  canvasSnapToGrid: boolean;
  autoLayoutRequested: boolean;
}>;

type CanvasSettingToggleRowProps = Readonly<{
  dataSlot: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}>;

function CanvasSettingToggleRow({
  dataSlot,
  label,
  checked,
  disabled = false,
  onCheckedChange,
}: CanvasSettingToggleRowProps): JSX.Element {
  const inputId = `${dataSlot}-control`;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--border-muted) py-3 last:border-b-0">
      <Label htmlFor={inputId} className="text-sm font-medium text-(--text-default)">
        {label}
      </Label>
      <Switch
        id={inputId}
        data-slot={dataSlot}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

type CanvasColorFieldProps = Readonly<{
  label: string;
  inputLabel: string;
  inputSlot: string;
  color: string;
  fallback: CanvasPaletteId;
  onChange: (color: string) => void;
}>;

function CanvasColorField({
  label,
  inputLabel,
  inputSlot,
  color,
  fallback,
  onChange,
}: CanvasColorFieldProps): JSX.Element {
  const inputColorValid = /^#[0-9a-f]{6}$/i.test(color);

  function handleColorInput(nextColor: string): void {
    const candidate = `#${nextColor.replace(/^#+/, '')}`;
    onChange(candidate);
  }

  return (
    <div className="grid gap-3">
      <Label className="text-sm font-medium text-(--text-default)">{label}</Label>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div className="canvas-background-color-picker overflow-hidden rounded-md border border-(--border-muted)">
          <HexColorPicker
            color={normalizeCanvasHexColor(color, fallback)}
            onChange={(nextColor) => onChange(normalizeCanvasHexColor(nextColor, fallback))}
          />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor={`${inputSlot}-control`} className="text-xs text-(--text-subtle)">
            {inputLabel}
          </Label>
          <Input
            id={`${inputSlot}-control`}
            data-slot={inputSlot}
            value={color}
            spellCheck={false}
            aria-label={inputLabel}
            aria-invalid={!inputColorValid}
            className="h-9 w-full rounded-md border border-(--border-default) bg-(--surface-panel-subtle) px-3 font-mono text-sm text-(--text-default) outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            onChange={(event) => handleColorInput(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function buildEditBuffer(
  props: Pick<
    CanvasSettingsDialogProps,
    | 'impactOverlayEnabled'
    | 'columnLevelLineageEnabled'
    | 'costOverlayEnabled'
    | 'gridSize'
    | 'canvasPalette'
    | 'canvasGridVisible'
    | 'canvasGridColor'
    | 'canvasSnapToGrid'
  >
): CanvasPropertiesEditBuffer {
  return {
    impactOverlayEnabled: props.impactOverlayEnabled,
    columnLevelLineageEnabled: props.columnLevelLineageEnabled,
    costOverlayEnabled: props.costOverlayEnabled,
    gridSize: props.gridSize,
    canvasPaletteInput: normalizeCanvasPaletteId(props.canvasPalette),
    canvasGridVisible: props.canvasGridVisible,
    canvasGridColorInput: normalizeCanvasHexColor(props.canvasGridColor, DEFAULT_CANVAS_GRID_COLOR),
    canvasSnapToGrid: props.canvasSnapToGrid,
    autoLayoutRequested: false,
  };
}

export function CanvasSettingsDialog(props: CanvasSettingsDialogProps): JSX.Element {
  const {
    open,
    impactOverlayEnabled,
    columnLevelLineageEnabled,
    canUseCostOverlay,
    costOverlayEnabled,
    gridSize,
    canvasPalette,
    canvasGridVisible,
    canvasGridColor,
    canvasSnapToGrid,
    canAutoLayout,
    copy = canvasViewCopy,
    onToggleImpact,
    onToggleColumns,
    onToggleCostOverlay,
    onGridSizeChange,
    onCanvasPaletteChange,
    onToggleGridVisible,
    onGridColorChange,
    onToggleSnapToGrid,
    onAutoLayout,
    onRestoreFocus,
    onClose,
  } = props;
  const [draft, setDraft] = useState<CanvasPropertiesEditBuffer>(() => buildEditBuffer(props));

  useEffect(() => {
    if (open) {
      setDraft(buildEditBuffer(props));
    }
  }, [
    open,
    impactOverlayEnabled,
    columnLevelLineageEnabled,
    costOverlayEnabled,
    gridSize,
    canvasPalette,
    canvasGridVisible,
    canvasGridColor,
    canvasSnapToGrid,
  ]);

  const backgroundColorValid = /^#[0-9a-f]{6}$/i.test(draft.canvasPaletteInput);
  const gridColorValid = /^#[0-9a-f]{6}$/i.test(draft.canvasGridColorInput);
  const normalizedCanvasPaletteInput = normalizeCanvasHexColor(
    draft.canvasPaletteInput,
    normalizeCanvasPaletteId(canvasPalette)
  );
  const normalizedCanvasGridColorInput = normalizeCanvasHexColor(
    draft.canvasGridColorInput,
    DEFAULT_CANVAS_GRID_COLOR
  );

  const hasChanges =
    draft.impactOverlayEnabled !== impactOverlayEnabled ||
    draft.columnLevelLineageEnabled !== columnLevelLineageEnabled ||
    (canUseCostOverlay && draft.costOverlayEnabled !== costOverlayEnabled) ||
    draft.gridSize !== gridSize ||
    normalizedCanvasPaletteInput !== normalizeCanvasPaletteId(canvasPalette) ||
    draft.canvasGridVisible !== canvasGridVisible ||
    normalizedCanvasGridColorInput !==
      normalizeCanvasHexColor(canvasGridColor, DEFAULT_CANVAS_GRID_COLOR) ||
    draft.canvasSnapToGrid !== canvasSnapToGrid ||
    (canAutoLayout && draft.autoLayoutRequested);

  const appearanceSection: WorkbenchPropertiesSection = {
    id: 'appearance',
    label: copy.canvasSettingsAppearanceTabLabel,
    content: (
      <div className="grid gap-4">
        <CanvasColorField
          label={copy.canvasSettingsBackgroundLabel}
          inputLabel={copy.canvasSettingsBackgroundInputLabel}
          inputSlot="canvas-properties-background-input"
          color={draft.canvasPaletteInput}
          fallback={normalizeCanvasPaletteId(canvasPalette)}
          onChange={(nextColor) =>
            setDraft((current) => ({ ...current, canvasPaletteInput: nextColor }))
          }
        />
        <div className="border-t border-(--border-muted)">
          <CanvasSettingToggleRow
            dataSlot="canvas-properties-impact"
            label={copy.toolbarImpactLabel}
            checked={draft.impactOverlayEnabled}
            onCheckedChange={(checked) =>
              setDraft((current) => ({ ...current, impactOverlayEnabled: checked }))
            }
          />
          <CanvasSettingToggleRow
            dataSlot="canvas-properties-columns"
            label={copy.toolbarColumnsLabel}
            checked={draft.columnLevelLineageEnabled}
            onCheckedChange={(checked) =>
              setDraft((current) => ({ ...current, columnLevelLineageEnabled: checked }))
            }
          />
          {canUseCostOverlay ? (
            <CanvasSettingToggleRow
              dataSlot="canvas-properties-cost"
              label={copy.toolbarCostLabel}
              checked={draft.costOverlayEnabled}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, costOverlayEnabled: checked }))
              }
            />
          ) : null}
        </div>
      </div>
    ),
  };

  const gridSection: WorkbenchPropertiesSection = {
    id: 'grid',
    label: copy.canvasSettingsGridTabLabel,
    content: (
      <div className="grid gap-4">
        <div>
          <CanvasSettingToggleRow
            dataSlot="canvas-properties-grid-visible"
            label={copy.toolbarGridLabel}
            checked={draft.canvasGridVisible}
            onCheckedChange={(checked) =>
              setDraft((current) => ({ ...current, canvasGridVisible: checked }))
            }
          />
          <CanvasSettingToggleRow
            dataSlot="canvas-properties-snap"
            label={copy.toolbarSnapToGridLabel}
            checked={draft.canvasSnapToGrid}
            onCheckedChange={(checked) =>
              setDraft((current) => ({ ...current, canvasSnapToGrid: checked }))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="canvas-properties-grid-size" className="text-sm font-medium">
            {copy.canvasSettingsGridSizeLabel}
          </Label>
          <Select
            value={String(draft.gridSize)}
            onValueChange={(value) => {
              const nextSize = Number(value);
              if (GRID_OPTIONS.some((option) => option === nextSize)) {
                setDraft((current) => ({ ...current, gridSize: nextSize }));
              }
            }}
          >
            <SelectTrigger
              id="canvas-properties-grid-size"
              data-slot="canvas-properties-grid-size"
              aria-label={copy.canvasSettingsGridSizeLabel}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRID_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CanvasColorField
          label={copy.toolbarGridColorLabel}
          inputLabel={copy.toolbarGridColorLabel}
          inputSlot="canvas-properties-grid-color-input"
          color={draft.canvasGridColorInput}
          fallback={DEFAULT_CANVAS_GRID_COLOR}
          onChange={(nextColor) =>
            setDraft((current) => ({ ...current, canvasGridColorInput: nextColor }))
          }
        />
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          onClick={() =>
            setDraft((current) => ({
              ...current,
              gridSize: DEFAULT_GRID_SIZE,
              canvasGridColorInput: DEFAULT_CANVAS_GRID_COLOR,
            }))
          }
        >
          {copy.canvasSettingsResetGridLabel}
        </Button>
      </div>
    ),
  };

  const sections: WorkbenchPropertiesSection[] = [appearanceSection, gridSection];
  if (canAutoLayout) {
    sections.push({
      id: 'layout',
      label: copy.canvasSettingsLayoutTabLabel,
      content: (
        <CanvasSettingToggleRow
          dataSlot="canvas-properties-auto-layout"
          label={copy.canvasSettingsAutoLayoutLabel}
          checked={draft.autoLayoutRequested}
          onCheckedChange={(checked) =>
            setDraft((current) => ({ ...current, autoLayoutRequested: checked }))
          }
        />
      ),
    });
  }

  function applyChanges(): void {
    if (!backgroundColorValid || !gridColorValid) return;
    if (draft.impactOverlayEnabled !== impactOverlayEnabled) onToggleImpact();
    if (draft.columnLevelLineageEnabled !== columnLevelLineageEnabled) onToggleColumns();
    if (canUseCostOverlay && draft.costOverlayEnabled !== costOverlayEnabled)
      onToggleCostOverlay?.();
    if (draft.gridSize !== gridSize) onGridSizeChange(draft.gridSize);
    if (normalizedCanvasPaletteInput !== normalizeCanvasPaletteId(canvasPalette)) {
      onCanvasPaletteChange(normalizedCanvasPaletteInput);
    }
    if (draft.canvasGridVisible !== canvasGridVisible) onToggleGridVisible();
    if (
      normalizedCanvasGridColorInput !==
      normalizeCanvasHexColor(canvasGridColor, DEFAULT_CANVAS_GRID_COLOR)
    ) {
      onGridColorChange(normalizedCanvasGridColorInput);
    }
    if (draft.canvasSnapToGrid !== canvasSnapToGrid) onToggleSnapToGrid();
    if (canAutoLayout && draft.autoLayoutRequested) onAutoLayout?.();
    onClose();
  }

  return (
    <WorkbenchPropertiesWindow
      open={open}
      dataSlot="canvas-settings-dialog"
      title={copy.canvasContextMenuCanvasSettingsLabel}
      description={copy.canvasSettingsDescription}
      closeLabel={copy.canvasSettingsCloseLabel}
      tabsLabel={copy.canvasSettingsSectionsLabel}
      cancelLabel={copy.canvasSettingsCancelLabel}
      applyLabel={copy.canvasSettingsApplyLabel}
      sections={sections}
      applyDisabled={!hasChanges || !backgroundColorValid || !gridColorValid}
      onCancel={onClose}
      onApply={applyChanges}
      onRestoreFocus={onRestoreFocus}
    />
  );
}

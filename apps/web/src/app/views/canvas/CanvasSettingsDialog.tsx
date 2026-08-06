/** Owned concern: render contextual Canvas settings without owning preference state. */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import type { CanvasPaletteId } from './canvasPalette';
import { canvasViewCopy } from './copy';
import type { CanvasViewCopy } from './canvasCopy.types';

type CanvasSettingsDialogProps = Readonly<{
  open: boolean;
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  canUseCostOverlay: boolean;
  costOverlayEnabled: boolean;
  canvasGridVisible: boolean;
  canvasGridColor: CanvasPaletteId;
  canvasSnapToGrid: boolean;
  canvasEmptyStateGuideVisible: boolean;
  copy?: CanvasViewCopy;
  onToggleImpact: () => void;
  onToggleColumns: () => void;
  onToggleCostOverlay: () => void;
  onToggleGridVisible: () => void;
  onGridColorChange: (color: CanvasPaletteId) => void;
  onToggleSnapToGrid: () => void;
  onSetCanvasEmptyStateGuideVisible: (visible: boolean) => void;
  onRestoreFocus?: () => void;
  onClose: () => void;
}>;

type CanvasSettingsToggleRowProps = Readonly<{
  label: string;
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onToggle: () => void;
}>;

function CanvasSettingsToggleRow({
  label,
  active,
  activeLabel,
  inactiveLabel,
  onToggle,
}: CanvasSettingsToggleRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 rounded border border-(--border-muted) bg-(--surface-panel-subtle) px-3 py-2">
      <span className="text-sm font-medium text-(--text-default)">{label}</span>
      <button
        type="button"
        className="min-w-28 rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) outline-none hover:bg-(--surface-elevated) focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        onClick={onToggle}
      >
        {active ? activeLabel : inactiveLabel}
      </button>
    </div>
  );
}

export function CanvasSettingsDialog({
  open,
  impactOverlayEnabled,
  columnLevelLineageEnabled,
  canUseCostOverlay,
  costOverlayEnabled,
  canvasGridVisible,
  canvasGridColor,
  canvasSnapToGrid,
  canvasEmptyStateGuideVisible,
  copy = canvasViewCopy,
  onToggleImpact,
  onToggleColumns,
  onToggleCostOverlay,
  onToggleGridVisible,
  onGridColorChange,
  onToggleSnapToGrid,
  onSetCanvasEmptyStateGuideVisible,
  onRestoreFocus,
  onClose,
}: CanvasSettingsDialogProps): JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        data-slot="canvas-settings-dialog"
        closeLabel={copy.canvasSettingsCloseLabel}
        className="max-w-2xl gap-0 overflow-hidden border-(--border-default) bg-(--surface-panel) p-0 text-(--text-default)"
        onCloseAutoFocus={(event) => {
          if (onRestoreFocus) {
            event.preventDefault();
            onRestoreFocus();
          }
        }}
      >
        <DialogHeader className="border-b border-(--border-muted) px-5 py-4 pr-12">
          <DialogTitle>{copy.canvasContextMenuCanvasSettingsLabel}</DialogTitle>
          <DialogDescription>{copy.canvasSettingsDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 p-4">
          <CanvasSettingsToggleRow
            label={copy.toolbarImpactLabel}
            active={impactOverlayEnabled}
            activeLabel={copy.canvasSettingsDisableLabel}
            inactiveLabel={copy.canvasSettingsEnableLabel}
            onToggle={onToggleImpact}
          />
          <CanvasSettingsToggleRow
            label={copy.toolbarColumnsLabel}
            active={columnLevelLineageEnabled}
            activeLabel={copy.canvasSettingsDisableLabel}
            inactiveLabel={copy.canvasSettingsEnableLabel}
            onToggle={onToggleColumns}
          />
          {canUseCostOverlay ? (
            <CanvasSettingsToggleRow
              label={copy.toolbarCostLabel}
              active={costOverlayEnabled}
              activeLabel={copy.canvasSettingsDisableLabel}
              inactiveLabel={copy.canvasSettingsEnableLabel}
              onToggle={onToggleCostOverlay}
            />
          ) : null}
          <div className="flex items-center justify-between gap-4 rounded border border-(--border-muted) bg-(--surface-panel-subtle) px-3 py-2">
            <span className="text-sm font-medium text-(--text-default)">
              {copy.toolbarGridLabel}
            </span>
            <button
              type="button"
              className="min-w-28 rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) outline-none hover:bg-(--surface-elevated) focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              onClick={onToggleGridVisible}
            >
              {canvasGridVisible
                ? copy.canvasSettingsHideGridLabel
                : copy.canvasSettingsShowGridLabel}
            </button>
          </div>
          <label className="flex items-center justify-between gap-4 rounded border border-(--border-muted) bg-(--surface-panel-subtle) px-3 py-2 text-sm font-medium text-(--text-default)">
            {copy.toolbarGridColorLabel}
            <input
              type="color"
              value={canvasGridColor}
              aria-label={copy.toolbarGridColorLabel}
              className="size-8 cursor-pointer rounded border border-(--border-default) bg-transparent p-0"
              onInput={(event) => onGridColorChange(event.currentTarget.value as CanvasPaletteId)}
            />
          </label>
          <div className="flex items-center justify-between gap-4 rounded border border-(--border-muted) bg-(--surface-panel-subtle) px-3 py-2">
            <span className="text-sm font-medium text-(--text-default)">
              {copy.toolbarSnapToGridLabel}
            </span>
            <button
              type="button"
              className="min-w-28 rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) outline-none hover:bg-(--surface-elevated) focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              onClick={onToggleSnapToGrid}
            >
              {canvasSnapToGrid
                ? copy.canvasSettingsDisableSnapLabel
                : copy.canvasSettingsEnableSnapLabel}
            </button>
          </div>
          <CanvasSettingsToggleRow
            label={copy.toolbarEmptyCanvasGuideLabel}
            active={canvasEmptyStateGuideVisible}
            activeLabel={copy.canvasSettingsDisableLabel}
            inactiveLabel={copy.canvasSettingsEnableLabel}
            onToggle={() => onSetCanvasEmptyStateGuideVisible(!canvasEmptyStateGuideVisible)}
          />
        </div>
        <DialogFooter className="border-t border-(--border-muted) bg-(--surface-panel-subtle) px-5 py-3">
          <DialogClose asChild>
            <button
              type="button"
              data-slot="canvas-settings-close-command"
              className="rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) outline-none hover:bg-(--surface-elevated) focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {copy.canvasSettingsCloseLabel}
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

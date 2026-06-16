/** Owned concern: render contextual Canvas settings without owning preference state. */
import type { CanvasPaletteId } from './canvasPalette';

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
  onToggleImpact: () => void;
  onToggleColumns: () => void;
  onToggleCostOverlay: () => void;
  onToggleGridVisible: () => void;
  onGridColorChange: (color: CanvasPaletteId) => void;
  onToggleSnapToGrid: () => void;
  onSetCanvasEmptyStateGuideVisible: (visible: boolean) => void;
  onClose: () => void;
}>;

type CanvasSettingsToggleRowProps = Readonly<{
  label: string;
  active: boolean;
  onToggle: () => void;
}>;

function CanvasSettingsToggleRow({
  label,
  active,
  onToggle,
}: CanvasSettingsToggleRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 rounded border border-(--border-muted) bg-(--surface-panel-subtle) px-3 py-2">
      <span className="text-sm font-medium text-(--text-default)">{label}</span>
      <button
        type="button"
        className="min-w-28 rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) hover:bg-(--surface-elevated)"
        onClick={onToggle}
      >
        {active ? 'Disable' : 'Enable'}
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
  onToggleImpact,
  onToggleColumns,
  onToggleCostOverlay,
  onToggleGridVisible,
  onGridColorChange,
  onToggleSnapToGrid,
  onSetCanvasEmptyStateGuideVisible,
  onClose,
}: CanvasSettingsDialogProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Canvas settings"
      data-slot="canvas-settings-dialog"
      className="absolute inset-0 z-40 flex items-start justify-center bg-black/40 p-8"
    >
      <section className="w-full max-w-2xl rounded-md border border-(--border-default) bg-(--surface-panel) shadow-2xl">
        <header className="border-b border-(--border-muted) px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-(--text-default)">Canvas settings</h2>
              <p className="mt-1 text-sm text-(--text-muted)">
                Graph display preferences for the active canvas.
              </p>
            </div>
            <button
              type="button"
              className="rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) hover:bg-(--surface-elevated)"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </header>
        <div className="grid gap-3 p-4">
          <CanvasSettingsToggleRow
            label="Impact overlay"
            active={impactOverlayEnabled}
            onToggle={onToggleImpact}
          />
          <CanvasSettingsToggleRow
            label="Column lineage"
            active={columnLevelLineageEnabled}
            onToggle={onToggleColumns}
          />
          {canUseCostOverlay ? (
            <CanvasSettingsToggleRow
              label="Cost overlay"
              active={costOverlayEnabled}
              onToggle={onToggleCostOverlay}
            />
          ) : null}
          <div className="flex items-center justify-between gap-4 rounded border border-(--border-muted) bg-(--surface-panel-subtle) px-3 py-2">
            <span className="text-sm font-medium text-(--text-default)">Grid</span>
            <button
              type="button"
              className="min-w-28 rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) hover:bg-(--surface-elevated)"
              onClick={onToggleGridVisible}
            >
              {canvasGridVisible ? 'Hide grid' : 'Show grid'}
            </button>
          </div>
          <label className="flex items-center justify-between gap-4 rounded border border-(--border-muted) bg-(--surface-panel-subtle) px-3 py-2 text-sm font-medium text-(--text-default)">
            Grid color
            <input
              type="color"
              value={canvasGridColor}
              aria-label="Grid color"
              className="size-8 cursor-pointer rounded border border-(--border-default) bg-transparent p-0"
              onInput={(event) => onGridColorChange(event.currentTarget.value as CanvasPaletteId)}
            />
          </label>
          <div className="flex items-center justify-between gap-4 rounded border border-(--border-muted) bg-(--surface-panel-subtle) px-3 py-2">
            <span className="text-sm font-medium text-(--text-default)">Snap to grid</span>
            <button
              type="button"
              className="min-w-28 rounded border border-(--border-default) px-3 py-1.5 text-sm text-(--text-default) hover:bg-(--surface-elevated)"
              onClick={onToggleSnapToGrid}
            >
              {canvasSnapToGrid ? 'Disable snap' : 'Enable snap'}
            </button>
          </div>
          <CanvasSettingsToggleRow
            label="Empty canvas guide"
            active={canvasEmptyStateGuideVisible}
            onToggle={() => onSetCanvasEmptyStateGuideVisible(!canvasEmptyStateGuideVisible)}
          />
        </div>
      </section>
    </div>
  );
}

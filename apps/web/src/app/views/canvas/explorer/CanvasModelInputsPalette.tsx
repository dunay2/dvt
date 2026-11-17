/**
 * Owned concern: retain Model-local input actions beside the project Explorer.
 * @baseline ADR-0069: the palette presents the existing occurrence owner unchanged.
 * @decision Reuse the shared popover and Explorer tokens for a compact input control.
 * @consequence Project navigation does not remove input inspection, dragging or addition.
 * @version 1.0.0
 */
import { useId, useState, type ReactNode } from 'react';
import { Cable } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Button } from '../../../components/ui/button';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import styles from './CanvasExplorer.module.css';

export function CanvasModelInputsPalette({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  const [open, setOpen] = useState(false);
  const id = useId();
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={styles.paletteAction}
          aria-controls={id}
          data-slot="canvas-model-inputs-command"
        >
          <Cable aria-hidden="true" />
          {copy.modelInputs}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        id={id}
        side="right"
        align="start"
        aria-label={copy.modelInputs}
        className={styles.palette}
        onDragEnd={() => setOpen(false)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

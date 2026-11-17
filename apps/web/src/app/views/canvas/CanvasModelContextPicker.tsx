/**
 * Owned concern: present the real choices when a Model has several input contexts.
 * @baseline ADR-0069: the picker delegates protected Model entry without allocating identity.
 * @decision Render the existing occurrence names through the shared dialog and button primitives.
 * @consequence Dismissing ambiguity opens nothing and retains the current session.
 * @version 1.0.0
 */
import { Box } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasExplorerCopy } from './explorer/canvasExplorerCopy';
import type { CanvasModelNavigationContext } from './canvasModelNavigationTarget';
import styles from './explorer/CanvasExplorer.module.css';

export function CanvasModelContextPicker({
  contexts,
  onSelect,
  onClose,
}: Readonly<{
  contexts: readonly CanvasModelNavigationContext[];
  onSelect: (nodeId: string) => void;
  onClose: () => void;
}>): JSX.Element {
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  return (
    <Dialog
      open={contexts.length > 0}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.chooseModelContext}</DialogTitle>
          <DialogDescription>{copy.modelContextDescription}</DialogDescription>
        </DialogHeader>
        <div className={styles.modelContexts}>
          {contexts.map((item) => (
            <Button
              key={item.nodeId}
              variant="outline"
              title={item.label}
              onClick={() => onSelect(item.nodeId)}
            >
              <Box aria-hidden="true" />
              {item.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

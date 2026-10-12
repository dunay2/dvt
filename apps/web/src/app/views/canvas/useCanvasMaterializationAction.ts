/** Adapt the existing command receipt into user feedback; no mutation authority here. */
import { useCallback } from 'react';
import { toast } from 'sonner';
import { getApplicationLanguage } from '../../stores/applicationLanguageStore';
import type { CanvasCardActions } from './canvasNodeInteractionPresentation';
import { materializationCopyEn } from './canvasMaterializationCopy.en';
import { materializationCopyEs } from './canvasMaterializationCopy.es';

export function useCanvasMaterializationAction(
  command: CanvasCardActions['onSetNodeMaterialization']
) {
  return useCallback(
    (nodeId: string, value: string) => {
      const result = command?.(nodeId, value);
      if (result?.outcome === 'rejected') {
        const copy = getApplicationLanguage().startsWith('es')
          ? materializationCopyEs
          : materializationCopyEn;
        toast.error(copy.updateFailed);
      }
    },
    [command]
  );
}

import { useEffect, useState } from 'react';

export function useCanvasToolbarPortalTarget(
  placement: 'inline' | 'top-bar'
): HTMLElement | null {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (placement !== 'top-bar' || typeof document === 'undefined') {
      setPortalTarget(null);
      return;
    }

    setPortalTarget(document.getElementById('shell-top-bar-canvas-controls'));
  }, [placement]);

  return portalTarget;
}

/** Owned concern: load the shared Monaco code surface without coupling route recovery to Suspense. */
import { useEffect, useState, type ComponentType } from 'react';

import type { MonacoCodeSurfaceProps } from './MonacoCodeSurface';

type MonacoCodeSurfaceComponent = ComponentType<MonacoCodeSurfaceProps>;

let monacoCodeSurfacePromise: Promise<{ default: MonacoCodeSurfaceComponent }> | null = null;

function loadMonacoCodeSurface(): Promise<{ default: MonacoCodeSurfaceComponent }> {
  monacoCodeSurfacePromise ??= import('./MonacoCodeSurface');
  return monacoCodeSurfacePromise;
}

export function useMonacoCodeSurface(): MonacoCodeSurfaceComponent | null {
  const [surface, setSurface] = useState<MonacoCodeSurfaceComponent | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    void loadMonacoCodeSurface().then(
      ({ default: loadedSurface }) => {
        if (active) {
          setSurface(() => loadedSurface);
        }
      },
      (error: unknown) => {
        if (active) {
          setLoadError(error);
        }
      }
    );
    return () => {
      active = false;
    };
  }, []);

  if (loadError != null) {
    throw loadError;
  }

  return surface;
}

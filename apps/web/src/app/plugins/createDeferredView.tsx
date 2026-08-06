/** Owned concern: load route view modules with visible localized progress and deterministic recovery. */
import { createElement, useEffect, useState, type ComponentType } from 'react';

import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';

type DeferredViewModule = Readonly<{ default: ComponentType }>;

export function createDeferredView(load: () => Promise<DeferredViewModule>): ComponentType {
  let loadedView: ComponentType | null = null;
  let loadError: unknown = null;
  let loadPromise: Promise<DeferredViewModule> | null = null;

  function ensureLoaded(): Promise<DeferredViewModule> {
    loadPromise ??= load().then((module) => {
      loadedView = module.default;
      return module;
    });
    return loadPromise;
  }

  function DeferredView(): JSX.Element {
    const language = useApplicationLanguageStore((state) => state.language);
    const [, renderLoadedView] = useState(0);

    useEffect(() => {
      if (loadedView != null || loadError != null) {
        return;
      }

      let active = true;
      void ensureLoaded().then(
        () => {
          if (active) {
            renderLoadedView((version) => version + 1);
          }
        },
        (error: unknown) => {
          loadError = error;
          if (active) {
            renderLoadedView((version) => version + 1);
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
    if (loadedView != null) {
      return createElement(loadedView);
    }

    return (
      <div
        data-slot="plugin-route-module-loading"
        className="flex h-full items-center justify-center bg-(--surface-canvas) text-sm text-(--text-muted)"
        role="status"
        aria-live="polite"
      >
        {language === 'es' ? 'Cargando vista…' : 'Loading view…'}
      </div>
    );
  }

  return DeferredView;
}

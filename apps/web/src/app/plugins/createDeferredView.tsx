/** Owned concern: load route view modules with visible localized progress and deterministic recovery. */
import { lazy, Suspense, type ComponentType } from 'react';

import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import styles from './createDeferredView.module.css';

type DeferredViewModule = Readonly<{ default: ComponentType }>;

function DeferredViewLoading(): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);

  return (
    <div
      data-slot="plugin-route-module-loading"
      className={styles.loading}
      role="status"
      aria-live="polite"
    >
      {language === 'es' ? 'Cargando vista…' : 'Loading view…'}
    </div>
  );
}

export function createDeferredView(load: () => Promise<DeferredViewModule>): ComponentType {
  const LoadedView = lazy(load);

  return function DeferredView(): JSX.Element {
    return (
      <Suspense fallback={<DeferredViewLoading />}>
        <LoadedView />
      </Suspense>
    );
  };
}

/** Owned concern: resolve the scoped current definition of the model requested from Runs. */
import { useSyncExternalStore } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import type { RunSnapshot } from '../../ports/runs';
import { useSessionContext } from '../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { projectRunModelLinks } from './runModelNavigation';

const messages = {
  en: {
    choose: 'Choose a model',
    missing: 'This run has no recorded model available in this workspace.',
    removed: 'The recorded model is unavailable in the current Canvas.',
    back: 'Run details',
  },
  es: {
    choose: 'Elige un modelo',
    missing: 'No hay un modelo registrado para esta ejecución en este espacio de trabajo.',
    removed: 'El modelo registrado no está disponible en el Canvas actual.',
    back: 'Detalle de la ejecución',
  },
};

export function RunExecutedModels({ snapshot }: Readonly<{ snapshot: RunSnapshot }>) {
  const session = useSessionContext();
  const scope = useSyncExternalStore(
    session.subscribeWorkspaceScope,
    session.getWorkspaceScopeSnapshot,
    session.getWorkspaceScopeSnapshot
  );
  const copy = messages[useApplicationLanguageStore((s) => s.language)];
  const [params] = useSearchParams();
  const links = projectRunModelLinks(snapshot, scope);
  const unavailable = params.get('unavailable') === '1';
  if (!unavailable && links.length === 1) return <Navigate replace to={links[0]!.href} />;
  return (
    <section aria-label={copy.choose}>
      {unavailable && <p role="status">{copy.removed}</p>}
      {links.length === 0 ? (
        <p>{copy.missing}</p>
      ) : (
        <ul>
          {links.map((link) => (
            <li key={link.modelId}>
              <Link to={link.href}>{link.modelId}</Link>
            </li>
          ))}
        </ul>
      )}
      <Link to={'/runs/' + encodeURIComponent(snapshot.runId)}>{copy.back}</Link>
    </section>
  );
}

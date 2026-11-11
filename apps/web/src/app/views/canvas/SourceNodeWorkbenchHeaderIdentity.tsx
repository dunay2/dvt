/**
 * Owned concern: present authoritative Source identity in the node workbench header.
 * @baseline GH-3578: adjacent provider text already conveys the decorative glyph's meaning.
 * @decision Keep the decorative fallback hidden; an editable identity retains its named control.
 * @consequence Provider and connection facts remain accessible once, with no invented fallback.
 * @version 1.0.0
 */
import { ConnectedSourceRefSchema } from '@dvt/contracts';
import type { ReactNode } from 'react';
import { ModelIdentityIcon } from '../../components/inspector/ModelIdentityIcon';
import styles from '../../components/inspector/ModelIdentity.module.css';
import { resolveCanvasModelIdentity } from './canvasModelIdentity';

import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type { CanonicalNode } from '../../types/canonical';
import {
  metadataOf,
  resolveGraphNodeRelationParts,
  stringValue,
} from '../../plugins/graph/graphNodeCardStrategyUtils';
import { cn } from '../../components/ui/utils';

type SourceProviderPresentation = Readonly<{
  label: string;
}>;

const SOURCE_PROVIDER_PRESENTATION = Object.freeze({
  postgres: { label: 'PostgreSQL' },
} satisfies Record<string, SourceProviderPresentation>);

function resolveProviderPresentation(provider: string | null): SourceProviderPresentation | null {
  if (provider == null) return null;
  return (
    SOURCE_PROVIDER_PRESENTATION[provider as keyof typeof SOURCE_PROVIDER_PRESENTATION] ?? null
  );
}

/** Preserve provider facts independently from the chosen presentation icon. */
export function SourceNodeWorkbenchHeaderIdentity({
  node,
  identityControl,
}: Readonly<{ node: CanonicalNode; identityControl?: ReactNode }>): JSX.Element {
  const metadata = metadataOf(node);
  const connectedSourceRef = ConnectedSourceRefSchema.safeParse(metadata.connectedSourceRef);
  const provider = connectedSourceRef.success
    ? connectedSourceRef.data.connectionRef.provider
    : null;
  const connectionId = connectedSourceRef.success
    ? connectedSourceRef.data.connectionRef.connectionId
    : null;
  const providerPresentation = resolveProviderPresentation(provider);
  const { database, schema, table } = resolveGraphNodeRelationParts(metadata);
  const physicalIdentifier = stringValue(metadata.tableIdentifier);
  const compactRelation =
    physicalIdentifier ??
    ([schema, table].filter((part): part is string => part != null).join('.') ||
      [database, schema, table].filter((part): part is string => part != null).join('.'));

  return (
    <div data-slot="canvas-source-workbench-header-identity" className={styles.identity}>
      <div
        data-slot="canvas-source-provider-icon"
        aria-hidden={identityControl == null ? true : undefined}
      >
        {identityControl ?? (
          <ModelIdentityIcon icon={resolveCanvasModelIdentity(node)!.icon} size="header" />
        )}
      </div>

      <div className={styles.text}>
        <h2
          className={cn(styles.title, inspectorVisualClasses.contextPanelTitle)}
          title={compactRelation || node.name}
        >
          {node.name}
        </h2>
        <p className={cn(styles.subtitle, inspectorVisualClasses.contextPanelSubtitle)}>
          {node.kind}
          {providerPresentation != null ? (
            <>
              {' '}
              · <span data-slot="canvas-source-provider-label">{providerPresentation.label}</span>
            </>
          ) : null}
        </p>
        {compactRelation ? (
          <p data-slot="canvas-source-qualified-resource" className="sr-only">
            {compactRelation}
          </p>
        ) : null}
        {connectionId ? (
          <p
            data-slot="canvas-source-connection-ref"
            className={cn(styles.subtitle, inspectorVisualClasses.contextPanelSubtitle)}
            title={connectionId}
          >
            {connectionId}
          </p>
        ) : null}
      </div>
    </div>
  );
}

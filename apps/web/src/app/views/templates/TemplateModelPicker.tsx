/** List project models with an insertion action only for confirmed SQL identities. */
import { useState } from 'react';
import { Box, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { TemplateProjectModel } from './templateProjectModels';
import type { ExecutionTemplateDefinition } from './templatesViewModel';
import type { TemplatesCopy } from './templatesCopy';
import styles from './templatesPresentation.module.css';

export function TemplateModelPicker({
  models,
  referenceStyle,
  loading,
  unavailable,
  copy,
  onInsert,
  onInspectModel,
}: Readonly<{
  models: readonly TemplateProjectModel[];
  referenceStyle: ExecutionTemplateDefinition['referenceStyle'];
  loading: boolean;
  unavailable: boolean;
  copy: TemplatesCopy;
  onInsert: (reference: string) => void;
  onInspectModel: () => void;
}>) {
  const [query, setQuery] = useState('');
  const visible = models.filter((m) =>
    [m.label, m.context, m.isSource ? copy.sourceBadge : '']
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );
  return (
    <section className={styles.librarySection} aria-label={copy.models}>
      <h2 className={styles.catalogHeading}>
        {copy.models} · {visible.length}
      </h2>
      <Input
        aria-label={copy.find}
        placeholder={copy.find}
        value={query}
        className={styles.control}
        onChange={(e) => setQuery(e.target.value)}
      />
      {unavailable && (
        <p className={styles.helper} role="status">
          {copy.readError}
        </p>
      )}
      <div className={styles.scrollList}>
        {visible.map((model) => {
          const ref = referenceStyle === 'none' ? undefined : model.references[referenceStyle];
          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              key={model.id}
              className={styles.modelItem}
              disabled={!ref}
              title={ref ?? copy.unavailable}
              aria-label={(ref ? copy.insert + ' ' : '') + model.label}
              onClick={() => ref && onInsert(ref)}
            >
              <Box aria-hidden="true" />
              <span>{model.label}</span>
              {model.isSource && <small>{copy.sourceBadge}</small>}
              {ref && <Plus aria-hidden="true" />}
            </Button>
          );
        })}
      </div>
      {!visible.length && (
        <p className={styles.helper}>
          {loading ? copy.loading : query ? copy.noMatches : copy.noModels}
        </p>
      )}
      {visible.length > 0 &&
        visible.every((m) => referenceStyle === 'none' || !m.references[referenceStyle]) && (
          <p className={styles.helper}>{copy.unavailable}</p>
        )}
      {referenceStyle !== 'postgresql' && models.some((m) => m.references.postgresql) && (
        <Button type="button" size="sm" variant="outline" onClick={onInspectModel}>
          {copy.inspectModel}
        </Button>
      )}
    </section>
  );
}

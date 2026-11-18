/** Browse built-in and scoped project templates independently from model insertion. */
import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';
import type { TemplatesCopy } from './templatesCopy';
import { EXECUTION_TEMPLATE_CATALOG, localizeExecutionTemplate } from './templatesViewModel';
import styles from './templatesPresentation.module.css';

export function TemplateLibrary({
  copy,
  language,
  selected,
  paths,
  pagination,
  onSelect,
  children,
}: Readonly<{
  copy: TemplatesCopy;
  language: ApplicationLanguage;
  selected: string;
  paths: readonly string[];
  pagination: { more: boolean; error: boolean; loading: boolean; load: () => void };
  onSelect: (id: string) => void;
  children: ReactNode;
}>) {
  const [query, setQuery] = useState('');
  const filter = query.trim().toLowerCase();
  const recipes = EXECUTION_TEMPLATE_CATALOG.map((t) =>
    localizeExecutionTemplate(t, language)
  ).filter((t) => [t.label, t.provider, t.description].join(' ').toLowerCase().includes(filter));
  const projectFiles = paths.filter((p) => p.toLowerCase().includes(filter));
  function row(id: string, label: string, provider?: string) {
    return (
      <Button
        type="button"
        variant="outline"
        key={id}
        aria-pressed={selected === id}
        className={styles.catalogItem}
        onClick={() => onSelect(id)}
      >
        <span className={styles.catalogLabel}>
          <span className={styles.fieldLabel}>{label}</span>
          {provider && <span className={styles.helper}>{provider}</span>}
        </span>
      </Button>
    );
  }
  return (
    <Card data-slot="templates-catalog" className={styles.panel}>
      <section aria-label={copy.catalog} className={styles.librarySection}>
        <h2 className={styles.catalogHeading}>{copy.catalog}</h2>
        <Input
          aria-label={copy.search}
          placeholder={copy.search}
          className={styles.control}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.scrollList}>
          {(['task', 'procedure', 'model'] as const).map((group) => {
            const groupItems = recipes.filter(
              (t) => t.category === group || (group === 'task' && t.category === 'workflow')
            );
            return (
              groupItems.length > 0 && (
                <div key={group} className={styles.catalogProfiles}>
                  <h3 className={styles.groupLabel}>{copy.groups[group]}</h3>
                  {groupItems.map((t) => row(t.id, t.label, t.provider))}
                </div>
              )
            );
          })}
          {projectFiles.length > 0 && (
            <div className={styles.catalogProfiles}>
              <h3 className={styles.groupLabel}>{copy.project}</h3>
              {projectFiles.map((p) => row(p, p.slice(p.lastIndexOf('/') + 1, -5)))}
            </div>
          )}
          {pagination.error && (
            <p role="status" className={styles.helper}>
              {copy.directoryError}
            </p>
          )}
          {(pagination.more || pagination.error) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.loading}
              onClick={pagination.load}
            >
              {pagination.error ? copy.retry : copy.moreTemplates}
            </Button>
          )}
          {!recipes.length &&
            !projectFiles.length &&
            !pagination.more &&
            !pagination.error &&
            !pagination.loading && <p className={styles.helper}>{copy.noMatches}</p>}
        </div>
      </section>
      {children}
    </Card>
  );
}

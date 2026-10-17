/** Owned concern: present the catalogue failure and its explicit recovery action. */
import { Button } from '../ui/button';
import { resolveSourceImportFailureMessage, useSourceImportLocalization } from './copy';
import type { SourceImportCatalogRecoveryBinding } from './sourceImportCatalogRecovery.binding';
import styles from './SourceImportCatalogRecovery.module.css';

export function SourceImportCatalogRecovery({
  binding,
}: Readonly<{ binding: SourceImportCatalogRecoveryBinding }>) {
  const { copy } = useSourceImportLocalization();
  if (binding.model.status !== 'failed') return null;
  return (
    <div role="alert" data-slot="source-import-catalogue-recovery" className={styles.recovery}>
      <span>{resolveSourceImportFailureMessage(copy, binding.model.failure)}</span>
      <Button variant="outline" onClick={binding.retry}>
        {copy.retryCatalogueAction}
      </Button>
    </div>
  );
}

/** Owned concern: present the current catalogue failure and its explicit recovery action. */
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { resolveSourceImportFailureMessage, useSourceImportLocalization } from './copy';
import type { SourceImportCatalogRecoveryBinding } from './sourceImportCatalogRecovery.binding';

export function SourceImportCatalogRecovery({
  binding,
}: Readonly<{ binding: SourceImportCatalogRecoveryBinding }>) {
  const { copy } = useSourceImportLocalization();
  if (binding.failure === null) return null;
  return (
    <Alert
      variant="destructive"
      data-slot="source-import-catalogue-recovery"
      aria-live="assertive"
      aria-atomic="true"
    >
      <AlertDescription>
        <span>{resolveSourceImportFailureMessage(copy, binding.failure)}</span>
        <Button variant="outline" onClick={binding.retry}>
          {copy.retryCatalogueAction}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/** Owned concern: adapt Templates route command state to the scoped project workbench.
 * Rails: SelectExecutionTemplateProfile and UpdateExecutionTemplateParameterValue.
 * Corner: a workspace change retires local drafts, pending reads and editor selection.
 */
import { WandSparkles } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { createCompleteRouteBootstrapPresentation } from '../bootstrap/routeBootstrapContract';
import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ViewHeader } from '../components/domain/ViewHeader';
import { Badge } from '../components/ui/badge';
import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';
import { useSessionContext } from '../services/AppServicesContext';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { TemplatesRouteWorkbench } from './templates/TemplatesRouteWorkbench';
import styles from './templates/templatesPresentation.module.css';
import { EXECUTION_TEMPLATE_CATALOG } from './templates/templatesViewModel';
import { templatesCopy } from './templates/templatesCopy';

export function TemplatesViewHeader() {
  const copy = templatesCopy(useApplicationLanguageStore((s) => s.language));
  return (
    <div data-slot="templates-view-header-band" className={styles.headerBand}>
      <ViewHeader
        className={styles.viewHeader}
        title={copy.title}
        icon={<WandSparkles aria-hidden="true" className={styles.headerIcon} />}
        subtitle={copy.subtitle}
        actions={
          <Badge variant="outline" className={styles.fileName}>
            {copy.profiles}: {EXECUTION_TEMPLATE_CATALOG.length}
          </Badge>
        }
      />
    </div>
  );
}
export default function TemplatesView() {
  usePublishedRouteBootstrap(
    'dvt.templates',
    createCompleteRouteBootstrapPresentation('Templates route is ready')
  );
  const session = useSessionContext();
  const scope = useSyncExternalStore(
    session.subscribeWorkspaceScope,
    session.getWorkspaceScopeSnapshot,
    session.getWorkspaceScopeSnapshot
  );
  const language = useApplicationLanguageStore((s) => s.language);
  return (
    <RouteWorkbenchFrame
      header={<TemplatesViewHeader />}
      bodyClassName={styles.routeBody}
      bodyContainerClassName={styles.bodyContainer}
      slots={{
        primarySurface: (
          <TemplatesRouteWorkbench key={JSON.stringify(scope)} scope={scope} language={language} />
        ),
      }}
    />
  );
}

/** Inspect an identity-bound definition through the existing scoped file query. */
import { sha256HexUtf8 } from '@dvt/crypto';
import { X } from 'lucide-react';

import {
  inspectorPropertyClasses,
  inspectorVisualClasses,
} from '../../components/inspector/inspectorVisualTokens';
import { NodePropertyFacts } from '../../components/inspector/NodePropertyFacts';
import { Button } from '../../components/ui/button';
import { routeWorkbenchPanelHeaderClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { useWorkspaceFileContentQuery } from '../../queries/workspaceQueries';
import type { CodeInlineReferenceDetail } from './codeInlineReferences';
import type { CodeInlineReferenceCopy } from './codeViewCopy';

export function CodeReferenceDetails({
  reference,
  copy,
  onClose,
  overlay = false,
}: Readonly<{
  reference: CodeInlineReferenceDetail;
  copy: CodeInlineReferenceCopy;
  onClose: () => void;
  overlay?: boolean;
}>): JSX.Element {
  const query = useWorkspaceFileContentQuery(reference.definition?.path);
  const file = query.data;
  const definition = reference.definition;
  const verified =
    query.isSuccess &&
    !query.isFetching &&
    definition != null &&
    file != null &&
    file.path === definition.path &&
    file.contentSha256 === definition.revisionSha256 &&
    sha256HexUtf8(file.content) === definition.revisionSha256;

  return (
    <section
      aria-label={reference.name}
      className={overlay ? 'code-reference-overlay' : 'flex h-full min-h-0 flex-col'}
    >
      <div className={routeWorkbenchPanelHeaderClassName}>
        <h2 className="min-w-0 flex-1 truncate">{reference.name}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label={copy.closeLabel}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 text-xs">
        <NodePropertyFacts
          rows={[
            {
              label: reference.kind === 'model' ? copy.modelLabel : copy.sourceLabel,
              value: reference.name,
            },
            ...(reference.inputs.length === 0
              ? []
              : [{ label: copy.inputsLabel, value: reference.inputs.join(', ') }]),
            { label: copy.outputLabel, value: reference.name },
          ]}
        />
        <h3 className="font-medium">
          {copy.declaredColumnsLabel} ({reference.columns.length})
        </h3>
        {reference.columns.length === 0 ? (
          <p className={inspectorVisualClasses.inspectorArtifactDetail}>
            {copy.emptyColumnsMessage}
          </p>
        ) : (
          <div className={inspectorPropertyClasses.records.region}>
            <div className="p-2">
              <NodePropertyFacts
                rows={reference.columns.map((column) => ({
                  label: column.name,
                  value: column.dataType ?? copy.unknownTypeLabel,
                }))}
              />
            </div>
          </div>
        )}
        <h3 className="font-medium">{copy.definitionLabel}</h3>
        {definition != null && (query.isPending || query.isFetching) ? (
          <p role="status" className={inspectorVisualClasses.inspectorArtifactDetail}>
            {copy.checkingMessage}
          </p>
        ) : verified && file != null ? (
          <pre className={inspectorVisualClasses.inspectorCodeBlock}>
            <code>{file.content}</code>
          </pre>
        ) : (
          <p role="status" className={inspectorVisualClasses.inspectorArtifactDetail}>
            {copy.missingDefinitionMessage}
          </p>
        )}
      </div>
    </section>
  );
}

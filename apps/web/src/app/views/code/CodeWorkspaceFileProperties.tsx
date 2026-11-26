/** Owned concern: present metadata and the Git history slot for an accepted file. */
import type { Ref } from 'react';
import { NodePropertyFacts } from '../../components/inspector/NodePropertyFacts';
import { routeWorkbenchPanelHeaderClassName } from '../../components/workbench/RouteWorkbenchFrame';
import type { FileContent } from '../../ports/workspace';
import type { CodeViewCopy } from './codeViewCopy';
import { isWorkspaceOperationSqlPath } from './codeWorkspaceFileEditPosture';

export function CodeWorkspaceFileProperties({
  copy,
  file,
  message,
  locale,
  historyHost,
}: Readonly<{
  copy: CodeViewCopy;
  file: FileContent | undefined;
  message: Readonly<{ text: string; error: boolean }> | null;
  locale: string;
  historyHost: Ref<HTMLDivElement>;
}>): JSX.Element {
  const historyFile = isWorkspaceOperationSqlPath(file?.path);
  const modifiedAt = historyFile || file === undefined ? NaN : Date.parse(file.lastModified);
  return (
    <>
      <h2 className={routeWorkbenchPanelHeaderClassName}>{copy.filePropertiesTitle}</h2>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {message != null ? (
          <p role={message.error ? 'alert' : undefined} className="text-xs text-(--text-muted)">
            {message.text}
          </p>
        ) : (
          file && (
            <>
              <NodePropertyFacts
                rows={[
                  { label: copy.name, value: file.name },
                  { label: copy.path, value: file.path },
                  { label: copy.language, value: file.language },
                  ...(Number.isNaN(modifiedAt)
                    ? []
                    : [
                        {
                          label: copy.loadedVersionModified,
                          value: (
                            <time dateTime={file.lastModified}>
                              {new Date(modifiedAt).toLocaleString(locale)}
                            </time>
                          ),
                        },
                      ]),
                ]}
              />
              {historyFile && <div ref={historyHost} />}
            </>
          )
        )}
      </div>
    </>
  );
}

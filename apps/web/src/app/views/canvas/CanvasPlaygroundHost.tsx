/** Owned concern: render the host-owned first-canvas creation state for the Canvas playground. */
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { canvasViewCopy } from './copy';
import type { CanvasCreateCanvasDocumentCommand } from './canvasDraftLifecycle.types';
import { CanvasPlaygroundHostTemplate } from './CanvasPlaygroundHost.templates';

export type CreateCanvasDocumentCommand = (command: CanvasCreateCanvasDocumentCommand) => void;

export function CanvasPlaygroundHost({
  workspaceScope,
  canvasKinds,
  onCreateCanvasDocument,
}: Readonly<{
  workspaceScope: WorkspaceScope;
  canvasKinds: readonly CanvasKindRegistration[];
  onCreateCanvasDocument?: CreateCanvasDocumentCommand;
}>) {
  return (
    <CanvasPlaygroundHostTemplate
      copy={{
        title: canvasViewCopy.routeNeedsCanvasTitle,
        message: canvasViewCopy.routeNeedsCanvasMessage,
        helper: canvasViewCopy.routeNeedsCanvasHelper,
        workspaceLabel: canvasViewCopy.routeNeedsCanvasWorkspaceLabel,
        templateLabel: canvasViewCopy.routeNeedsCanvasTemplateLabel,
      }}
      workspaceScope={workspaceScope}
      canvasKinds={canvasKinds}
      onCreateCanvasKind={(registration) =>
        onCreateCanvasDocument?.({
          kind: registration.kind,
          title: registration.createTitle,
        })
      }
    />
  );
}

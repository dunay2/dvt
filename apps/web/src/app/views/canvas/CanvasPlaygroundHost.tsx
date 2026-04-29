/** Owned concern: render the host-owned first-canvas creation state for the Canvas playground. */
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import { canvasViewCopy } from './copy';
import type { CanvasCreateCanvasDocumentCommand } from './canvasDraftLifecycle.types';
import { CanvasPlaygroundHostTemplate } from './CanvasPlaygroundHost.templates';

export type CreateCanvasDocumentCommand = (command: CanvasCreateCanvasDocumentCommand) => void;

export function CanvasPlaygroundHost({
  canvasKinds,
  onCreateCanvasDocument,
}: Readonly<{
  canvasKinds: readonly CanvasKindRegistration[];
  onCreateCanvasDocument?: CreateCanvasDocumentCommand;
}>) {
  return (
    <CanvasPlaygroundHostTemplate
      copy={{
        title: canvasViewCopy.routeNeedsCanvasTitle,
        message: canvasViewCopy.routeNeedsCanvasMessage,
        helper: canvasViewCopy.routeNeedsCanvasHelper,
      }}
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

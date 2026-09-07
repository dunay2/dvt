/** Owned concern: render the host-owned first-canvas creation state for the Canvas playground. */
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import { canvasViewCopy } from './copy';
import type { CanvasCreateCanvasDocumentCommand } from './canvasDraftLifecycle.types';
import { CanvasPlaygroundHostTemplate } from './CanvasPlaygroundHost.templates';

export type CreateCanvasDocumentCommand = (command: CanvasCreateCanvasDocumentCommand) => void;

export function CanvasPlaygroundHost({
  canvasKinds,
  onCreateCanvasDocument,
  unavailableMessage = null,
}: Readonly<{
  canvasKinds: readonly CanvasKindRegistration[];
  onCreateCanvasDocument?: CreateCanvasDocumentCommand;
  unavailableMessage?: string | null;
}>) {
  const registration = canvasKinds.find((entry) => entry.kind === 'transformation');

  return (
    <CanvasPlaygroundHostTemplate
      copy={{
        title: canvasViewCopy.routeNeedsCanvasTitle,
        message: canvasViewCopy.routeNeedsCanvasMessage,
        actionLabel: canvasViewCopy.routeNeedsCanvasActionLabel,
      }}
      unavailableMessage={unavailableMessage}
      onCreateCanvas={
        onCreateCanvasDocument == null || registration == null
          ? undefined
          : () => onCreateCanvasDocument({ kind: registration.kind, title: 'Canvas' })
      }
    />
  );
}

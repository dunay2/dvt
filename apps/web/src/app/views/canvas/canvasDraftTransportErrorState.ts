import { canvasViewCopy } from './copy';
import type { useCanvasController } from './useCanvasController';

export type CanvasDraftTransportErrorState =
  | { kind: 'forbidden'; title: string; message: string }
  | { kind: 'format_error'; title: string; message: string };

export function resolveCanvasDraftTransportErrorState(
  controller: Pick<
    ReturnType<typeof useCanvasController>,
    'draftAccessMode' | 'draftFormatError'
  >
): CanvasDraftTransportErrorState | null {
  if (controller.draftAccessMode === 'forbidden') {
    return {
      kind: 'forbidden',
      title: canvasViewCopy.draftAccessDeniedTitle,
      message: canvasViewCopy.draftAccessDeniedMessage,
    };
  }

  if (controller.draftFormatError == null) {
    return null;
  }

  if (controller.draftFormatError.reason === 'unsupported_schema_version') {
    const storedSchemaVersion =
      controller.draftFormatError.storedSchemaVersion == null
        ? ''
        : ` Stored schema version: ${controller.draftFormatError.storedSchemaVersion}.`;
    return {
      kind: 'format_error',
      title: canvasViewCopy.draftUnsupportedSchemaTitle,
      message: `${canvasViewCopy.draftUnsupportedSchemaMessage}${storedSchemaVersion}`,
    };
  }

  if (controller.draftFormatError.reason === 'migration_failed') {
    return {
      kind: 'format_error',
      title: canvasViewCopy.draftMigrationFailedTitle,
      message: canvasViewCopy.draftMigrationFailedMessage,
    };
  }

  return {
    kind: 'format_error',
    title: canvasViewCopy.draftCorruptPayloadTitle,
    message: canvasViewCopy.draftCorruptPayloadMessage,
  };
}

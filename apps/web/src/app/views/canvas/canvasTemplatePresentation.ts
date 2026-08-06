/** Owned concern: resolve route-visible Canvas template copy from registry input. */
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';

export type CanvasTemplatePresentation = Readonly<{
  registration: CanvasKindRegistration;
  kind: CanvasKindRegistration['kind'];
  title: string;
  description: string;
}>;

export function resolveCanvasTemplatePresentation(
  registration: CanvasKindRegistration
): CanvasTemplatePresentation {
  return {
    registration,
    kind: registration.kind,
    title: registration.createTitle,
    description: registration.description,
  };
}

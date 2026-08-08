import type { CanvasViewLanguage } from './canvasCopy.types';

export type CanvasNodeWorkbenchHelpCopy = Readonly<{
  nodeWorkbenchHelpLabel: string;
  nodeWorkbenchHelpDescription: string;
}>;

const NODE_WORKBENCH_HELP_COPY: Record<CanvasViewLanguage, CanvasNodeWorkbenchHelpCopy> = {
  en: {
    nodeWorkbenchHelpLabel: 'Node workbench help',
    nodeWorkbenchHelpDescription:
      'Inspect and edit only the properties owned by this node authority. Use Code for authored source when it is available.',
  },
  es: {
    nodeWorkbenchHelpLabel: 'Ayuda del banco de trabajo',
    nodeWorkbenchHelpDescription:
      'Consulta y edita únicamente las propiedades que pertenecen a la autoridad de este nodo. Usa Código para el fuente editable cuando esté disponible.',
  },
};

export function resolveCanvasNodeWorkbenchHelpCopy(
  language: CanvasViewLanguage
): CanvasNodeWorkbenchHelpCopy {
  return NODE_WORKBENCH_HELP_COPY[language];
}

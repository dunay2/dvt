/** Localized presentation copy for the Model composition Workbench. */
const en = {
  title: 'Composition',
  output: 'Output',
  operations: 'Operations',
  close: 'Close composition',
  move: 'Move composition panel',
};

const es: typeof en = {
  title: 'Composición',
  output: 'Output',
  operations: 'Operaciones',
  close: 'Cerrar composición',
  move: 'Mover panel de composición',
};

export function resolveCanvasModelCompositionCopy(language: string): typeof en {
  return language === 'es' ? es : en;
}

/** Language catalog for Source card appearance controls. */
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';
import type { SourceCardAppearance } from '../../types/sourceCardAppearance';

export type SourceCardAppearanceCopy = Readonly<
  Record<keyof SourceCardAppearance | 'title' | 'reset', string>
>;

export const sourceCardAppearanceCopy: Readonly<
  Record<ApplicationLanguage, SourceCardAppearanceCopy>
> = {
  en: {
    title: 'Appearance',
    tags: 'Tags',
    columns: 'Columns',
    qualifiedName: 'Qualified name',
    types: 'Data types',
    nullability: 'Nullability',
    rows: 'Rows',
    size: 'Size',
    color: 'Card color',
    reset: 'Reset appearance',
  },
  es: {
    title: 'Apariencia',
    tags: 'Etiquetas',
    columns: 'Columnas',
    qualifiedName: 'Nombre cualificado',
    types: 'Tipos de datos',
    nullability: 'Nulabilidad',
    rows: 'Filas',
    size: 'Tamaño',
    color: 'Color de la tarjeta',
    reset: 'Restablecer apariencia',
  },
};

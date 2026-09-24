/** Owned concern: localized labels and actionable occurrence admission feedback. */
const en = {
  fields: 'Fields',
  fieldsUnavailable: 'The fields of this relation could not be analyzed.',
  add: 'Add instance',
  alias: 'Instance alias',
  update: 'Update alias',
  invalid_alias: 'Enter a non-empty name of at most 256 characters.',
  aliasUnsupported: 'This composition does not support instance alias editing yet.',
  read_only: 'This model is read-only.',
  unsupported:
    'Adding an instance requires an existing JOIN without outer operations. The current composition will not be replaced.',
  unavailable: 'A connected source on the same connection is required.',
  incompatible: 'No compatible fields are available for the JOIN condition.',
};
const es: typeof en = {
  fields: 'Campos',
  fieldsUnavailable: 'No se han podido analizar los campos de esta relación.',
  add: 'Añadir instancia',
  alias: 'Alias de instancia',
  update: 'Actualizar alias',
  invalid_alias: 'Introduce un nombre no vacío de hasta 256 caracteres.',
  aliasUnsupported: 'Esta composición aún no admite editar alias de instancia.',
  read_only: 'Este modelo es de solo lectura.',
  unsupported:
    'Añadir una instancia requiere un JOIN existente sin operaciones externas. No se reemplazará la composición actual.',
  unavailable: 'Se necesita una fuente conectada en la misma conexión.',
  incompatible: 'No hay campos compatibles para la condición del JOIN.',
};
export function sourceOccurrenceCopy(language: string): typeof en {
  return language === 'es' ? es : en;
}

/** Model SQL interaction copy is catalog data, independent from language branching. */
import type { ApplicationLanguage } from '../../../stores/applicationLanguageStore';

const en = {
  title: 'SQL',
  open: 'Open Model SQL',
  edit: 'Edit SQL',
  close: 'Collapse SQL panel',
  editor: 'Model SQL source',
  validate: 'Validate',
  execute: 'Execute',
  generate: 'Generate Model',
  refresh: 'Refresh inputs',
  validateHint: 'Validate syntax, names and supported semantic operations',
  executeHint: 'Query rows without changing the Model (Ctrl+Enter)',
  generateHint: 'Apply this SQL to the semantic Model through the existing draft command',
  loading: 'Preparing SQL editor…',
  working: 'Working…',
  ready: 'Ready',
  modified: 'SQL draft',
  valid: 'Valid',
  inputs: 'Inputs',
  noInputs: 'Connect a Source or Model on the canvas to prepare SQL inputs.',
  hint: 'Use a logical or physical name for a prepared input. Generate Model validates and applies the SQL.',
  unsupported:
    'Initial profile: SELECT fields, aliases, joins, filters, ordering and limits. Functions, aggregation and CTEs are not yet representable.',
  tooLong:
    'SQL exceeds the supported source length. Your text is kept; shorten it before continuing.',
  conflict: 'Apply or discard the pending semantic edits before generating a Model from SQL.',
  applyFailed:
    'The Model rejected this proposal. Review dependent outputs and the diagnostics; your SQL is kept.',
  discard: 'Discard SQL changes',
  cancel: 'Cancel request',
  unknown: 'Unknown',
  diagnostics: 'SQL diagnostics',
  contextRequired: 'Refresh inputs before continuing.',
  data: 'SQL results',
  failure: {
    unavailable:
      'The SQL query is unavailable. Check the Model, published inputs and connection, then retry.',
    stale: 'The saved Model or its inputs changed. Refresh inputs; your SQL has been kept.',
    denied: 'You do not have access to this Model or the metadata required for its inputs.',
    contract: 'The server response does not match this SQL request. No result was applied.',
  },
  dataHint: 'Rows from this SQL draft; the semantic Model has not been changed by Execute.',
  staleDataTitle: 'Previous results',
  staleData: 'These rows are from a previous execution. Execute to refresh them.',
};
export type ModelSqlCopy = typeof en;
const es: ModelSqlCopy = {
  title: 'SQL',
  open: 'Abrir SQL del modelo',
  edit: 'Editar SQL',
  close: 'Plegar panel SQL',
  editor: 'SQL del modelo',
  validate: 'Validar',
  execute: 'Ejecutar',
  generate: 'Generar modelo',
  refresh: 'Actualizar entradas',
  validateHint: 'Validar sintaxis, nombres y operaciones semánticas admitidas',
  executeHint: 'Consultar filas sin cambiar el modelo (Ctrl+Intro)',
  generateHint: 'Aplicar este SQL al modelo semántico mediante el comando de borrador existente',
  loading: 'Preparando editor SQL…',
  working: 'Procesando…',
  ready: 'Preparado',
  modified: 'Borrador SQL',
  valid: 'Válido',
  inputs: 'Entradas',
  noInputs: 'Conecta una fuente o un modelo en el canvas para preparar las entradas SQL.',
  hint: 'Usa el nombre lógico o físico de una entrada preparada. Generar modelo valida y aplica el SQL.',
  unsupported:
    'Perfil inicial: SELECT de campos, alias, joins, filtros, ordenación y límites. Todavía no se representan funciones, agregaciones ni CTE.',
  tooLong: 'El SQL supera la longitud admitida. Se conserva tu texto; redúcelo antes de continuar.',
  conflict:
    'Aplica o descarta los cambios semánticos pendientes antes de generar el modelo desde SQL.',
  applyFailed:
    'El modelo ha rechazado la propuesta. Revisa sus salidas dependientes y los diagnósticos; se conserva tu SQL.',
  discard: 'Descartar cambios SQL',
  cancel: 'Cancelar solicitud',
  unknown: 'Desconocido',
  diagnostics: 'Diagnósticos SQL',
  contextRequired: 'Actualiza las entradas antes de continuar.',
  data: 'Resultados SQL',
  failure: {
    unavailable:
      'La consulta SQL no está disponible. Revisa el modelo, las entradas publicadas y la conexión e inténtalo de nuevo.',
    stale:
      'Han cambiado el modelo guardado o sus entradas. Actualiza las entradas; se conserva tu SQL.',
    denied: 'No tienes acceso al modelo o a los metadatos necesarios de sus entradas.',
    contract:
      'La respuesta del servidor no corresponde a este SQL. No se ha aplicado ningún resultado.',
  },
  dataHint: 'Filas de este borrador SQL; Ejecutar no modifica el modelo semántico.',
  staleDataTitle: 'Resultados anteriores',
  staleData: 'Estas filas son de una ejecución anterior. Ejecuta para actualizarlas.',
};
const catalog: Record<ApplicationLanguage, ModelSqlCopy> = { en, es };
export const resolveModelSqlCopy = (language: ApplicationLanguage) => catalog[language];

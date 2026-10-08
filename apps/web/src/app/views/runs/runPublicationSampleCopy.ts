/**
 * Owned concern: localize publication-bound row sampling and actionable failures.
 * @baseline ADR-0044: structured failure reasons own semantics, not diagnostic prose.
 * @decision Describe a bounded live query separately from immutable run evidence.
 * @consequence Neither language promises historical rows from a mutable publication.
 * @version 1.0.0
 */
import { SOURCE_DATA_SAMPLE_DEFAULT_LIMIT } from '@dvt/contracts';

import type { RunPublicationSampleFailure } from '../../services/runs/runPublicationSample';

const en = {
  title: 'Published rows',
  load: 'Load rows',
  refresh: 'Refresh rows',
  loading: 'Loading rows…',
  bounded: `Bounded first page: up to ${SOURCE_DATA_SAMPLE_DEFAULT_LIMIT} rows.`,
  live: 'This query checks the run’s publication token and reads the current table, not a historical snapshot.',
  queriedAt: 'Queried at',
  caption: 'Loaded publication rows',
  empty: 'No rows were returned by this query.',
  truncated: 'More rows exist; only the first page is shown.',
  unavailable:
    'Rows cannot be queried without completed publication evidence matching the current workspace.',
  nullValue: 'NULL',
  failures: {
    publication_changed:
      'The table no longer matches this run’s publication. Its rows are not shown; the evidence is preserved. Check the target or inspect a more recent run.',
    connection_not_found:
      'The publication connection is unavailable in this workspace. Check the connection before retrying.',
    source_object_not_found:
      'The published table is no longer available. Check the publication target before retrying.',
    'auth-required': 'Sign in to read published rows. The run evidence remains available.',
    'access-denied':
      'You do not have permission to read this publication. Request access to its connection.',
    unavailable:
      'Published rows could not be loaded. Retry when the connection is available; the run evidence is unchanged.',
  } satisfies Record<RunPublicationSampleFailure, string>,
};

export type RunPublicationSampleCopy = typeof en;
export const runPublicationSampleCopy: Record<'en' | 'es', RunPublicationSampleCopy> = {
  en,
  es: {
    title: 'Filas publicadas',
    load: 'Cargar filas',
    refresh: 'Actualizar filas',
    loading: 'Cargando filas…',
    bounded: `Primera página acotada: hasta ${SOURCE_DATA_SAMPLE_DEFAULT_LIMIT} filas.`,
    live: 'Esta consulta comprueba el token de publicación del run y lee la tabla actual, no una instantánea histórica.',
    queriedAt: 'Consulta realizada el',
    caption: 'Filas cargadas de la publicación',
    empty: 'Esta consulta no ha devuelto filas.',
    truncated: 'Hay más filas; sólo se muestra la primera página.',
    unavailable:
      'No se pueden consultar filas sin evidencia de una publicación completada que coincida con el espacio de trabajo actual.',
    nullValue: 'NULL',
    failures: {
      publication_changed:
        'La tabla ya no coincide con la publicación de esta ejecución. No se muestran sus filas; la evidencia se conserva. Revisa el destino o consulta una ejecución más reciente.',
      connection_not_found:
        'La conexión de la publicación no está disponible en este espacio de trabajo. Comprueba la conexión antes de reintentar.',
      source_object_not_found:
        'La tabla publicada ya no está disponible. Comprueba el destino de la publicación antes de reintentar.',
      'auth-required':
        'Inicia sesión para leer las filas publicadas. La evidencia del run sigue disponible.',
      'access-denied':
        'No tienes permiso para leer esta publicación. Solicita acceso a su conexión.',
      unavailable:
        'No se han podido cargar las filas publicadas. Reintenta cuando la conexión esté disponible; la evidencia del run no cambia.',
    },
  },
};

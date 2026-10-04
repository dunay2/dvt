// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  DVT_OPERATIONAL_REJECTION_DIAGNOSTICS,
  createDvtOperationalRejection,
  type DvtOperationalRejectionCause,
} from '@dvt/contracts';
import {
  getApplicationLanguage,
  useApplicationLanguageStore,
} from '../../stores/applicationLanguageStore';

import { ApiError } from './createApiClient';
import { normalizeProtectedRuntimeRejection } from './protectedRuntimeRejection';

function protectedRuntimeError(cause: string): ApiError {
  return new ApiError({
    message: 'Request failed',
    endpoint: '/plans/preview',
    statusCode: 409,
    category: 'client',
    responseBody: {
      error: {
        type: 'protected_runtime_rejection',
        reason: 'plan_rejected',
        details: { cause },
      },
    },
  });
}

describe('normalizeProtectedRuntimeRejection', () => {
  it.each(Object.keys(DVT_OPERATIONAL_REJECTION_DIAGNOSTICS) as DvtOperationalRejectionCause[])(
    'has distinct EN/ES presentation for %s, independent of diagnostics',
    (cause) => {
      const error = protectedRuntimeError(cause);
      const en = normalizeProtectedRuntimeRejection(error, 'en')?.message;
      const es = normalizeProtectedRuntimeRejection(error, 'es')?.message;
      expect(en).toBeTruthy();
      expect(es).toBeTruthy();
      expect(es).not.toBe(en);
      expect(en).not.toContain(cause);
      expect(es).not.toContain(cause);
      expect(createDvtOperationalRejection(cause)).toMatchObject({ code: 'REJECTED', cause });
    }
  );

  it('uses the current application language when the service normalizes a rejection', () => {
    const previous = getApplicationLanguage();
    try {
      useApplicationLanguageStore.getState().configureApplicationLanguage('es');
      expect(
        normalizeProtectedRuntimeRejection(protectedRuntimeError('dvt_run_intent_required'))
          ?.message
      ).toContain('Este plan no está configurado');
    } finally {
      useApplicationLanguageStore.getState().configureApplicationLanguage(previous);
    }
  });

  it.each([
    ['en', 'This plan is not configured for Run. Configure an output and preview again.'],
    [
      'es',
      'Este plan no está configurado para ejecutar. Configura una salida y repite la vista previa.',
    ],
  ] as const)(
    'localizes DVT admission in %s without displaying server diagnostics',
    (language, expected) => {
      const error = protectedRuntimeError('dvt_run_intent_required');
      const envelope = error.responseBody as { error: { details: Record<string, unknown> } };
      envelope.error.details.message = 'Private provider diagnostics must not become UI copy';

      expect(normalizeProtectedRuntimeRejection(error, language)?.message).toBe(expected);
    }
  );

  it('uses a safe localized fallback for an unknown DVT rejection', () => {
    const error = protectedRuntimeError('dvt_future_rejection');
    const envelope = error.responseBody as { error: { details: Record<string, unknown> } };
    envelope.error.details.message = 'provider://private-host:credentials';
    expect(normalizeProtectedRuntimeRejection(error, 'es')?.message).toBe(
      'No se puede ejecutar este modelo. Revisa su configuración y repite la vista previa.'
    );
  });

  it.each([
    ['dependency_gap', 'Adjust the selection and preview execution plan again.'],
    ['selected_node_missing', 'Refresh the canvas and preview execution plan again.'],
    ['cycle_detected', 'Remove the cycle and preview execution plan again.'],
    ['graph_source_selection_mismatch', 'Preview execution plan again.'],
  ])('uses Execution Preview copy for %s', (cause, expectedMessagePart) => {
    const normalized = normalizeProtectedRuntimeRejection(protectedRuntimeError(cause));

    expect(normalized?.message).toContain(expectedMessagePart);
    expect(normalized?.message).not.toMatch(/\bre-run Plan\b/i);
  });

  it('keeps an unavailable execution-capacity signal distinct from generic HTTP failure', () => {
    const normalized = normalizeProtectedRuntimeRejection(
      new ApiError({
        message: 'Request to /runs/start failed (503)',
        endpoint: '/runs/start',
        statusCode: 503,
        category: 'server',
        responseBody: {
          error: {
            type: 'service_unavailable',
            reason: 'capacity_signal_unavailable',
          },
        },
      })
    );

    expect(normalized?.message).toBe(
      'Execution runtime readiness is unavailable. Canvas authoring remains available; try again later.'
    );
  });
});

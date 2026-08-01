// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PlanExecutionDecisionViewModel } from '../types/plans';
import {
  PlanExecutionDecisionView,
  type PlanExecutionDecisionViewMessages,
} from './PlanExecutionDecisionView';

const MESSAGES: PlanExecutionDecisionViewMessages = {
  title: 'Decisiones de ejecución',
  caption: 'Decisiones persistidas por el planner.',
  subjectLabel: 'Sujeto',
  statusLabel: 'Estado',
  reasonLabel: 'Motivo',
  includedLabel: 'Incluidos',
  excludedLabel: 'Excluidos',
  statusRun: 'Ejecutar',
  statusSkip: 'Omitir',
  statusPartial: 'Parcial',
  reasonSelectedRoot: 'Raíz seleccionada',
  reasonSelectedClosure: 'Dependencia incluida',
  reasonOutsideSelectedClosure: 'Fuera del alcance',
  reasonBoundedSelection: 'Selección acotada',
};

const DECISIONS: readonly PlanExecutionDecisionViewModel[] = [
  {
    subjectId: 'selection',
    subjectKind: 'selection',
    status: 'PARTIAL',
    reasonCode: 'BOUNDED_SELECTION',
    includedNodeIds: ['model.analytics.orders', 'source.analytics.orders'],
    excludedNodeIds: ['model.analytics.customers'],
  },
  {
    subjectId: 'model.analytics.orders',
    subjectKind: 'node',
    status: 'RUN',
    reasonCode: 'SELECTED_ROOT',
  },
  {
    subjectId: 'source.analytics.orders',
    subjectKind: 'node',
    status: 'RUN',
    reasonCode: 'SELECTED_CLOSURE',
  },
  {
    subjectId: 'model.analytics.customers',
    subjectKind: 'node',
    status: 'SKIP',
    reasonCode: 'OUTSIDE_SELECTED_CLOSURE',
  },
];

describe('PlanExecutionDecisionView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders planner-owned decisions in persisted order without deriving their meaning', async () => {
    await act(async () => {
      root.render(<PlanExecutionDecisionView decisions={DECISIONS} messages={MESSAGES} />);
    });

    expect(container.textContent).toContain('Decisiones de ejecución');
    expect(container.textContent).toContain('Parcial');
    expect(container.textContent).toContain('Ejecutar');
    expect(container.textContent).toContain('Omitir');
    expect(container.textContent).toContain('Raíz seleccionada');
    expect(container.textContent).toContain('Dependencia incluida');
    expect(container.textContent).toContain('Fuera del alcance');
    expect(container.textContent).toContain('Incluidos');
    expect(container.textContent).toContain('model.analytics.orders, source.analytics.orders');
    expect(container.textContent).toContain('Excluidos');
    expect(container.textContent).toContain('model.analytics.customers');

    expect(
      Array.from(container.querySelectorAll('[data-decision-subject]')).map((element) =>
        element.getAttribute('data-decision-subject')
      )
    ).toEqual([
      'selection',
      'model.analytics.orders',
      'source.analytics.orders',
      'model.analytics.customers',
    ]);
  });
});

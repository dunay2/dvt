// @vitest-environment jsdom
/** Prove explicit SQL actions, late-response fencing and existing Model command handoff. */
import React, { act } from 'react';
import { getByRole, queryByRole, waitFor } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { MODEL_SQL_MAX_LENGTH } from '@dvt/contracts';
import { container, dataHost, mount } from './CanvasModelSqlPanel.test-support';
import { proposal } from './modelSqlProtocol.test-fixtures';

vi.mock('../../../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: ({
    value,
    onChange,
    ariaLabel,
    readOnly,
  }: {
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
    readOnly: boolean;
  }) => (
    <textarea
      aria-label={ariaLabel}
      value={value}
      readOnly={readOnly}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  ),
}));

describe('Model SQL panel', () => {
  it('explains the shared source bound without truncating SQL or sending an oversized request', async () => {
    const h = await mount();
    const sql = 'x'.repeat(MODEL_SQL_MAX_LENGTH + 1);
    await h.type(sql);
    expect(getByRole(container, 'alert').textContent).toContain('supported source length');
    expect(getByRole(container, 'textbox')).toHaveProperty('value', sql);
    expect(getByRole(container, 'button', { name: 'Validate' })).toHaveProperty('disabled', true);
    expect(h.query.compile).not.toHaveBeenCalled();
    expect(h.query.preview).not.toHaveBeenCalled();
  });
  it('does not compile or execute while typing, then explicitly validates and queries', async () => {
    const h = await mount();
    await h.type('SELECT orders_id FROM orders');
    expect(h.query.compile).not.toHaveBeenCalled();
    expect(h.query.preview).not.toHaveBeenCalled();
    await h.click('Validate');
    expect(h.query.compile).toHaveBeenCalledTimes(1);
    expect(h.onApplyNodeDraft).not.toHaveBeenCalled();
    await h.click('Execute');
    expect(h.query.preview).toHaveBeenCalledTimes(1);
    expect(h.onOpenData).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(dataHost.textContent).toContain('SQL_ROW_3944'));
    expect(queryByRole(container, 'alert')).toBeNull();
    expect(dataHost.querySelector('header')).toBeNull();
    const toolbar = dataHost.querySelector('[data-slot="data-grid-toolbar"]')!;
    const refresh = getByRole(dataHost, 'button', { name: 'Refresh preview' });
    expect(getByRole(dataHost, 'searchbox').closest('[data-slot="data-grid-toolbar"]')).toBe(
      toolbar
    );
    expect(refresh.closest('[data-slot="data-grid-toolbar"]')).toBe(toolbar);
    const footer = dataHost.querySelector('footer')!;
    expect(footer.textContent).toContain('1 rows');
    expect(footer.textContent).toContain('1 columns');
    expect(footer.textContent).toContain('SQL results');
    expect(footer.textContent).toContain('LIVE');
    const details = Array.from(footer.querySelectorAll('details')).find((item) =>
      item.textContent?.includes('Revision: r1')
    );
    expect(details).toBeTruthy();
    expect(details?.open).toBe(false);
    expect(details?.textContent).toContain('the semantic Model has not been changed');
    await act(async () => refresh.click());
    expect(h.query.preview).toHaveBeenCalledTimes(2);
    expect(h.onApplyNodeDraft).not.toHaveBeenCalled();
  });
  it('generates only through the existing draft command and retains rejected SQL', async () => {
    const h = await mount();
    await h.type('SELECT orders_id FROM orders');
    h.onApplyNodeDraft.mockReturnValueOnce({ outcome: 'rejected', reason: 'invalid_draft' });
    await h.click('Generate Model');
    expect(h.onApplyNodeDraft).toHaveBeenCalledWith(
      'transform',
      expect.objectContaining({ relationalAuthoringDraft: null }),
      expect.objectContaining({ inputAdditions: [{ nodeId: 'orders', columnId: 'orders_id' }] })
    );
    expect(h.ref.current?.hasUnappliedChanges).toBe(true);
    expect(getByRole(container, 'textbox')).toHaveProperty('value', 'SELECT orders_id FROM orders');
    expect(getByRole(container, 'alert').textContent).toContain('rejected');
  });
  it('discards a late validation response after text changes', async () => {
    const h = await mount();
    await h.type('SELECT orders_id FROM orders');
    let resolve!: (result: ReturnType<typeof proposal>) => void;
    h.query.compile.mockImplementationOnce(
      () =>
        new Promise((accept) => {
          resolve = accept;
        })
    );
    await h.click('Validate');
    const input = h.query.compile.mock.calls[0]![0];
    await h.type('SELECT * FROM orders');
    await act(async () => resolve(proposal(input)));
    expect(queryByRole(container, 'status')?.textContent).not.toBe('Valid');
    expect(h.onApplyNodeDraft).not.toHaveBeenCalled();
  });
  it('blocks SQL generation while the visual editor has unapplied edits', async () => {
    const h = await mount();
    await h.type('SELECT orders_id FROM orders');
    Object.defineProperty(h.visual, 'current', {
      value: { hasUnappliedChanges: true },
      writable: true,
    });
    await h.click('Generate Model');
    expect(h.query.compile).not.toHaveBeenCalled();
    expect(getByRole(container, 'alert').textContent).toContain('semantic edits');
  });
  it('locks the admitted buffer during Apply and retains the command acknowledgement across its own revision', async () => {
    const h = await mount();
    const sql = 'SELECT orders_id FROM orders';
    await h.type(sql);
    let resolve!: (result: { outcome: 'no_changes' }) => void;
    h.onApplyNodeDraft.mockImplementationOnce(
      () =>
        new Promise((accept) => {
          resolve = accept;
        })
    );
    await h.click('Generate Model');
    expect(getByRole(container, 'textbox')).toHaveProperty('readOnly', true);
    await h.type('SELECT * FROM orders');
    expect(getByRole(container, 'textbox')).toHaveProperty('value', sql);
    await act(async () => h.render('r2'));
    await act(async () => resolve({ outcome: 'no_changes' }));
    expect(h.ref.current?.hasUnappliedChanges).toBe(false);
    expect(getByRole(container, 'textbox')).toHaveProperty('readOnly', false);
  });
});

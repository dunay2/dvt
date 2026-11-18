// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasNodeShell } from './CanvasNodeShell';
import {
  CONTEXT_MENU_MODEL,
  setupCanvasNodeShellTestSurface,
} from './CanvasNodeShell.test-support';
const surface = setupCanvasNodeShellTestSurface();
import { ReactFlowProvider } from '@xyflow/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const canvasNodeShellCssPath = resolve(import.meta.dirname, 'CanvasNodeShell.module.css');
const themeCssPath = resolve(import.meta.dirname, '../../../styles/theme.css');
/** Prove semantic port identity, compatibility and global presentation tokens. */
describe('Canvas node port presentation', () => {
  it('renders graph ports through component-owned presentation slots', () => {
    act(() => {
      surface.root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(
      surface.container.querySelectorAll('[data-slot="canvas-node-port-handle"]')
    );

    expect(ports.map((port) => port.getAttribute('data-port'))).toEqual(['target', 'source']);
  });

  it('renders graph ports with caller-owned semantic tones', () => {
    act(() => {
      surface.root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            sourceHandleTone="source"
            targetHandleTone="model"
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(
      surface.container.querySelectorAll('[data-slot="canvas-node-port-handle"]')
    );

    expect(ports.map((port) => port.getAttribute('data-tone'))).toEqual(['model', 'source']);
  });

  it('renders graph ports with caller-owned accessible labels', () => {
    act(() => {
      surface.root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            sourcePortLabel="Localized outgoing port"
            targetPortLabel="Localized incoming port"
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(
      surface.container.querySelectorAll('[data-slot="canvas-node-port-handle"]')
    );

    expect(ports.map((port) => port.getAttribute('aria-label'))).toEqual([
      'Localized incoming port',
      'Localized outgoing port',
    ]);
  });

  it('renders graph ports with caller-owned compatibility state and descriptions', () => {
    act(() => {
      surface.root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            sourcePortLabel="Outgoing port"
            targetPortLabel="Incoming port"
            sourcePortCompatibility={{
              state: 'available',
              compatibleNodeNames: ['Orders model'],
              description: 'Compatible with Orders model',
            }}
            targetPortCompatibility={{
              state: 'blocked',
              compatibleNodeNames: [],
              description: 'No compatible upstream nodes',
            }}
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(
      surface.container.querySelectorAll('[data-slot="canvas-node-port-handle"]')
    );

    expect(ports.map((port) => port.getAttribute('data-port-compatibility'))).toEqual([
      'blocked',
      'available',
    ]);
    expect(ports.map((port) => port.getAttribute('title'))).toEqual([
      'No compatible upstream nodes',
      'Compatible with Orders model',
    ]);
  });

  it('renders graph ports with stable React Flow handle ids', () => {
    act(() => {
      surface.root.render(
        <ReactFlowProvider>
          <CanvasNodeShell
            contextMenuModel={CONTEXT_MENU_MODEL}
            shouldShowSourceHandle
            shouldShowTargetHandle
            onContextMenuAction={vi.fn()}
          >
            <div>Orders model</div>
          </CanvasNodeShell>
        </ReactFlowProvider>
      );
    });

    const ports = Array.from(
      surface.container.querySelectorAll('[data-slot="canvas-node-port-handle"]')
    );

    expect(ports.map((port) => port.getAttribute('data-handleid'))).toEqual(['target', 'source']);
  });

  it('keeps graph port tone colors in global design tokens instead of component-local hex values', () => {
    const componentCss = readFileSync(canvasNodeShellCssPath, 'utf8');
    const themeCss = readFileSync(themeCssPath, 'utf8');

    expect(componentCss).not.toMatch(/#[0-9a-fA-F]{3,8}/u);
    expect(componentCss).toContain(".portHandle[data-tone='control']");
    expect(themeCss).toContain('--canvas-node-port-source-ring');
    expect(themeCss).toContain('--canvas-node-port-model-ring');
    expect(themeCss).toContain('--canvas-node-port-test-ring');
    expect(themeCss).toContain('--canvas-node-port-output-ring');
    expect(themeCss).toContain('--canvas-node-port-control-ring');
  });
});

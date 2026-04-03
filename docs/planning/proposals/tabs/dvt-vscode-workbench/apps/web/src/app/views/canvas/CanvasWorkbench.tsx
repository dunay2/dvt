import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../components/ui/resizable';
import InspectorPanel from '../../components/InspectorPanel';
import type { CanonicalNode } from '../../types/canonical';
import CanvasToolbar from './CanvasToolbar';
import CanvasViewport from './CanvasViewport';
import CommandPalette from './CommandPalette';
import MonacoEditorSurface from './MonacoEditorSurface';
import WorkbenchSidebar from './WorkbenchSidebar';
import WorkbenchStatusBar from './WorkbenchStatusBar';
import WorkbenchTabs from './WorkbenchTabs';
import {
  buildCatalogArtifact,
  buildManifestArtifact,
  buildNodeDiffTab,
  buildNodeEditorTab,
  buildPlanArtifact,
  buildRunLog,
  buildRunResultsArtifact,
} from './workbenchArtifacts';
import {
  DEFAULT_GRAPH_TAB,
  useCanvasWorkbenchStore,
} from './workbenchStore';
import type { EditorTab, PaletteItem } from './workbenchTypes';
import type { useCanvasController } from './useCanvasController';
import { useEffect, useMemo } from 'react';

interface CanvasWorkbenchProps {
  controller: ReturnType<typeof useCanvasController>;
}

function breadcrumbParts(activeTab: EditorTab | null): string[] {
  if (!activeTab) {
    return [];
  }

  return activeTab.path.split('/').filter(Boolean);
}

function tabFromArtifact(artifactId: 'manifest' | 'catalog' | 'plan' | 'run_results' | 'run_log', controller: ReturnType<typeof useCanvasController>): EditorTab {
  switch (artifactId) {
    case 'manifest': {
      const artifact = buildManifestArtifact(controller.explorerNodes, controller.edges.map((edge) => ({
        id: edge.id,
        sourceId: edge.source,
        targetId: edge.target,
        relation: 'lineage',
      })));
      return {
        id: 'artifact:manifest',
        title: artifact.title,
        kind: artifact.kind,
        path: artifact.path,
        language: artifact.language,
        value: artifact.value,
        description: artifact.description,
        readOnly: true,
        closable: true,
        badge: artifact.badge,
      };
    }
    case 'catalog': {
      const artifact = buildCatalogArtifact(controller.explorerNodes);
      return {
        id: 'artifact:catalog',
        title: artifact.title,
        kind: artifact.kind,
        path: artifact.path,
        language: artifact.language,
        value: artifact.value,
        description: artifact.description,
        readOnly: true,
        closable: true,
        badge: artifact.badge,
      };
    }
    case 'plan': {
      const artifact = buildPlanArtifact(controller.currentPlan);
      return {
        id: 'artifact:plan',
        title: artifact.title,
        kind: artifact.kind,
        path: artifact.path,
        language: artifact.language,
        value: artifact.value,
        description: artifact.description,
        readOnly: true,
        closable: true,
        badge: artifact.badge,
      };
    }
    case 'run_results': {
      const artifact = buildRunResultsArtifact(controller.explorerNodes, controller.activeRunId);
      return {
        id: 'artifact:run_results',
        title: artifact.title,
        kind: artifact.kind,
        path: artifact.path,
        language: artifact.language,
        value: artifact.value,
        description: artifact.description,
        readOnly: true,
        closable: true,
        badge: artifact.badge,
      };
    }
    case 'run_log':
    default: {
      const artifact = buildRunLog(controller.activeRunId, controller.explorerNodes);
      return {
        id: 'artifact:run_log',
        title: artifact.title,
        kind: artifact.kind,
        path: artifact.path,
        language: artifact.language,
        value: artifact.value,
        description: artifact.description,
        readOnly: true,
        closable: true,
        badge: artifact.badge,
      };
    }
  }
}

export default function CanvasWorkbench({ controller }: CanvasWorkbenchProps) {
  const {
    sidebarSection,
    openTabs,
    activeTabId,
    palette,
    setSidebarSection,
    openOrActivateTab,
    activateTab,
    closeTab,
    openPalette,
    closePalette,
    setPaletteQuery,
  } = useCanvasWorkbenchStore();

  useEffect(() => {
    openOrActivateTab(DEFAULT_GRAPH_TAB);
  }, [openOrActivateTab]);

  const activeTab = openTabs.find((tab) => tab.id === activeTabId) ?? DEFAULT_GRAPH_TAB;
  const activeBreadcrumb = breadcrumbParts(activeTab);

  const openNodeEditor = (node: CanonicalNode) => {
    openOrActivateTab(buildNodeEditorTab(node));
  };

  const openNodeDiff = (node: CanonicalNode) => {
    openOrActivateTab(buildNodeDiffTab(node));
  };

  const openArtifact = (artifactId: Parameters<typeof tabFromArtifact>[0]) => {
    openOrActivateTab(tabFromArtifact(artifactId, controller));
  };

  const outlineActions = useMemo(
    () => [
      {
        id: 'outline:open',
        label: 'Open code tab',
        description: 'Open the selected node in Monaco.',
        run: (node: CanonicalNode) => {
          openNodeEditor(node);
        },
      },
      {
        id: 'outline:diff',
        label: 'Open SQL diff',
        description: 'Compare the current compiled SQL to a generated baseline.',
        run: (node: CanonicalNode) => {
          openNodeDiff(node);
        },
      },
      {
        id: 'outline:plan',
        label: 'Open plan.json',
        description: 'Inspect the current immutable execution plan in JSON.',
        run: () => {
          openArtifact('plan');
        },
      },
    ],
    [controller.currentPlan]
  );

  const artifactButtons = useMemo(
    () => [
      {
        id: 'manifest',
        label: 'manifest.json',
        hint: 'Workspace graph snapshot rendered as an artifact tab',
        onOpen: () => {
          openArtifact('manifest');
        },
      },
      {
        id: 'catalog',
        label: 'catalog.json',
        hint: 'Columns, stats and node metadata summary',
        onOpen: () => {
          openArtifact('catalog');
        },
      },
      {
        id: 'plan',
        label: 'plan.json',
        hint: 'Current execution plan from planner state',
        onOpen: () => {
          openArtifact('plan');
        },
      },
      {
        id: 'run_results',
        label: 'run_results.json',
        hint: 'Generated result snapshot for the current graph state',
        onOpen: () => {
          openArtifact('run_results');
        },
      },
      {
        id: 'run_log',
        label: 'Run Log',
        hint: 'Text log preview for quick inspection in Monaco',
        onOpen: () => {
          openArtifact('run_log');
        },
      },
    ],
    [controller.activeRunId, controller.currentPlan, controller.explorerNodes]
  );

  const paletteItems = useMemo<PaletteItem[]>(() => {
    const fileItems: PaletteItem[] = [
      {
        id: 'file:graph',
        label: 'workspace/canvas',
        description: 'Focus the graph tab',
        category: 'File',
        perform: () => {
          openOrActivateTab(DEFAULT_GRAPH_TAB);
        },
      },
      ...artifactButtons.map((artifact) => ({
        id: `file:${artifact.id}`,
        label: artifact.label,
        description: artifact.hint,
        category: 'File' as const,
        perform: artifact.onOpen,
      })),
      ...controller.explorerNodes.map((node) => ({
        id: `file:node:${node.id}`,
        label: node.path ?? node.name,
        description: `${node.name} • ${node.kind}`,
        category: 'File' as const,
        perform: () => {
          openNodeEditor(node);
        },
      })),
    ];

    const commandItems: PaletteItem[] = [
      {
        id: 'command:graph',
        label: 'Open Graph Canvas',
        description: 'Focus the React Flow graph workspace',
        category: 'Command',
        perform: () => {
          openOrActivateTab(DEFAULT_GRAPH_TAB);
        },
      },
      {
        id: 'command:toggle-explorer',
        label: controller.explorerPanelVisible ? 'Hide Explorer Panel' : 'Show Explorer Panel',
        description: 'Uses the same app store toggle as the current shell',
        category: 'Command',
        perform: () => {
          if (controller.explorerPanelVisible) {
            controller.hideExplorerPanel();
            return;
          }
          controller.showExplorerPanel();
        },
      },
      {
        id: 'command:toggle-inspector',
        label: controller.inspectorPanelVisible ? 'Hide Inspector Panel' : 'Show Inspector Panel',
        description: 'Uses the current canvas shell inspector toggle',
        category: 'Command',
        perform: () => {
          if (controller.inspectorPanelVisible) {
            controller.hideInspectorPanel();
            return;
          }
          controller.showInspectorPanel();
        },
      },
      {
        id: 'command:plan',
        label: 'Generate Plan',
        description: 'Open the current plan modal / planner flow',
        category: 'Command',
        perform: () => {
          void controller.handlePlan();
        },
      },
      {
        id: 'command:run',
        label: 'Start Run',
        description: 'Start a run from the current plan if permissions allow',
        category: 'Command',
        perform: () => {
          void controller.handleStartRun();
        },
      },
      {
        id: 'command:manifest',
        label: 'Open manifest.json',
        description: 'Open the generated manifest artifact in Monaco',
        category: 'Command',
        perform: () => {
          openArtifact('manifest');
        },
      },
      {
        id: 'command:catalog',
        label: 'Open catalog.json',
        description: 'Open the generated catalog artifact in Monaco',
        category: 'Command',
        perform: () => {
          openArtifact('catalog');
        },
      },
    ];

    const source = palette.mode === 'files' ? fileItems : commandItems;
    const normalizedQuery = palette.query.trim().toLowerCase();

    if (normalizedQuery.length === 0) {
      return source;
    }

    return source.filter((item) =>
      `${item.label} ${item.description ?? ''}`.toLowerCase().includes(normalizedQuery)
    );
  }, [
    artifactButtons,
    controller.explorerNodes,
    controller.explorerPanelVisible,
    controller.inspectorPanelVisible,
    palette.mode,
    palette.query,
  ]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const primaryModifier = navigator.platform.toLowerCase().includes('mac') ? event.metaKey : event.ctrlKey;
      if (!primaryModifier) {
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        openPalette('commands');
        return;
      }

      if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        openPalette('files');
        return;
      }

      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        if (controller.explorerPanelVisible) {
          controller.hideExplorerPanel();
          return;
        }
        controller.showExplorerPanel();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    controller.explorerPanelVisible,
    controller.hideExplorerPanel,
    controller.showExplorerPanel,
    openPalette,
  ]);

  const graphView = (
    <div className="flex h-full min-h-0 flex-col bg-[#1e1e1e]">
      <div className="border-b border-[#2a2d2e]">
        <CanvasToolbar
          onOpenDataRegistry={() => {
            setSidebarSection('artifacts');
            if (!controller.explorerPanelVisible) {
              controller.showExplorerPanel();
            }
          }}
          onAutoLayout={controller.handleAutoLayout}
          onToggleCostOverlay={controller.handleToggleCostOverlay}
          onToggleImpact={controller.toggleImpactOverlay}
          onToggleColumns={controller.toggleColumnLevelLineage}
          onPlan={() => {
            void controller.handlePlan();
          }}
          onRun={() => {
            void controller.handleStartRun();
          }}
          exclusiveOverlayMode={controller.exclusiveOverlayMode}
          canUseCostOverlay={controller.canUseCostOverlay}
          impactOverlayEnabled={controller.impactOverlayEnabled}
          columnLevelLineageEnabled={controller.columnLevelLineageEnabled}
          nodeCount={controller.nodesWithImpact.length}
          edgeCount={controller.edges.length}
        />
      </div>

      <div className="min-h-0 flex-1">
        <CanvasViewport
          focusMode={controller.focusMode}
          explorerPanelVisible={controller.explorerPanelVisible}
          inspectorPanelVisible={controller.inspectorPanelVisible}
          nodesWithImpact={controller.nodesWithImpact}
          edges={controller.edges}
          nodeTypes={controller.nodeTypes}
          gridSize={controller.gridSize}
          viewport={controller.viewport}
          onNodesChange={controller.onNodesChange}
          onEdgesChange={controller.onEdgesChange}
          onConnect={controller.onConnect}
          onNodeClick={controller.handleNodeClick}
          onSelectionChange={controller.onSelectionChange}
          onViewportChange={controller.handleViewportChange}
          onNodeDragStop={controller.handleNodeDragStop}
          onDrop={controller.handleDrop}
          onDragOver={controller.handleDragOver}
          onShowExplorer={controller.showExplorerPanel}
          onShowInspector={controller.showInspectorPanel}
        />
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#1e1e1e] text-[#cccccc]">
      <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
        {!controller.focusMode && controller.explorerPanelVisible ? (
          <>
            <ResizablePanel defaultSize={24} minSize={18} maxSize={34}>
              <WorkbenchSidebar
                nodes={controller.explorerNodes}
                selectedNode={controller.inspectorNode}
                activeSection={sidebarSection}
                searchText={palette.mode === 'files' ? palette.query : ''}
                outlineActions={outlineActions}
                onSectionChange={setSidebarSection}
                onSearchTextChange={(value) => {
                  setPaletteQuery(value);
                }}
                onOpenNode={openNodeEditor}
                onOpenNodeDiff={openNodeDiff}
                artifactButtons={artifactButtons}
              />
            </ResizablePanel>

            <ResizableHandle />
          </>
        ) : null}

        <ResizablePanel defaultSize={controller.inspectorPanelVisible ? 58 : 76} minSize={38}>
          <div className="flex h-full min-h-0 flex-col">
            <WorkbenchTabs
              tabs={openTabs}
              activeTabId={activeTab.id}
              onActivate={activateTab}
              onClose={closeTab}
            />

            <div className="flex h-7 items-center gap-2 overflow-x-auto border-b border-[#2a2d2e] bg-[#1f1f1f] px-3 text-[11px] text-[#8b949e]">
              {activeBreadcrumb.length > 0 ? (
                activeBreadcrumb.map((part, index) => (
                  <span key={`${part}-${index}`} className="shrink-0">
                    {index > 0 ? ' / ' : null}
                    {part}
                  </span>
                ))
              ) : (
                <span>workspace</span>
              )}

              {activeTab.description ? (
                <span className="ml-auto truncate text-[#6b7280]">{activeTab.description}</span>
              ) : null}
            </div>

            <div className="min-h-0 flex-1">
              {activeTab.kind === 'graph' ? graphView : <MonacoEditorSurface tab={activeTab} />}
            </div>

            <WorkbenchStatusBar
              activeTab={activeTab}
              selectedNode={controller.inspectorNode}
              activeRunId={controller.activeRunId}
            />
          </div>
        </ResizablePanel>

        {!controller.focusMode && controller.inspectorPanelVisible ? (
          <>
            <ResizableHandle />

            <ResizablePanel defaultSize={18} minSize={16} maxSize={28}>
              <InspectorPanel
                node={controller.inspectorNode}
                activeRunId={controller.activeRunId}
                registeredPlugins={controller.registeredPlugins}
                onHide={controller.hideInspectorPanel}
              />
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>

      <CommandPalette
        open={palette.open}
        mode={palette.mode}
        query={palette.query}
        items={paletteItems}
        onClose={closePalette}
        onQueryChange={setPaletteQuery}
      />
    </div>
  );
}

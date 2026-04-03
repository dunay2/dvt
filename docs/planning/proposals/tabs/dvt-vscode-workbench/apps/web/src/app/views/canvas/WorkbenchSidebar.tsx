import {
  FileJson2,
  FileSearch2,
  FolderTree,
  GitCompareArrows,
  ListTree,
  Search,
} from 'lucide-react';
import { useMemo } from 'react';

import type { CanonicalNode } from '../../types/canonical';
import type { OutlineAction, SidebarSection } from './workbenchTypes';

interface ArtifactButton {
  id: string;
  label: string;
  hint: string;
  onOpen: () => void;
}

interface WorkbenchSidebarProps {
  nodes: CanonicalNode[];
  selectedNode: CanonicalNode | null;
  activeSection: SidebarSection;
  searchText: string;
  outlineActions: OutlineAction[];
  onSectionChange: (section: SidebarSection) => void;
  onSearchTextChange: (value: string) => void;
  onOpenNode: (node: CanonicalNode) => void;
  onOpenNodeDiff: (node: CanonicalNode) => void;
  artifactButtons: ArtifactButton[];
}

const SECTION_BUTTONS: Array<{ id: SidebarSection; label: string; icon: typeof FolderTree }> = [
  { id: 'explorer', label: 'Explorer', icon: FolderTree },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'artifacts', label: 'Artifacts', icon: FileJson2 },
  { id: 'outline', label: 'Outline', icon: ListTree },
];

function groupLabel(kind: string): string {
  return kind.split(':').at(-1)?.replace(/_/g, ' ')?.replace(/\b\w/g, (value) => value.toUpperCase()) ?? kind;
}

function statusDot(status: CanonicalNode['status']): string {
  switch (status) {
    case 'running':
      return 'bg-blue-500';
    case 'success':
      return 'bg-emerald-500';
    case 'failed':
      return 'bg-rose-500';
    case 'warn':
      return 'bg-amber-500';
    case 'skipped':
      return 'bg-yellow-400';
    case 'idle':
    default:
      return 'bg-slate-500';
  }
}

export default function WorkbenchSidebar({
  nodes,
  selectedNode,
  activeSection,
  searchText,
  outlineActions,
  onSectionChange,
  onSearchTextChange,
  onOpenNode,
  onOpenNodeDiff,
  artifactButtons,
}: WorkbenchSidebarProps) {
  const groupedNodes = useMemo(() => {
    const filtered = activeSection === 'search'
      ? nodes.filter((node) => {
          const haystack = `${node.name} ${node.path ?? ''} ${node.tags.join(' ')}`.toLowerCase();
          return haystack.includes(searchText.trim().toLowerCase());
        })
      : nodes;

    const groups = new Map<string, CanonicalNode[]>();
    filtered.forEach((node) => {
      const bucket = groups.get(node.kind) ?? [];
      bucket.push(node);
      groups.set(node.kind, bucket);
    });

    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [activeSection, nodes, searchText]);

  return (
    <div className="flex h-full min-h-0 bg-[#252526] text-[#cccccc]">
      <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[#2a2d2e] py-2">
        {SECTION_BUTTONS.map((section) => {
          const Icon = section.icon;
          const isActive = section.id === activeSection;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                onSectionChange(section.id);
              }}
              className={[
                'flex size-9 items-center justify-center rounded-md transition-colors',
                isActive ? 'bg-[#094771] text-white' : 'text-[#b3b3b3] hover:bg-[#2a2d2e] hover:text-white',
              ].join(' ')}
              title={section.label}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-9 items-center justify-between border-b border-[#2a2d2e] px-3">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[#bbbbbb]">{activeSection}</span>
          {activeSection === 'search' ? (
            <span className="text-[11px] text-[#8b949e]">{groupedNodes.reduce((sum, [, bucket]) => sum + bucket.length, 0)} hits</span>
          ) : null}
        </div>

        {activeSection === 'search' ? (
          <div className="border-b border-[#2a2d2e] p-3">
            <label className="flex items-center gap-2 rounded border border-[#3a3d41] bg-[#1f1f1f] px-2 py-1.5 text-sm">
              <Search className="size-4 text-[#8b949e]" />
              <input
                value={searchText}
                onChange={(event) => {
                  onSearchTextChange(event.target.value);
                }}
                placeholder="Search nodes, tags, or paths"
                className="w-full bg-transparent text-sm text-[#cccccc] outline-none placeholder:text-[#6b7280]"
              />
            </label>
          </div>
        ) : null}

        {activeSection === 'artifacts' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto p-3">
            <div className="mb-3 text-xs text-[#8b949e]">
              Open artifact-like tabs with Monaco instead of raw modals.
            </div>

            <div className="space-y-2">
              {artifactButtons.map((artifact) => (
                <button
                  key={artifact.id}
                  type="button"
                  onClick={artifact.onOpen}
                  className="flex w-full items-start gap-2 rounded border border-[#2a2d2e] bg-[#1f1f1f] px-3 py-2 text-left hover:border-[#3a3d41] hover:bg-[#2a2d2e]"
                >
                  <FileJson2 className="mt-0.5 size-4 shrink-0 text-[#9cdcfe]" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-[#d4d4d4]">{artifact.label}</span>
                    <span className="block text-xs text-[#8b949e]">{artifact.hint}</span>
                  </span>
                </button>
              ))}
            </div>

            {selectedNode ? (
              <div className="mt-4 border-t border-[#2a2d2e] pt-4">
                <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[#bbbbbb]">Selected node</div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenNode(selectedNode);
                    }}
                    className="flex w-full items-center gap-2 rounded border border-[#2a2d2e] bg-[#1f1f1f] px-3 py-2 text-left text-sm hover:border-[#3a3d41] hover:bg-[#2a2d2e]"
                  >
                    <FileSearch2 className="size-4 text-[#9cdcfe]" />
                    Open editor
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenNodeDiff(selectedNode);
                    }}
                    className="flex w-full items-center gap-2 rounded border border-[#2a2d2e] bg-[#1f1f1f] px-3 py-2 text-left text-sm hover:border-[#3a3d41] hover:bg-[#2a2d2e]"
                  >
                    <GitCompareArrows className="size-4 text-[#d7ba7d]" />
                    Open SQL diff
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeSection === 'outline' ? (
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-white">{selectedNode.name}</div>
                  <div className="mt-1 text-xs text-[#8b949e]">{selectedNode.path ?? 'No path'}</div>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="text-[#8b949e]">Kind</dt>
                  <dd>{selectedNode.kind}</dd>
                  <dt className="text-[#8b949e]">Plugin</dt>
                  <dd>{selectedNode.pluginId}</dd>
                  <dt className="text-[#8b949e]">Role</dt>
                  <dd>{selectedNode.role}</dd>
                  <dt className="text-[#8b949e]">Status</dt>
                  <dd className="capitalize">{selectedNode.status}</dd>
                </dl>

                <div className="space-y-2">
                  {outlineActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        action.run(selectedNode);
                      }}
                      className="flex w-full items-start rounded border border-[#2a2d2e] bg-[#1f1f1f] px-3 py-2 text-left hover:border-[#3a3d41] hover:bg-[#2a2d2e]"
                    >
                      <span>
                        <span className="block text-sm text-[#d4d4d4]">{action.label}</span>
                        {action.description ? (
                          <span className="block text-xs text-[#8b949e]">{action.description}</span>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded border border-dashed border-[#3a3d41] p-4 text-sm text-[#8b949e]">
                Select a node in the canvas to expose quick actions here.
              </div>
            )}
          </div>
        ) : null}

        {activeSection === 'explorer' || activeSection === 'search' ? (
          <div className="min-h-0 flex-1 overflow-auto">
            {groupedNodes.map(([kind, bucket]) => (
              <section key={kind} className="border-b border-[#2a2d2e] last:border-b-0">
                <div className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[#bbbbbb]">
                  <span>{groupLabel(kind)}</span>
                  <span>{bucket.length}</span>
                </div>

                <div className="pb-2">
                  {bucket.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => {
                        onOpenNode(node);
                      }}
                      className={[
                        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                        selectedNode?.id === node.id ? 'bg-[#094771] text-white' : 'hover:bg-[#2a2d2e]',
                      ].join(' ')}
                      title={node.path ?? node.name}
                    >
                      <span className={`size-2 rounded-full ${statusDot(node.status)}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{node.name}</span>
                        <span className="block truncate text-xs text-[#8b949e]">{node.path ?? kind}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

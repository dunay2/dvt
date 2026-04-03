import { FileCode2, FileDiff, FileJson2, GitGraph, ScrollText, X } from 'lucide-react';

import type { EditorTab } from './workbenchTypes';

interface WorkbenchTabsProps {
  tabs: EditorTab[];
  activeTabId: string;
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
}

function getIcon(tab: EditorTab) {
  switch (tab.kind) {
    case 'graph':
      return GitGraph;
    case 'json':
      return FileJson2;
    case 'diff':
      return FileDiff;
    case 'log':
      return ScrollText;
    case 'yaml':
    case 'sql':
    default:
      return FileCode2;
  }
}

export default function WorkbenchTabs({ tabs, activeTabId, onActivate, onClose }: WorkbenchTabsProps) {
  return (
    <div className="flex h-9 items-end overflow-x-auto border-b border-[#2a2d2e] bg-[#2d2d2d]">
      {tabs.map((tab) => {
        const Icon = getIcon(tab);
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            className={[
              'group flex h-9 shrink-0 items-center gap-2 border-r border-[#252526] px-3 text-xs',
              isActive ? 'bg-[#1e1e1e] text-[#ffffff]' : 'bg-[#2d2d2d] text-[#bbbbbb] hover:bg-[#323233]',
            ].join(' ')}
          >
            <button
              type="button"
              onClick={() => {
                onActivate(tab.id);
              }}
              className="flex items-center gap-2"
              title={tab.path}
            >
              <Icon className="size-3.5" />
              <span className="max-w-[16rem] truncate">{tab.title}</span>
              {tab.badge ? (
                <span className="rounded border border-[#3a3d41] px-1 py-0.5 text-[10px] uppercase text-[#8b949e]">
                  {tab.badge}
                </span>
              ) : null}
            </button>

            {tab.closable === false ? null : (
              <button
                type="button"
                onClick={() => {
                  onClose(tab.id);
                }}
                className="rounded p-0.5 text-[#9da0a6] opacity-0 transition-opacity hover:bg-[#3a3d41] hover:text-white group-hover:opacity-100"
                aria-label={`Close ${tab.title}`}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

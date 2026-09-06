/** Owned concern: own ephemeral Canvas graph search state and keyboard navigation. */
import type { Node } from '@xyflow/react';
import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type KeyboardEventHandler,
} from 'react';

import { CORE_NODE_ROLES, type CoreNodeRole, type PluginNodeKind } from '../../types/canonical';
import {
  createCanvasGraphSearchRequest,
  type CanvasGraphSearchNode,
} from './canvasGraphSearch.contract';
import { searchCanvasGraph } from './canvasGraphSearch';

export type CanvasGraphSearchControlModel = Readonly<{
  open: boolean;
  focusRequestId: number;
  query: string;
  status: 'idle' | 'no-match' | 'matched';
  matchCount: number;
  activeMatchPosition: number | null;
  activeNodeId: string | null;
}>;

export type CanvasGraphSearchController = Readonly<{
  model: CanvasGraphSearchControlModel;
  matchingNodeIds: readonly string[];
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  showPrevious: () => void;
  showNext: () => void;
  onViewportKeyDown: KeyboardEventHandler<HTMLElement>;
  onControlKeyDown: KeyboardEventHandler<HTMLElement>;
  onQueryKeyDown: KeyboardEventHandler<HTMLInputElement>;
}>;

type UseCanvasGraphSearchControllerArgs = Readonly<{
  nodes: readonly Node[];
}>;

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNodeRole(value: unknown): CoreNodeRole {
  return typeof value === 'string' && CORE_NODE_ROLES.includes(value as CoreNodeRole)
    ? (value as CoreNodeRole)
    : 'control';
}

function asPluginNodeKind(value: unknown): PluginNodeKind {
  return typeof value === 'string' && value.includes(':')
    ? (value as PluginNodeKind)
    : 'dvt:unknown';
}

function asTags(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : [];
}

function toSearchNode(node: Node): CanvasGraphSearchNode {
  const data = node.data as Record<string, unknown>;
  return {
    id: node.id,
    name: asOptionalString(data.name) ?? node.id,
    description: asOptionalString(data.description),
    path: asOptionalString(data.path),
    kind: asPluginNodeKind(data.pluginKind),
    pluginId: asOptionalString(data.pluginId) ?? 'unknown',
    role: asNodeRole(data.role),
    tags: asTags(data.tags),
  };
}

function isOpenShortcut(event: KeyboardEvent<HTMLElement>): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'f';
}

export function useCanvasGraphSearchController({
  nodes,
}: UseCanvasGraphSearchControllerArgs): CanvasGraphSearchController {
  const [open, setOpen] = useState(false);
  const [focusRequestId, setFocusRequestId] = useState(0);
  const [query, setQueryState] = useState('');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const request = useMemo(() => createCanvasGraphSearchRequest(query), [query]);
  const searchNodes = useMemo(
    () => (request.normalizedQuery.length === 0 ? [] : nodes.map(toSearchNode)),
    [nodes, request.normalizedQuery]
  );
  const result = useMemo(
    () => searchCanvasGraph(searchNodes, request, activeNodeId),
    [activeNodeId, request, searchNodes]
  );
  const matchingNodeIds = useMemo(
    () => result.matches.map((match) => match.nodeId),
    [result.matches]
  );

  const openSearch = useCallback(() => setOpen(true), []);
  const close = useCallback(() => {
    setOpen(false);
    setQueryState('');
    setActiveNodeId(null);
  }, []);
  const setQuery = useCallback((nextQuery: string) => {
    setQueryState(nextQuery);
    setActiveNodeId(null);
  }, []);
  const navigate = useCallback(
    (offset: -1 | 1) => {
      if (result.status !== 'matched') {
        return;
      }
      const nextIndex =
        (result.activeMatchIndex + offset + result.matches.length) % result.matches.length;
      setActiveNodeId(result.matches[nextIndex]!.nodeId);
    },
    [result]
  );
  const showPrevious = useCallback(() => navigate(-1), [navigate]);
  const showNext = useCallback(() => navigate(1), [navigate]);
  const onViewportKeyDown = useCallback<KeyboardEventHandler<HTMLElement>>((event) => {
    if (!isOpenShortcut(event)) {
      return;
    }
    event.preventDefault();
    setOpen(true);
  }, []);
  const onControlKeyDown = useCallback<KeyboardEventHandler<HTMLElement>>(
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (isOpenShortcut(event)) {
        event.preventDefault();
        setFocusRequestId((currentRequestId) => currentRequestId + 1);
      }
    },
    [close]
  );
  const onQueryKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (event) => {
      if (event.key !== 'Enter' || result.status !== 'matched') {
        return;
      }
      event.preventDefault();
      navigate(event.shiftKey ? -1 : 1);
    },
    [navigate, result.status]
  );

  return {
    model: {
      open,
      focusRequestId,
      query,
      status: result.status,
      matchCount: result.matches.length,
      activeMatchPosition: result.status === 'matched' ? result.activeMatchIndex + 1 : null,
      activeNodeId: result.activeNodeId,
    },
    matchingNodeIds,
    open: openSearch,
    close,
    setQuery,
    showPrevious,
    showNext,
    onViewportKeyDown,
    onControlKeyDown,
    onQueryKeyDown,
  };
}

import React from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { useSelectedRelationTool } from './useSelectedRelationTool';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';

export function RelationAnalysisTestHost({
  document,
  children,
}: Readonly<{
  document: SubstraitDocument;
  children: React.ReactNode;
}>) {
  const analysis = useCanvasRelationAnalysisSession(document, 'model');
  return (
    <CanvasRelationAnalysisContext.Provider value={analysis}>
      {children}
    </CanvasRelationAnalysisContext.Provider>
  );
}

export function SelectedUnaryTestForm({
  operation,
  draft,
  title,
  onChange,
  onClose,
}: Readonly<{
  operation: 'sort' | 'fetch';
  draft: SubstraitDocument;
  title: string;
  onChange: (document: SubstraitDocument) => void;
  onClose: () => void;
}>) {
  const selected = useSelectedRelationTool(null, operation, 'insert');
  return selected == null ? null : (
    <CanvasRelationalTreeOperatorForm
      inline
      tool={selected.tool}
      targetRelationId={selected.targetId}
      draft={draft}
      title={title}
      onChange={onChange}
      onClose={onClose}
    />
  );
}

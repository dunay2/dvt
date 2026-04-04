import { AlertCircle, CheckCircle2 } from 'lucide-react';

import type { ImportSourcesResult } from '../../ports/workspace';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { sourceImportWizardCopy as copy } from './copy';

interface ResultStepProps {
  result: ImportSourcesResult;
}

export function ResultStep({ result }: ResultStepProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle2 className="size-8 text-green-500" />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-lg font-medium">{copy.result.title}</h3>
        <p className="text-sm text-slate-300">{copy.result.description}</p>
      </div>

      <Card className="border-slate-600 p-4 text-left">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-300">Groups created:</span>
            <span className="font-medium text-green-400">{result.sourcesCreated}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-300">Tables registered:</span>
            <span className="font-medium text-green-400">{result.tablesImported}</span>
          </div>
        </div>
      </Card>

      <Card className="border-slate-600 p-4 text-left">
        <h4 className="mb-2 text-sm font-medium">{copy.result.filesTitle}</h4>
        <ScrollArea className="h-24">
          <div className="space-y-1 font-mono text-xs">
            {result.yamlFiles.map((file) => (
              <div key={file} className="text-slate-300">
                [file] {file}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <div className="rounded border border-blue-800 bg-blue-900/20 p-3 text-xs text-slate-400">
        <AlertCircle className="mr-2 inline-block size-4" />
        {copy.result.warning}
      </div>
    </div>
  );
}

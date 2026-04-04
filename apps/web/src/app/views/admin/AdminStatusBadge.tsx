import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';

export function AdminStatusBadge({
  ok,
  label,
}: Readonly<{
  ok: boolean;
  label: string;
}>) {
  return (
    <Badge className={cn(ok ? 'bg-green-700 text-white' : 'bg-amber-700 text-white')}>
      {ok ? <CheckCircle2 className="mr-1 size-3" /> : <AlertTriangle className="mr-1 size-3" />}
      {label}
    </Badge>
  );
}


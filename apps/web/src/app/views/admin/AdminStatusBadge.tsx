/** A diagnostic tone is explicit; absence is never coerced to a warning. */
import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import type { AdminStatusTone } from './adminViewModel';
import styles from './AdminPlatform.module.css';

const icons = {
  neutral: CircleHelp,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export function AdminStatusBadge({
  tone,
  label,
}: Readonly<{ tone: AdminStatusTone; label: string }>) {
  const Icon = icons[tone];
  return (
    <Badge className={cn(styles.badge, styles[tone])} data-tone={tone}>
      <Icon aria-hidden="true" className={styles.badgeIcon} />
      {label}
    </Badge>
  );
}

'use client';

import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import styles from './sonner.module.css';
import { cn } from './utils';

const notificationCopy = {
  en: { region: 'Notifications', close: 'Dismiss notification' },
  es: { region: 'Notificaciones', close: 'Cerrar notificación' },
} as const;

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = notificationCopy[language];

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      containerAriaLabel={copy.region}
      icons={{
        success: <CircleCheck aria-hidden="true" />,
        error: <CircleAlert aria-hidden="true" />,
        warning: <TriangleAlert aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
      }}
      {...props}
      toastOptions={{
        closeButtonAriaLabel: copy.close,
        ...toastOptions,
        className: cn(styles.compact, toastOptions?.className),
      }}
    />
  );
};

export { Toaster };

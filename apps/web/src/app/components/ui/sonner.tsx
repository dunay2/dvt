'use client';

import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { resolveString } from '../../plugins/contracts/PluginManifest';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import styles from './sonner.module.css';
import { cn } from './utils';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();
  const language = useApplicationLanguageStore((state) => state.language);
  const { toastOptions } = props;

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      containerAriaLabel={resolveString(
        {
          key: 'notifications.region',
          fallback: 'Notifications',
          translations: { es: 'Notificaciones' },
        },
        language
      )}
      icons={{
        success: <CircleCheck aria-hidden="true" />,
        error: <CircleAlert aria-hidden="true" />,
        warning: <TriangleAlert aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
      }}
      {...props}
      toastOptions={{
        closeButtonAriaLabel: resolveString(
          {
            key: 'notifications.dismiss',
            fallback: 'Dismiss notification',
            translations: { es: 'Cerrar notificación' },
          },
          language
        ),
        ...toastOptions,
        className: cn(styles.compact, toastOptions?.className),
      }}
    />
  );
};

export { Toaster };

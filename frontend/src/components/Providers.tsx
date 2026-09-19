'use client';

import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { AuthProvider } from '@/lib/auth';
import { fetcher } from '@/lib/api';
import { ToastProvider } from '@/components/ui/Toast';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: false, shouldRetryOnError: false }}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </SWRConfig>
  );
}

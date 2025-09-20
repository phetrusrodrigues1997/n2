'use client';

import { base } from 'wagmi/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import type { ReactNode } from 'react';

export function Providers(props: { children: ReactNode }) {
  // Check if running in mobile app (Capacitor)
  const isMobileApp = typeof window !== 'undefined' &&
    (window.location.protocol === 'capacitor:' ||
     window.navigator.userAgent.includes('prediwin') ||
     window.location.hostname === 'localhost');

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      projectId={process.env.NEXT_PUBLIC_PROJECT_ID}
      chain={base}
      config={{
        appearance: {
          mode: 'auto',
        },
        wallet: {
          // Enhanced mobile support
          display: isMobileApp ? 'modal' : 'auto',
          termsUrl: 'https://prediwin.com/terms',
          privacyUrl: 'https://prediwin.com/privacy',
        }
      }}
    >
      {props.children}

    </OnchainKitProvider>
  );
}


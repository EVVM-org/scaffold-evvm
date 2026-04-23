'use client';

import { useEffect, useState } from 'react';
import type { DeployedService, ServicesRegistry } from '@/types/services';

interface State {
  registry: ServicesRegistry | null;
  loading: boolean;
  error: string | null;
}

/**
 * Load the custom-services registry mirrored into `public/customservices.json`
 * by the wizard after a successful deployment. Returns an empty `services`
 * map when the file isn't present yet (cold state — no custom deployments).
 */
export function useCustomServices(): State {
  const [state, setState] = useState<State>({ registry: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/customservices.json', { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) setState({ registry: { chainId: 0, services: {} }, loading: false, error: null });
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as ServicesRegistry;
        if (!cancelled) setState({ registry: data, loading: false, error: null });
      } catch (err: any) {
        if (!cancelled) setState({ registry: null, loading: false, error: err?.message ?? 'Failed to load registry' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * Single-service variant for detail pages. Resolves the slug to the full
 * registry entry, or `undefined` once loading completes if the slug is
 * unknown.
 */
export function useCustomService(slug: string): {
  service: DeployedService | undefined;
  loading: boolean;
  error: string | null;
} {
  const { registry, loading, error } = useCustomServices();
  return {
    service: registry?.services[slug],
    loading,
    error,
  };
}

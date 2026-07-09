import type { NetworkResponse, TrainsResponse } from './types';

export async function fetchNetwork(modes: string[]): Promise<NetworkResponse> {
  const url = new URL('/api/network', window.location.origin);
  url.searchParams.set('modes', modes.join(','));

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  return (await res.json()) as NetworkResponse;
}

export async function fetchTrains(modes: string[]): Promise<TrainsResponse> {
  const url = new URL('/api/trains', window.location.origin);
  url.searchParams.set('modes', modes.join(','));

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  return (await res.json()) as TrainsResponse;
}

import { TFL_BASE_URL } from './config.js';

export class TflApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'TflApiError';
  }
}

const APP_KEY = process.env.TFL_APP_KEY?.trim();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Thin fetch wrapper around the TfL Unified API. Adds the app key (if
 * configured) and retries transient failures / rate limits with backoff.
 */
export async function tflGet<T>(path: string, retries = 2): Promise<T> {
  const url = new URL(path, TFL_BASE_URL);
  if (APP_KEY) url.searchParams.set('app_key', APP_KEY);

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });

      if (res.status === 429 && attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        throw new TflApiError(`TfL API responded ${res.status} for ${url.pathname}`, res.status);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(300 * (attempt + 1));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Unknown TfL API error for ${path}`);
}

import { NextResponse } from 'next/server';
import { MODES } from '@/lib/config';
import { fetchNetwork } from '@/lib/tflNetworkService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get('modes')?.split(',').filter(Boolean) ?? [...MODES];
  const modes = requested.filter((m): m is string => (MODES as readonly string[]).includes(m));
  const effectiveModes = modes.length > 0 ? modes : [...MODES];

  try {
    const network = await fetchNetwork(effectiveModes);
    return NextResponse.json(network, {
      headers: {
        // Hint CDNs / browsers to revalidate roughly in line with our status TTL.
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    console.error('Failed to build network response:', err);
    return NextResponse.json(
      { error: 'Failed to fetch live data from the TfL Unified API. Please try again shortly.' },
      { status: 502 },
    );
  }
}

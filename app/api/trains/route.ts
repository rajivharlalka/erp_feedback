import { NextResponse } from 'next/server';
import { MODES } from '@/lib/config';
import { fetchTrains } from '@/lib/tflTrainsService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get('modes')?.split(',').filter(Boolean) ?? [...MODES];
  const modes = requested.filter((m): m is string => (MODES as readonly string[]).includes(m));
  const effectiveModes = modes.length > 0 ? modes : [...MODES];

  try {
    const payload = await fetchTrains(effectiveModes);
    return NextResponse.json(payload, {
      headers: {
        // Client polls every two seconds; keep CDN/browser cache very short.
        'Cache-Control': 'public, s-maxage=1, stale-while-revalidate=1',
      },
    });
  } catch (err) {
    console.error('Failed to build trains response:', err);
    return NextResponse.json(
      { error: 'Failed to fetch live train positions from the TfL Unified API.' },
      { status: 502 },
    );
  }
}

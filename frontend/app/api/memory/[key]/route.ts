import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://agent:8889';

interface RouteParams {
  params: Promise<{ key: string }>;
}

/**
 * GET /api/memory/[key] - Get a single memory entry
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;
    const res = await fetch(`${WEBHOOK_URL}/memory/${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[/api/memory/${key}] Backend error:`, res.status, text);
      return NextResponse.json({ error: text || 'Backend error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[/api/memory/[key]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/memory/[key] - Delete a single memory entry
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;
    const res = await fetch(`${WEBHOOK_URL}/memory/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[/api/memory/${key}] Backend error:`, res.status, text);
      return NextResponse.json({ error: text || 'Backend error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[/api/memory/[key]] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

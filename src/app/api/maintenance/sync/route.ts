import { NextResponse } from 'next/server';
import { syncExpaToFirestore } from '@/lib/firebaseSync';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50000');
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const status = searchParams.get('status') || undefined;
    const force = searchParams.get('force') === 'true';
    const mcIdParam = searchParams.get('mcId');
    const mcId = mcIdParam === 'global' || mcIdParam === '0' || !mcIdParam ? 112 : parseInt(mcIdParam);

    console.log(`[API] Maintenance Sync triggered. MC: ${mcId} (Nepal), Type: ${status || 'all'}, Range: ${from || 'last'} to ${to || 'now'}, Force: ${force}, Limit: ${limit}`);

    try {
        const result = await syncExpaToFirestore(from, to, mcId, limit, status, force);
        return NextResponse.json({
            message: 'Sync completed successfully',
            ...result
        });
    } catch (error: any) {
        console.error('[API] Maintenance Sync error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Unknown error'
        }, { status: 500 });
    }
}

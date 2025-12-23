/**
 * Message Insights Endpoint - Fetch customer intelligence for a message
 */

import { NextRequest, NextResponse } from 'next/server';
import { customGPTClient } from '@/lib/ai/customgpt-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messageId = parseInt(id, 10);

    if (isNaN(messageId)) {
      return NextResponse.json(
        { error: 'Invalid message ID' },
        { status: 400 }
      );
    }

    // Get session_id from query params
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id query parameter is required' },
        { status: 400 }
      );
    }

    const messageData = await customGPTClient.getMessageWithInsights(sessionId, messageId);

    console.log('[API Insights] Full message data:', JSON.stringify(messageData, null, 2));
    console.log('[API Insights] customer_intelligence:', messageData.customer_intelligence);

    return NextResponse.json({
      success: true,
      customer_intelligence: messageData.customer_intelligence || null,
    });
  } catch (error: any) {
    console.error('[API] Message insights error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

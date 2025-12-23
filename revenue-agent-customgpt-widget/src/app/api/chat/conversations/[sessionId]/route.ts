import { NextRequest, NextResponse } from 'next/server';
import { customGPTClient } from '@/lib/ai/customgpt-client';

/**
 * GET /api/chat/conversations/[sessionId]
 * Get all messages in a conversation for restoration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Validate sessionId format (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      console.warn('[API] Invalid session ID format:', sessionId);
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    // Get messages from CustomGPT API
    const messages = await customGPTClient.getConversationMessages(sessionId);

    // Transform messages to include both user and assistant roles
    const transformedMessages = messages.flatMap((msg: any) => {
      const result = [];

      // Add user message
      if (msg.user_query) {
        result.push({
          id: `user-${msg.id}`,
          role: 'user',
          content: msg.user_query,
          created_at: msg.created_at,
          is_user: true,
        });
      }

      // Add assistant message
      if (msg.openai_response) {
        result.push({
          id: msg.id,
          role: 'assistant',
          content: msg.openai_response,
          created_at: msg.created_at,
          is_user: false,
          response_feedback: msg.response_feedback,
          citations: msg.citations || [],
        });
      }

      return result;
    });

    return NextResponse.json({
      success: true,
      messages: transformedMessages,
    });
  } catch (error: any) {
    console.error('[API] Error fetching conversation messages:', error);

    // Determine appropriate status code based on error
    let statusCode = 500;
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages';

    // Check for specific error types
    if (errorMessage.includes('timeout')) {
      statusCode = 504; // Gateway Timeout
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      statusCode = 404; // Not Found
    } else if (error.status >= 400 && error.status < 500) {
      statusCode = error.status; // Pass through client errors
    }

    return NextResponse.json(
      {
        error: errorMessage,
        code: statusCode === 504 ? 'TIMEOUT' : statusCode === 404 ? 'NOT_FOUND' : 'SERVER_ERROR',
      },
      { status: statusCode }
    );
  }
}

/**
 * DELETE /api/chat/conversations/[sessionId]
 * Delete a conversation by session ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Delete conversation from CustomGPT API
    const deleted = await customGPTClient.deleteConversation(sessionId);

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (error) {
    console.error('[API] Error deleting conversation:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete conversation',
      },
      { status: 500 }
    );
  }
}

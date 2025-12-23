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
  } catch (error) {
    console.error('[API] Error fetching conversation messages:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
      },
      { status: 500 }
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

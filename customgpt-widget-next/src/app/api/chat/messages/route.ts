/**
 * Messages Endpoint - Send/receive chat messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { customGPTClient, AgentCapability } from '@/lib/ai/customgpt-client';
import { processMarkdown } from '@/lib/markdown-processor';

// Valid agent capabilities
const VALID_CAPABILITIES: AgentCapability[] = [
  'fastest-responses',
  'optimal-choice',
  'advanced-reasoning',
  'complex-tasks'
];

export async function POST(request: NextRequest) {
  try {
    const { session_id, message, stream, agent_capability } = await request.json();

    if (!session_id || !message) {
      return NextResponse.json(
        { error: 'session_id and message are required' },
        { status: 400 }
      );
    }

    // Validate agent_capability if provided
    const capability: AgentCapability | undefined = agent_capability && VALID_CAPABILITIES.includes(agent_capability)
      ? agent_capability
      : undefined;

    const startTime = performance.now();

    if (stream) {
      // Streaming response
      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of customGPTClient.sendMessageStream(session_id, message, capability)) {
              const data = `data: ${JSON.stringify({ chunk })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
            controller.close();
          } catch (error: any) {
            controller.error(error);
          }
        },
      });

      return new NextResponse(customStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const response = await customGPTClient.sendMessage(session_id, message, capability);
      const processedResponse = processMarkdown(response.openai_response);

      const duration = ((performance.now() - startTime) / 1000).toFixed(3);
      console.log(`[TIMING] Chat Message: ${duration}s (capability: ${capability || 'default'})`);
      console.log('[API] Response citations:', response.citations);

      return NextResponse.json({
        success: true,
        message: {
          ...response,
          openai_response: processedResponse,
        },
      });
    }
  } catch (error: any) {
    console.error('[API] Chat message error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

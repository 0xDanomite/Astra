import { NextResponse } from 'next/server';
import { initializeAgent } from '@/lib/agent/chatbot';
import { HumanMessage, AIMessage } from "@langchain/core/messages";

export async function POST(request: Request) {
  try {
    const { message, userId, conversationHistory = [] } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    const { agent } = await initializeAgent(userId);

    // Add user message to history
    const humanMessage = new HumanMessage({
      content: message,
      additional_kwargs: {}
    });

    // Use provided conversation history plus new message
    const messages = [...conversationHistory, humanMessage];

    const stream = await agent.stream(
      { messages },
      { configurable: { thread_id: "ASTRA-Agent" } }
    );

    const chunks: string[] = [];
    for await (const chunk of stream) {
      if ("agent" in chunk && chunk.agent?.messages?.[0]?.content) {
        chunks.push(chunk.agent.messages[0].content);
      } else if ("tools" in chunk && chunk.tools?.messages?.[0]?.content) {
        chunks.push(chunk.tools.messages[0].content);
      }
    }

    // Create AI message from response
    const aiMessage = new AIMessage({
      content: chunks.join('\n'),
      additional_kwargs: {}
    });

    // Return both the response and the updated conversation history
    return NextResponse.json({
      response: chunks.join('\n'),
      messages: [...messages, aiMessage]
    });
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { initializeAgent } from '@/lib/agent/chatbot';
import { HumanMessage } from "@langchain/core/messages";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const { agent } = await initializeAgent();

    const stream = await agent.stream(
      { messages: [new HumanMessage(message)] },
      { configurable: { thread_id: "ASTRA-Agent" } }
    );

    const chunks = [];
    for await (const chunk of stream) {
      if ("agent" in chunk) {
        chunks.push(chunk.agent.messages[0].content);
      } else if ("tools" in chunk) {
        chunks.push(chunk.tools.messages[0].content);
      }
    }

    return NextResponse.json({ response: chunks.join('\n') });
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

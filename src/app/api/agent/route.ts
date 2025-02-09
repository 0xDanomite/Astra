import { NextResponse } from 'next/server';
import { initializeAgent } from '@/lib/agent/chatbot';
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// TODO Store conversation history (this should be in a database)
const conversationHistory: { messages: (HumanMessage | AIMessage)[] } = {
  messages: []
};

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const { agent } = await initializeAgent();

    // Add user message to history
    const humanMessage = new HumanMessage({
      content: message,
      additional_kwargs: {}
    });
    conversationHistory.messages.push(humanMessage);

    const stream = await agent.stream(
      { messages: conversationHistory.messages },
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

    // Add AI response to history
    const aiMessage = new AIMessage({
      content: chunks.join('\n'),
      additional_kwargs: {}
    });
    conversationHistory.messages.push(aiMessage);

    return NextResponse.json({ response: chunks.join('\n') });
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

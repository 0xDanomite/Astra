import { NextResponse } from 'next/server';
import { initializeAgent } from '@/lib/agent/chatbot';
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// TODO Store conversation history (this should be in a database)
const conversationHistory: { messages: (HumanMessage | AIMessage)[] } = {
  messages: []
};

// Increase the default timeout for this route
export const maxDuration = 300; // 5 minutes

export async function POST(request: Request) {
  try {
    const { message, userId } = await request.json();

    if (!userId || !message) {
      return NextResponse.json({
        error: 'Missing required fields. Need userId and message.'
      }, { status: 400 });
    }

    // Add timeout to agent initialization
    const agentPromise = initializeAgent(userId);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Agent initialization timed out')), 30000)
    );

    const { agent } = await Promise.race([agentPromise, timeoutPromise]);

    // Add timeout to agent chat
    const chatPromise = agent.chat(message);
    const chatTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Agent response timed out')), 60000)
    );

    const response = await Promise.race([chatPromise, chatTimeoutPromise]);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: error instanceof Error ? error.message : String(error) },
      { status: error instanceof Error && error.message.includes('timed out') ? 504 : 500 }
    );
  }
}

'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const presetCommands = [
  "Create a random meme coin strategy",
  "Show my current portfolio",
  "Create a market cap strategy",
  "Check next rebalance time",
];

export function CommandCenter() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { userId } = useAuth();

  const sendMessage = async (content: string, messageHistory: Message[]) => {
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          userId,
          conversationHistory: messageHistory.map(msg => ({
            type: msg.role === 'user' ? 'HumanMessage' : 'AIMessage',
            data: {
              content: msg.content,
              additional_kwargs: {}
            }
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error sending message:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessage(input, updatedMessages);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = (node: HTMLDivElement) => {
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* Message Display */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        ref={scrollToBottom}
      >
        <AnimatePresence>
          {messages.map((message, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-stellar-blue/20 border border-stellar-blue/30'
                    : 'bg-cosmic-purple/20 border border-cosmic-purple/30'
                }`}
              >
                <p className="text-neural-white whitespace-pre-wrap">{message.content}</p>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-cosmic-purple/20 border border-cosmic-purple/30 p-4 rounded-2xl">
                <Loader className="w-5 h-5 animate-spin text-neural-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preset Commands */}
      <div className="p-4 border-t border-stellar-blue/20">
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin">
          {presetCommands.map((command, i) => (
            <button
              key={i}
              onClick={() => setInput(command)}
              className="px-4 py-2 rounded-full bg-deep-space border border-stellar-blue/30
                       text-neural-white whitespace-nowrap hover:bg-stellar-blue/20
                       transition-colors duration-200"
            >
              {command}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-stellar-blue/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your command..."
            className="flex-1 bg-deep-space border border-stellar-blue/30 rounded-lg p-3
                     text-neural-white placeholder:text-neural-white/50 focus:outline-none
                     focus:border-stellar-blue/60"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 rounded-lg bg-cosmic-gradient text-neural-white
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { useAgent } from '@/lib/agent/hooks';

export const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { agent, isLoading } = useAgent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: input }]);

    try {
      const response = await agent.chat(input);

      // Add agent response
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Agent chat error:', error);
    }

    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              msg.role === 'user'
                ? 'bg-stellar-blue/10 ml-auto'
                : 'bg-cosmic-purple/10'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full p-2 rounded-lg border"
          placeholder="Ask about portfolio strategies..."
          disabled={isLoading}
        />
      </form>
    </div>
  );
};

import { strategyEmitter } from '@/lib/events/strategyEmitter';

// Remove edge runtime
// export const runtime = 'edge';

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start: (controller) => {
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"CONNECTED"}\n\n'));

      const onUpdate = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      strategyEmitter.on('strategyUpdate', onUpdate);

      // Handle cleanup
      const cleanup = () => {
        strategyEmitter.off('strategyUpdate', onUpdate);
        controller.close();
      };

      // Add cleanup to controller
      controller.close = cleanup;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

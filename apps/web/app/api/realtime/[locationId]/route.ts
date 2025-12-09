import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { eventStore, BroadcastPayload } from "@/lib/realtime/event-emitter";

// Server-Sent Events endpoint for real-time updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { locationId } = await params;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send connection established
      sendEvent("connected", { locationId, timestamp: new Date() });

      // Send recent events (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentEvents = eventStore.getRecentEvents(locationId, fiveMinutesAgo);
      recentEvents.forEach((event) => {
        sendEvent(event.event, event);
      });

      // Subscribe to new events
      const unsubscribe = eventStore.subscribe(locationId, (payload: BroadcastPayload) => {
        sendEvent(payload.event, payload);
      });

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        sendEvent("ping", { timestamp: new Date() });
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(pingInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

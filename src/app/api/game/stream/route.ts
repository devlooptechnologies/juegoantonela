import { NextRequest } from "next/server";
import { localStore } from "@/lib/server/localStore";
import { isLocalMode } from "@/lib/supabase";

/**
 * Server-Sent Events stream used ONLY in local mode (no Supabase).
 * Pushes: game, players, answer + heartbeat events.
 */
export async function GET(req: NextRequest) {
  if (!isLocalMode) {
    return new Response("SSE is only used in local mode", { status: 404 });
  }

  const gameId = req.nextUrl.searchParams.get("gameId") ?? "";
  if (!gameId) return new Response("Missing gameId", { status: 400 });

  const encoder = new TextEncoder();
  let unsub: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (cancelled) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          /* connection closed */
        }
      };

      void (async () => {
        try {
          const [game, players] = await Promise.all([
            localStore.getGame(gameId),
            localStore.listPlayers(gameId),
          ]);
          send("game", game);
          send("players", players);
          if (cancelled) return;

          unsub = localStore.subscribe!(gameId, (event, payload) => send(event, payload));
          heartbeat = setInterval(() => send("heartbeat", { t: Date.now() }), 15_000);
        } catch {
          send("error", { message: "stream-bootstrap-failed" });
        }
      })();
    },
    cancel() {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      if (unsub) unsub();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
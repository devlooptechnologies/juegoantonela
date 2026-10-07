import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";
import type { AddAnswerInput } from "@/lib/server/serverStore";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

type Body = { action?: string } & Record<string, unknown>;

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "bad-request" }, 400);
  }
  if (!body.action) return json({ error: "missing-action" }, 400);

  const store = getStore();

  try {
    switch (body.action) {
      case "ensure": {
        const game = await store.ensureGame();
        return json({ game });
      }
      case "new-game": {
        const game = await store.newGame();
        return json({ game });
      }
      case "game": {
        const game = await store.getGame(String(body.gameId ?? ""));
        return json({ game });
      }
      case "join": {
        const result = await store.joinGame(String(body.gameId ?? ""), String(body.name ?? ""));
        return json(result);
      }
      case "start": {
        const game = await store.startGame(String(body.gameId ?? ""));
        return json({ game });
      }
      case "answer": {
        const input: AddAnswerInput = {
          gameId: String(body.gameId ?? ""),
          playerId: String(body.playerId ?? ""),
          playerName: String(body.playerName ?? ""),
          questionId: Number(body.questionId ?? 0),
          questionText: String(body.questionText ?? ""),
          selectedIndex: body.selectedIndex === null ? null : Number(body.selectedIndex),
          correct: Boolean(body.correct),
          responseTimeMs: Number(body.responseTimeMs ?? 0),
          points: Number(body.points ?? 0),
        };
        const answer = await store.addAnswer(input);
        return json({ answer });
      }
      case "finish": {
        const player = await store.finishPlayer(String(body.gameId ?? ""), String(body.playerId ?? ""));
        return json({ player });
      }
      case "players": {
        const players = await store.listPlayers(String(body.gameId ?? ""));
        return json({ players });
      }
      case "leaderboard": {
        const players = await store.getLeaderboard(String(body.gameId ?? ""));
        return json({ players });
      }
      case "state": {
        const state = await store.getState(String(body.gameId ?? ""));
        return json(state);
      }
      case "my": {
        const player = await store.getPlayer(String(body.gameId ?? ""), String(body.playerId ?? ""));
        return json({ player });
      }
      case "answers": {
        const answers = await store.getAnswersForPlayer(
          String(body.gameId ?? ""),
          String(body.playerId ?? ""),
        );
        return json({ answers });
      }
      default:
        return json({ error: "unknown-action" }, 400);
    }
  } catch (err) {
    console.error("[api/game] error:", err);
    return json({ error: "server" }, 500);
  }
}
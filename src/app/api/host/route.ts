import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const HOST_PIN = process.env.GAME_HOST_PIN ?? "gmhost27";

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  let body: { pin?: unknown };
  try {
    body = (await req.json()) as { pin?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const ok = typeof body.pin === "string" && safeEquals(body.pin, HOST_PIN);
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
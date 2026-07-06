import { NextResponse } from "next/server";
import { notify } from "@/lib/notify";

export async function POST(req: Request) {
  const data = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!data.name || !data.email || !data.message) {
    return NextResponse.json({ error: "Please fill in the required fields." }, { status: 400 });
  }
  const result = await notify(`Contact — ${data.name}`, data);
  return NextResponse.json({ ok: result.ok });
}

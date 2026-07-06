import { NextResponse } from "next/server";
import { notify } from "@/lib/notify";

export async function POST(req: Request) {
  const data = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!data.name || !data.email) {
    return NextResponse.json({ error: "Please fill in the required fields." }, { status: 400 });
  }
  const result = await notify(`Demo request — ${data.name}${data.company ? ` (${data.company})` : ""}`, data);
  return NextResponse.json({ ok: result.ok });
}

/* Form delivery — logs every submission (so nothing is lost before email is
 * configured) and, when RESEND_API_KEY is set, emails it via the Resend REST
 * API (no SDK dependency). Honeypot field silently drops bots. */

const HONEYPOT = "company_website";

export async function notify(
  subject: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; emailed: boolean }> {
  // Anti-spam: bots fill the hidden honeypot; pretend success and drop.
  if (data[HONEYPOT]) return { ok: true, emailed: false };

  const to = process.env.CONTACT_TO ?? "hello@hitlist.fm";
  const from = process.env.EMAIL_FROM ?? "hitlist.fm <no-reply@hitlist.fm>";
  const key = process.env.RESEND_API_KEY;

  const lines = Object.entries(data)
    .filter(([k, v]) => k !== HONEYPOT && v !== "" && v != null)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("\n");

  // Always log so submissions are recoverable from deploy logs.
  console.log(`[form:${subject}]\n${lines}`);

  if (!key) return { ok: true, emailed: false };

  const replyTo = (data.contactEmail || data.email) as string | undefined;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: `[hitlist.fm] ${subject}`,
      text: lines,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  return { ok: res.ok, emailed: res.ok };
}

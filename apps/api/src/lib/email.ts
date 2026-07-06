/**
 * Env-gated email sender.
 *
 * When RESEND_API_KEY is set, emails are delivered through the Resend API
 * (plain fetch, no SDK dependency). When it is not set, the full email
 * (recipient + subject + body) is logged instead so flows that depend on
 * email (e.g. password reset) remain debuggable in dev without credentials.
 *
 * sendEmail never throws: delivery failures are logged, so callers with a
 * fixed response contract (like the generic 200 on /auth/forgot-password)
 * can't leak state through errors.
 */

import pino from "pino";

const logger = pino({ name: "email" });

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "hitlist.fm <noreply@hitlist.fm>";

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email via Resend, or log it when email is not configured.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, text, html } = options;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  if (!apiKey) {
    logger.warn("email not configured (RESEND_API_KEY missing) — logging email instead of sending");
    logger.info({ to, subject, text, html }, "email (not sent)");
    return;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text,
        ...(html ? { html } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error(
        { status: response.status, body, to, subject },
        "Resend API returned an error"
      );
      return;
    }

    logger.info({ to, subject }, "email sent via Resend");
  } catch (err) {
    logger.error({ err, to, subject }, "email send failed");
  }
}

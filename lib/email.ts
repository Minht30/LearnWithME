import { Resend } from "resend";
import { env } from "@/lib/env";

/**
 * Fire-and-forget email. If RESEND_API_KEY is not set, silently no-ops so
 * local dev and Vercel deploys without email work fine.
 */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; error?: string }> {
  if (!env.RESEND_API_KEY) {
    return { sent: false, error: "RESEND_API_KEY not configured (email disabled)" };
  }
  try {
    const client = new Resend(env.RESEND_API_KEY);
    const res = await client.emails.send({
      from: env.RESEND_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (res.error) return { sent: false, error: res.error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}

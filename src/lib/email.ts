const DEFAULT_REMINDER_RECIPIENT = "clchrf.lee@gmail.com";

export function reminderRecipient(): string {
  return process.env.REMINDER_EMAIL_TO || DEFAULT_REMINDER_RECIPIENT;
}

export async function sendReminderEmail(to: string): Promise<{ ok: boolean; detail?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, detail: "RESEND_API_KEY not configured" };
  }
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const appUrl = process.env.APP_URL || "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'PingFang TC', sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 24px; color: #1c1c1e;">
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 24px;">🐱 電子貓日記</div>
      <p style="font-size: 15px; line-height: 1.6;">記錄一下今天。</p>
      <a href="${appUrl}/record" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1c1c1e; color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 15px;">記錄今天</a>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "電子貓日記｜今天記錄了嗎？",
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, detail };
  }
  return { ok: true };
}

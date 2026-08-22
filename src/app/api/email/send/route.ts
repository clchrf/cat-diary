import { NextRequest, NextResponse } from "next/server";
import { sendReminderEmail, reminderRecipient } from "@/lib/email";

export const runtime = "nodejs";

// Triggered once daily by Vercel Cron (see vercel.json), scheduled for
// 22:00 Asia/Taipei. Vercel Cron sends an `Authorization: Bearer <CRON_SECRET>`
// header automatically when CRON_SECRET is configured, which is what keeps
// this route from being triggered repeatedly by anyone else.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const result = await sendReminderEmail(reminderRecipient());
  if (!result.ok) {
    return NextResponse.json({ error: "send_failed", detail: result.detail }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

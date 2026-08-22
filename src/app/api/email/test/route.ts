import { NextResponse } from "next/server";
import { sendReminderEmail, reminderRecipient } from "@/lib/email";

export const runtime = "nodejs";

export async function POST() {
  const to = reminderRecipient();
  const result = await sendReminderEmail(to);
  if (!result.ok) {
    return NextResponse.json({ error: "send_failed", detail: result.detail }, { status: 502 });
  }
  return NextResponse.json({ ok: true, to });
}

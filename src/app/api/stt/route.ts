import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "not_configured", message: "OPENAI_API_KEY 尚未設定，語音轉文字功能無法使用。" },
      { status: 501 }
    );
  }

  const incoming = await req.formData();
  const file = incoming.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("file", file, "audio.webm");
  upstream.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: "upstream_error", detail: text }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ transcript: data.text as string });
}

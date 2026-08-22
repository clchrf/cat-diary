import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Groq hosts Whisper themselves with a free tier and an OpenAI-compatible
// endpoint, so this is a near drop-in swap for what used to call OpenAI
// directly. See README for how to get a key.
const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL = "whisper-large-v3-turbo";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "not_configured", message: "GROQ_API_KEY 尚未設定，語音轉文字功能無法使用。" },
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
  upstream.append("model", GROQ_MODEL);

  const res = await fetch(GROQ_TRANSCRIPTION_URL, {
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

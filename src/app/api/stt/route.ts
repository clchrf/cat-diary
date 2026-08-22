import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Google's free tier (Google AI Studio) supports audio input directly via
// generateContent, so instead of a dedicated transcription endpoint we ask
// a fast Gemini model to transcribe the clip verbatim.
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const TRANSCRIBE_PROMPT =
  "請把這段音檔逐字轉成文字，使用音檔中實際說話的語言（可能是中文、英文或混合）。只輸出轉錄的文字本身，不要加任何說明、標點以外的內容、引號或前後綴。如果聽不清楚或音檔沒有語音內容，就輸出空字串。";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "not_configured", message: "GEMINI_API_KEY 尚未設定，語音轉文字功能無法使用。" },
      { status: 501 }
    );
  }

  const incoming = await req.formData();
  const file = incoming.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64Audio = buffer.toString("base64");
  const mimeType = file.type || "audio/webm";

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: TRANSCRIBE_PROMPT }, { inlineData: { mimeType, data: base64Audio } }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: "upstream_error", detail: text }, { status: 502 });
  }

  const data = await res.json();
  const transcript: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return NextResponse.json({ transcript: transcript.trim() });
}

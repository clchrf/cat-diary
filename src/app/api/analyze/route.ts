import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Reuses the same free-tier Gemini setup as /api/stt — no new provider or
// API key to configure. This endpoint is a quiet reflection/summarization
// aid only: it never diagnoses, never touches medication, and only ever
// sees the one entry (or that day's already-short summaries) it's asked
// to look at — never the rest of the diary.
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MOOD_WORDS = ["開心", "平靜", "難過", "生氣", "焦慮", "疲累", "困惑"];

const EVENT_PROMPT = `你是一個安靜的日記情緒整理小工具，不是心理治療師、不是醫生。你絕對不能：
- 診斷任何精神疾病或心理狀況
- 對藥物、醫療做任何判斷或建議
- 評論或推測這個人有沒有吃藥
- 推測日記裡沒有明確寫出來的事情（只能根據明確寫出/說出的內容整理）

如果內容太少、看不出情緒，對應欄位請填 null，不要用猜的。

請閱讀下面這一篇日記內容，只輸出一個 JSON 物件（不要輸出其他文字、不要用 markdown code block），格式如下，每個欄位的說明在後面的冒號之後：

{
  "primaryMood": 只能是「${MOOD_WORDS.join("」「")}」其中一個字串，如果都不符合或無法判斷就是 null，不可以自創新詞,
  "secondaryMoods": 字串陣列，只能包含上面 7 個詞，可以是空陣列 [],
  "emotionIntensity": 只能是「低」「中等」「高」其中一個字串，無法判斷就是 null,
  "importantEvents": 字串陣列，這篇日記提到的具體事件，每條不超過 15 字，最多 3 條，沒有就是 [],
  "summary": 字串，用 1-2 句話整理這篇日記在說什麼，只能整理，不能評價、不能給建議、不能診斷，無法整理就是 null,
  "safetyFlag": 布林值，只有在內容出現「非常明確、直接」的自我傷害／不想活了／想死／自殺／傷害自己的計畫等語句時才是 true；一般的抱怨、疲累、生氣（例如「累死了」「氣死我了」「快被逼瘋」）不算，不確定的時候一律是 false
}

日記內容：
"""
{{TEXT}}
"""`;

const DAILY_PROMPT = `你是一個安靜的日記情緒整理小工具。以下是同一天裡，按時間排列的幾段日記摘要（每段摘要本身已經是整理過的結果，不是原文）。

請只根據這些摘要，用 1-2 句繁體中文整理這一天整體的情緒變化，不能評價、不能給建議、不能診斷、不能推測沒寫出來的事。只輸出一個 JSON 物件：{"overallSummary": "..."}，無法整理就是 {"overallSummary": null}。

每段摘要：
{{ENTRIES}}`;

async function callGemini(apiKey: string, prompt: string): Promise<unknown> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return JSON.parse(text);
}

interface DailyEntryInput {
  time?: string;
  summary?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "not_configured", message: "GEMINI_API_KEY 尚未設定，AI 情緒整理功能無法使用。" },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    if ((body as { kind?: string }).kind === "daily") {
      const entries = Array.isArray((body as { entries?: unknown }).entries)
        ? ((body as { entries: DailyEntryInput[] }).entries)
        : [];
      if (entries.length === 0) {
        return NextResponse.json({ error: "missing_entries" }, { status: 400 });
      }
      const entriesText = entries.map((e) => `${e.time ?? ""}：${e.summary ?? ""}`).join("\n");
      const prompt = DAILY_PROMPT.replace("{{ENTRIES}}", entriesText);
      const parsed = (await callGemini(apiKey, prompt)) as { overallSummary?: unknown };
      return NextResponse.json({
        overallSummary: typeof parsed?.overallSummary === "string" ? parsed.overallSummary : null,
      });
    }

    const text = typeof (body as { text?: unknown }).text === "string" ? (body as { text: string }).text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "missing_text" }, { status: 400 });
    }

    const prompt = EVENT_PROMPT.replace("{{TEXT}}", text);
    const parsed = await callGemini(apiKey, prompt);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: "upstream_error", detail: String(err) }, { status: 502 });
  }
}

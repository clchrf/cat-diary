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
const UNKNOWN = "無法判斷";

// A concrete example, not an inline schema-in-JSON — mixing field
// descriptions into the JSON structure itself previously confused the
// model into defaulting everything to null. responseSchema below is what
// actually constrains the shape; this prompt just needs to explain intent.
const EVENT_PROMPT = `你是一個安靜的日記情緒整理小工具，不是心理治療師、不是醫生。你絕對不能：
- 診斷任何精神疾病或心理狀況
- 對藥物、醫療做任何判斷或建議
- 評論或推測這個人有沒有吃藥
- 推測日記裡沒有明確寫出來的事情——只能根據明確寫出或說出的內容整理

請閱讀下面這一篇日記內容，判斷：
1. primaryMood：這篇日記最主要表達出的情緒，只能是「${MOOD_WORDS.join("、")}」其中一個詞；如果內容太少、看不出明顯情緒，就回答「${UNKNOWN}」，不要用猜的
2. secondaryMoods：次要情緒，同樣只能從上面 7 個詞中選，沒有就是空陣列
3. emotionIntensity：情緒強度，「低」「中等」「高」三選一；無法判斷就是「${UNKNOWN}」
4. importantEvents：這篇日記提到的具體事件，簡短列點，每條不超過 15 字，最多 3 條，沒有就是空陣列
5. summary：用 1-2 句話整理這篇日記在說什麼，只能整理，不能評價、不能給建議、不能診斷；內容太少無法整理就是空字串
6. safetyFlag：只有在內容出現「非常明確、直接」的自我傷害、不想活了、想死、自殺、傷害自己的計畫等語句時才是 true；一般的抱怨、疲累、生氣（例如「累死了」「氣死我了」「快被逼瘋」）不算，不確定的時候一律是 false

舉例，如果日記內容是「今天下課之後很開心，但明天要考試有點緊張」，一個合理的回答是：
{"primaryMood": "開心", "secondaryMoods": ["焦慮"], "emotionIntensity": "中等", "importantEvents": ["明天考試"], "summary": "下課後感到開心，但也因為隔天考試而有些緊張。", "safetyFlag": false}

現在請針對下面這篇實際的日記內容回答：

日記內容：
"""
{{TEXT}}
"""`;

const DAILY_PROMPT = `你是一個安靜的日記情緒整理小工具。以下是同一天裡，按時間排列的幾段日記摘要（每段摘要本身已經是整理過的結果，不是原文）。

請只根據這些摘要，用 1-2 句繁體中文整理這一天整體的情緒變化，不能評價、不能給建議、不能診斷、不能推測沒寫出來的事。如果內容不足以整理，overallSummary 請回答空字串。

每段摘要：
{{ENTRIES}}`;

const EVENT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    primaryMood: { type: "STRING", enum: [...MOOD_WORDS, UNKNOWN] },
    secondaryMoods: { type: "ARRAY", items: { type: "STRING", enum: MOOD_WORDS } },
    emotionIntensity: { type: "STRING", enum: ["低", "中等", "高", UNKNOWN] },
    importantEvents: { type: "ARRAY", items: { type: "STRING" } },
    summary: { type: "STRING" },
    safetyFlag: { type: "BOOLEAN" },
  },
  required: ["primaryMood", "secondaryMoods", "emotionIntensity", "importantEvents", "summary", "safetyFlag"],
};

const DAILY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: { overallSummary: { type: "STRING" } },
  required: ["overallSummary"],
};

async function callGemini(apiKey: string, prompt: string, responseSchema: object): Promise<unknown> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema },
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
      const parsed = (await callGemini(apiKey, prompt, DAILY_RESPONSE_SCHEMA)) as { overallSummary?: unknown };
      const summary = typeof parsed?.overallSummary === "string" ? parsed.overallSummary.trim() : "";
      return NextResponse.json({ overallSummary: summary || null });
    }

    const text = typeof (body as { text?: unknown }).text === "string" ? (body as { text: string }).text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "missing_text" }, { status: 400 });
    }

    const prompt = EVENT_PROMPT.replace("{{TEXT}}", text);
    const parsed = (await callGemini(apiKey, prompt, EVENT_RESPONSE_SCHEMA)) as Record<string, unknown>;

    // Normalize the "cannot determine" sentinel back to null for the client.
    const raw = JSON.stringify(parsed);
    if (parsed.primaryMood === UNKNOWN) parsed.primaryMood = null;
    if (parsed.emotionIntensity === UNKNOWN) parsed.emotionIntensity = null;
    if (parsed.summary === "") parsed.summary = null;

    return NextResponse.json({ ...parsed, _debugRaw: raw });
  } catch (err) {
    return NextResponse.json({ error: "upstream_error", detail: String(err) }, { status: 502 });
  }
}

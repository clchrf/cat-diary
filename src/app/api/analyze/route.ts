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
const EVENT_PROMPT = `你在幫使用者把日記整理成結構化欄位，就像一個細心的朋友讀完日記後，簡單說出「你這篇聽起來是開心的」這種程度的整理——這不是醫療診斷，只是單純把日記裡已經寫出來的情緒和事件整理成欄位，所以大部分日記都應該可以正常判斷出主要情緒，請正常作答，不要過度保守或迴避。

只有在完全找不到任何情緒線索（例如內容只有一兩個字、或是純粹的待辦清單、看不出任何情緒）時，primaryMood 才需要是「${UNKNOWN}」；只要日記裡有任何明示或暗示的情緒字眼（開心、累、煩、緊張、放鬆、生氣、難過等等），都要正常判斷出對應的情緒，不要因為想保守就預設回答「${UNKNOWN}」。

另外幾個原則：
- 不要診斷任何精神疾病或心理狀況、不要對藥物或醫療做任何判斷或建議、不要評論或推測這個人有沒有吃藥
- 不要推測日記裡沒有明確寫出來的事情，只根據明確寫出或說出的內容整理

請針對日記內容判斷這幾個欄位：
1. primaryMood：這篇日記最主要表達出的情緒，只能是「${MOOD_WORDS.join("、")}」其中一個詞，或是「${UNKNOWN}」（見上面的說明，應該很少用到）
2. secondaryMoods：次要情緒，同樣只能從上面 7 個詞中選，沒有就是空陣列
3. emotionIntensity：情緒強度，「低」「中等」「高」三選一；只有 primaryMood 是「${UNKNOWN}」時才需要是「${UNKNOWN}」
4. importantEvents：這篇日記提到的具體事件，簡短列點，每條不超過 15 字，最多 3 條，沒有就是空陣列
5. summary：用 1-2 句話整理這篇日記在說什麼，只能整理，不能評價、不能給建議、不能診斷；內容太少無法整理就是空字串
6. safetyFlag：只有在內容出現「非常明確、直接」的自我傷害、不想活了、想死、自殺、傷害自己的計畫等語句時才是 true；一般的抱怨、疲累、生氣（例如「累死了」「氣死我了」「快被逼瘋」）不算，不確定的時候一律是 false

舉例 1，日記內容「今天下課之後很開心，但明天要考試有點緊張」，合理的回答：
{"primaryMood": "開心", "secondaryMoods": ["焦慮"], "emotionIntensity": "中等", "importantEvents": ["明天考試"], "summary": "下課後感到開心，但也因為隔天考試而有些緊張。", "safetyFlag": false}

舉例 2，日記內容「我今天真的非常開心，因為升職了」，合理的回答：
{"primaryMood": "開心", "secondaryMoods": [], "emotionIntensity": "高", "importantEvents": ["升職"], "summary": "因為升職而感到非常開心。", "safetyFlag": false}

舉例 3，日記內容「買東西」，因為完全看不出情緒，合理的回答：
{"primaryMood": "${UNKNOWN}", "secondaryMoods": [], "emotionIntensity": "${UNKNOWN}", "importantEvents": ["買東西"], "summary": "", "safetyFlag": false}

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

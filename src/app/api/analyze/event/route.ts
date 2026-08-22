import { NextRequest, NextResponse } from "next/server";
import { callClaude, extractJson } from "@/lib/ai";

export const runtime = "nodejs";

interface EventAnalysisResult {
  summary: string;
  primaryEmotion: string;
  secondaryEmotions: string[];
  eventType: string;
  needsAttention: {
    flagged: boolean;
    confidence: "certain" | "uncertain" | "none";
    summary?: string;
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "not_configured", message: "ANTHROPIC_API_KEY 尚未設定，AI 分析功能無法使用。" },
      { status: 501 }
    );
  }

  const body = await req.json();
  const {
    whatHappened,
    firstReaction,
    emotions,
    emotionsCustom,
    wantToDo,
    displayedMindset,
    howHandled,
  } = body;

  const fields = [
    whatHappened && `發生了什麼事：${whatHappened}`,
    firstReaction && `第一反應：${firstReaction}`,
    (emotions?.length || emotionsCustom) && `使用者自選的實際情緒：${[...(emotions ?? []), emotionsCustom].filter(Boolean).join("、")}`,
    wantToDo && `想做什麼：${wantToDo}`,
    displayedMindset && `表現出來的心態：${displayedMindset}`,
    howHandled && `最後怎麼處理：${howHandled}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!fields) {
    return NextResponse.json({ error: "empty_input" }, { status: 400 });
  }

  const prompt = `以下是使用者針對「同一件事」記錄的內容片段：

${fields}

請輸出以下 JSON 格式（不要有其他文字）：
{
  "summary": "一到兩句話整理這件事，語氣中性、不加評論",
  "primaryEmotion": "根據內容整理出的主要情緒（例如：生氣、失望、疲累等，如果使用者已自選情緒，優先採用貼近使用者自選的詞彙）",
  "secondaryEmotions": ["可能的次要情緒，最多三個，如果不足以判斷則為空陣列"],
  "eventType": "這件事屬於的情境類型，例如：人際互動、課業／工作、等待回覆、臨時變動、自己的表現、疲累、其他",
  "needsAttention": {
    "flagged": false,
    "confidence": "none",
    "summary": "若內容包含明確的自我傷害相關表達、不想活等高風險表達，或非常強烈且反覆的負面內容，flagged 設為 true、confidence 設為 certain 或 uncertain，並用一句話中性描述；否則 flagged 設為 false、confidence 為 none、summary 可省略"
  }
}`;

  try {
    const raw = await callClaude(prompt, apiKey);
    const parsed = extractJson<EventAnalysisResult>(raw);
    if (!parsed) {
      return NextResponse.json({ error: "parse_failed", raw }, { status: 502 });
    }
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: "upstream_error", detail: String(err) }, { status: 502 });
  }
}

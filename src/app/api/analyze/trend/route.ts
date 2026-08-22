import { NextRequest, NextResponse } from "next/server";
import { callClaude, extractJson } from "@/lib/ai";

export const runtime = "nodejs";

interface TrendAnalysisResult {
  summary: string;
  commonTriggers: string[];
  observation: string;
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
  const events: Array<{
    dateKey: string;
    whatHappened?: string;
    emotions?: string[];
    eventType?: string;
    firstReaction?: string;
    howHandled?: string;
  }> = body.events ?? [];

  if (!events.length) {
    return NextResponse.json({ error: "empty_input" }, { status: 400 });
  }

  const listing = events
    .map(
      (e, i) =>
        `${i + 1}. [${e.dateKey}] 事件：${e.whatHappened ?? "（未記錄）"}／情緒：${(e.emotions ?? []).join("、") || "（未記錄）"}／第一反應：${e.firstReaction ?? "（未記錄）"}／最後處理：${e.howHandled ?? "（未記錄）"}`
    )
    .join("\n");

  const prompt = `以下是使用者一段期間內的多筆生活與情緒紀錄：

${listing}

請輸出以下 JSON 格式（不要有其他文字），所有內容必須根據上面實際資料整理，不要憑空推測：
{
  "summary": "一到兩句話整理這段期間的整體狀況，語氣中性",
  "commonTriggers": ["根據資料歸納出的常見情境類型，例如：人際互動、課業／工作、等待回覆、臨時變動、自己的表現、疲累，最多五個，若資料不足以歸納則為空陣列"],
  "observation": "一句中性的觀察，例如描述第一反應與最後處理方式是否常常不同、情緒是否有變化趨勢等，若資料不足以判斷請直接說「目前資料還不足以看出明顯趨勢」"
}`;

  try {
    const raw = await callClaude(prompt, apiKey);
    const parsed = extractJson<TrendAnalysisResult>(raw);
    if (!parsed) {
      return NextResponse.json({ error: "parse_failed", raw }, { status: 502 });
    }
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: "upstream_error", detail: String(err) }, { status: 502 });
  }
}

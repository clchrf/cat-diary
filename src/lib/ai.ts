const ANTHROPIC_MODEL = "claude-sonnet-5";

export const AI_SYSTEM_PROMPT = `你是「電子貓日記」App 內的資料整理助手。使用者會提供他們自己記錄的生活與情緒片段。

你的角色僅限於「整理與觀察」，絕對不是心理諮商師或醫生。嚴格遵守：
- 禁止提供醫療或心理診斷（例如「你有憂鬱症」「你有焦慮症」）。
- 禁止說使用者「不正常」「想太多」或做出評價性判斷。
- 禁止提供藥物建議或劑量建議。
- 只根據使用者實際提供的文字內容整理歸納，不要憑空推測未提及的事。
- 如果內容不足以判斷，請誠實回答「無法確定」，不要過度推測。
- 一律使用繁體中文回覆。
- 只輸出符合要求的 JSON，不要有任何其他文字、前言或 markdown 標記。`;

export async function callClaude(userPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: AI_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const block = data.content?.find((c: { type: string }) => c.type === "text");
  return block?.text ?? "";
}

export function extractJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

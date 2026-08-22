"use client";

import { useState } from "react";

interface PromptPanelProps {
  label?: string;
  buildPrompt: () => string;
}

export function PromptPanel({ label = "需要 AI 幫忙？", buildPrompt }: PromptPanelProps) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setPrompt(buildPrompt());
    setCopied(false);
  }

  async function handleCopy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — the text is still selectable in the textarea below
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted">{label}</span>
        {!prompt && (
          <button onClick={handleGenerate} className="text-[13px] underline underline-offset-2">
            整理成 Prompt
          </button>
        )}
      </div>
      {prompt && (
        <div className="flex flex-col gap-2">
          <textarea
            readOnly
            value={prompt}
            rows={8}
            className="w-full resize-none rounded-xl border border-divider bg-transparent p-3 text-[12px] leading-relaxed text-muted focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="rounded-lg bg-foreground px-4 py-2 text-[13px] text-background"
            >
              {copied ? "已複製" : "複製 Prompt"}
            </button>
            <button onClick={handleGenerate} className="text-[12px] text-muted underline underline-offset-2">
              重新整理
            </button>
          </div>
          <p className="text-[11px] text-muted">
            這段文字只會產生在你的裝置上，需要你自己複製貼到你平常使用的 AI（例如 ChatGPT、Claude）才會送出。
          </p>
        </div>
      )}
    </div>
  );
}

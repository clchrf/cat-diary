"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CatSprite } from "@/components/cat/CatSprite";
import { VoiceRecorder } from "@/components/record/VoiceRecorder";
import { saveAudio, saveCompanionSession, addCans } from "@/lib/db";
import type { AudioRecord } from "@/lib/types";

const TOTAL_SECONDS = 120;

export default function CompanionPage() {
  const router = useRouter();
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);
  const [clipCount, setClipCount] = useState(0);
  const sessionIdRef = useRef(crypto.randomUUID());
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && !finishedRef.current) {
      finishedRef.current = true;
      setRunning(false);
      (async () => {
        await saveCompanionSession({
          id: sessionIdRef.current,
          timestamp: new Date().toISOString(),
          durationSeconds: TOTAL_SECONDS,
          completed: true,
        });
        await addCans(1, "companion");
        setDone(true);
      })();
    }
  }, [remaining]);

  async function handleRecorded(blob: Blob, duration: number) {
    const record: AudioRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      duration,
      audioBlob: blob,
      linkedRecordId: sessionIdRef.current,
      linkedField: "companion",
    };
    await saveAudio(record);
    setClipCount((c) => c + 1);
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-md flex-col items-center px-6">
      <div className="flex w-full items-center justify-between py-2">
        <button onClick={() => router.back()} className="-m-2 p-2 text-[16px] text-muted">
          {done ? "" : "結束"}
        </button>
        <h1 className="text-[15px] font-medium">2 分鐘陪伴</h1>
        <div className="w-8" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <CatSprite animation={done ? "meow_stand" : "idle_sit"} scale={5} fps={done ? 8 : 5} />

        {!done ? (
          <>
            <div className="text-[40px] font-light tabular-nums tracking-wider">{mm}:{ss}</div>
            <p className="max-w-[240px] text-center text-[13px] text-muted">
              不用說話也可以。想錄音的話隨時按下麥克風，說完再按一次停止，可以錄很多段。
            </p>
            <VoiceRecorder onRecorded={handleRecorded} />
            {clipCount > 0 && (
              <span className="text-[12px] text-muted">已錄 {clipCount} 段</span>
            )}
          </>
        ) : (
          <>
            <div className="text-[17px] font-medium">完成</div>
            <div className="text-[13px] text-muted">🥫 +1</div>
            <button
              onClick={() => router.push("/")}
              className="mt-4 rounded-2xl bg-foreground px-8 py-3 text-[15px] font-medium text-background"
            >
              回首頁
            </button>
          </>
        )}
      </div>
    </main>
  );
}

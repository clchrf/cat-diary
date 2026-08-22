"use client";

import { useEffect, useState } from "react";
import { getSettings } from "@/lib/db";
import { hashPin, hasRegisteredAuthenticator, verifyPlatformAuthenticator } from "@/lib/lock";

const SESSION_UNLOCK_KEY = "cat-diary-unlocked";

export function LockGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");
  const [pinHash, setPinHash] = useState<string | undefined>();
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      const alreadyUnlocked = sessionStorage.getItem(SESSION_UNLOCK_KEY) === "1";
      if (!settings.pinEnabled || alreadyUnlocked) {
        setStatus("unlocked");
        return;
      }
      setPinHash(settings.pinHash);
      setHasBiometric(hasRegisteredAuthenticator());
      setStatus("locked");
    })();
  }, []);

  async function tryBiometric() {
    setError(null);
    const ok = await verifyPlatformAuthenticator();
    if (ok) {
      sessionStorage.setItem(SESSION_UNLOCK_KEY, "1");
      setStatus("unlocked");
    } else {
      setError("驗證失敗，請改用 PIN");
    }
  }

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const inputHash = await hashPin(pinInput);
    if (inputHash === pinHash) {
      sessionStorage.setItem(SESSION_UNLOCK_KEY, "1");
      setStatus("unlocked");
    } else {
      setError("PIN 錯誤");
      setPinInput("");
    }
  }

  if (status === "checking") return null;
  if (status === "unlocked") return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-8">
      <span className="text-[15px] font-medium">🔒 電子貓日記已上鎖</span>
      {hasBiometric && (
        <button
          onClick={tryBiometric}
          className="rounded-2xl bg-foreground px-6 py-3 text-[15px] font-medium text-background"
        >
          使用 Face ID / Touch ID 解鎖
        </button>
      )}
      <form onSubmit={submitPin} className="flex flex-col items-center gap-3">
        <input
          type="password"
          inputMode="numeric"
          autoFocus={!hasBiometric}
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          placeholder="輸入 PIN"
          className="w-40 rounded-xl border border-divider bg-transparent p-3 text-center text-[16px] tracking-[0.3em] focus:outline-none"
        />
        <button type="submit" className="text-[14px] text-muted underline underline-offset-2">
          解鎖
        </button>
      </form>
      {error && <span className="text-[13px] text-[var(--danger)]">{error}</span>}
    </div>
  );
}

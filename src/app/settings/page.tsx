"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getSettings,
  saveSettings,
  exportAllData,
  importAllData,
  clearAllData,
} from "@/lib/db";
import {
  hashPin,
  isPlatformAuthenticatorAvailable,
  hasRegisteredAuthenticator,
  registerPlatformAuthenticator,
  clearPlatformAuthenticator,
} from "@/lib/lock";
import type { AppSettings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
    isPlatformAuthenticatorAvailable().then(setBiometricAvailable);
    setBiometricRegistered(hasRegisteredAuthenticator());
  }, []);

  async function enablePin() {
    setPinError(null);
    if (pinInput.length < 4) {
      setPinError("PIN 至少 4 碼");
      return;
    }
    if (pinInput !== pinConfirm) {
      setPinError("兩次輸入不一致");
      return;
    }
    const pinHash = await hashPin(pinInput);
    const updated: AppSettings = { ...settings!, pinEnabled: true, pinHash };
    await saveSettings(updated);
    setSettings(updated);
    setPinInput("");
    setPinConfirm("");
  }

  async function disablePin() {
    const updated: AppSettings = { ...settings!, pinEnabled: false, pinHash: undefined };
    await saveSettings(updated);
    setSettings(updated);
    clearPlatformAuthenticator();
    setBiometricRegistered(false);
  }

  async function toggleReminder() {
    if (!settings) return;
    const updated: AppSettings = { ...settings, reminderEnabled: !settings.reminderEnabled };
    await saveSettings(updated);
    setSettings(updated);
  }

  async function enableBiometric() {
    const ok = await registerPlatformAuthenticator();
    setBiometricRegistered(ok);
  }

  async function handleExport() {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cat-diary-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    await importAllData(data);
    e.target.value = "";
  }

  async function handleClear() {
    if (!confirm("確定要清除所有資料嗎？此動作無法復原。")) return;
    await clearAllData();
  }

  async function sendTestEmail() {
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const res = await fetch("/api/email/test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setEmailStatus(`已寄出測試信到 ${data.to}`);
      } else {
        setEmailStatus(data.detail ?? "寄送失敗，請確認 RESEND_API_KEY 是否已設定");
      }
    } catch {
      setEmailStatus("網路錯誤");
    } finally {
      setEmailSending(false);
    }
  }

  if (!settings) return null;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-5 pb-16 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold">設定</h1>
        <Link href="/" className="-m-2 p-2 text-[15px] text-muted">
          完成
        </Link>
      </div>

      <section className="flex flex-col gap-3 border-t border-divider pt-5">
        <span className="text-[13px] font-medium">隱私鎖</span>
        {!settings.pinEnabled ? (
          <div className="flex flex-col gap-2">
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="設定 PIN（至少 4 碼）"
              className="rounded-xl border border-divider bg-transparent p-3 text-[14px] focus:outline-none"
            />
            <input
              type="password"
              inputMode="numeric"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value)}
              placeholder="再輸入一次"
              className="rounded-xl border border-divider bg-transparent p-3 text-[14px] focus:outline-none"
            />
            {pinError && <span className="text-[12px] text-[var(--danger)]">{pinError}</span>}
            <button
              onClick={enablePin}
              className="self-start rounded-lg bg-foreground px-4 py-2 text-[13px] text-background"
            >
              啟用 PIN 鎖
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-muted">PIN 鎖已啟用</span>
            {biometricAvailable && (
              <button
                onClick={biometricRegistered ? undefined : enableBiometric}
                disabled={biometricRegistered}
                className="self-start rounded-lg border border-divider px-4 py-2 text-[13px] disabled:opacity-60"
              >
                {biometricRegistered ? "已啟用 Face ID / Touch ID" : "啟用 Face ID / Touch ID"}
              </button>
            )}
            {!biometricAvailable && (
              <span className="text-[12px] text-muted">
                此裝置或瀏覽器不支援 Face ID / Touch ID，僅能使用 PIN。
              </span>
            )}
            <button onClick={disablePin} className="self-start text-[13px] text-[var(--danger)]">
              關閉隱私鎖
            </button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-divider pt-5">
        <span className="text-[13px] font-medium">資料管理</span>
        <button onClick={handleExport} className="self-start rounded-lg border border-divider px-4 py-2 text-[13px]">
          匯出資料
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="self-start rounded-lg border border-divider px-4 py-2 text-[13px]"
        >
          匯入資料
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
        <Link href="/report" className="self-start rounded-lg border border-divider px-4 py-2 text-[13px]">
          匯出紀錄（醫師報告）
        </Link>
        <button onClick={handleClear} className="self-start text-[13px] text-[var(--danger)]">
          清除所有資料
        </button>
      </section>

      <section className="flex flex-col gap-3 border-t border-divider pt-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium">每日提醒 Email</span>
          <button
            onClick={toggleReminder}
            role="switch"
            aria-checked={settings.reminderEnabled}
            className="relative h-6 w-10 rounded-full transition-colors"
            style={{ background: settings.reminderEnabled ? "var(--foreground)" : "var(--divider)" }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform"
              style={{ transform: settings.reminderEnabled ? "translateX(18px)" : "translateX(2px)" }}
            />
          </button>
        </div>
        <p className="text-[12px] leading-relaxed text-muted">
          提醒時間固定為每天 22:00（台北時間），內容只有「記錄一下今天」與按鈕，不包含情緒、吃藥狀態或日記內容。
        </p>
        {!settings.reminderEnabled && (
          <p className="text-[12px] leading-relaxed text-muted">
            這個開關只記錄在這台裝置上的偏好；實際寄信是由 Vercel 排程觸發、沒有辦法讀取裝置上的設定，關閉這裡不會真的停止寄信。要真正停止，需要到 Vercel 專案移除
            <code className="mx-1 rounded bg-divider px-1">vercel.json</code>
            的 cron 設定，或移除 <code className="mx-1 rounded bg-divider px-1">RESEND_API_KEY</code>。
          </p>
        )}
        <button
          onClick={sendTestEmail}
          disabled={emailSending}
          className="self-start rounded-lg border border-divider px-4 py-2 text-[13px] disabled:opacity-50"
        >
          {emailSending ? "寄送中…" : "寄送測試 Email"}
        </button>
        {emailStatus && <span className="text-[12px] text-muted">{emailStatus}</span>}
      </section>

      <section className="flex flex-col gap-2 border-t border-divider pt-5 text-[12px] leading-relaxed text-muted">
        <span className="text-[13px] font-medium text-foreground">素材授權</span>
        <p>
          貓咪與植物像素素材來自 Last Tick（
          <a href="https://last-tick.itch.io" className="underline" target="_blank" rel="noreferrer">
            last-tick.itch.io
          </a>
          ）的「32x32 Pixel Kittens Cats」與「Pixel Interiors 32x32」免費版，依作者授權允許個人與商業用途使用，並依作者要求標示創作者為 Last Tick。
        </p>
      </section>
    </main>
  );
}

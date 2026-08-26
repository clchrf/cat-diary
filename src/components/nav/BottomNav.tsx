"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

const TABS = [
  { href: "/", label: "首頁", icon: "🐱" },
  { href: "/status", label: "狀況", icon: "📊" },
  { href: "/review", label: "回顧", icon: "📖" },
];

export function BottomNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);

  // iOS home-screen PWA (WKWebView standalone mode) is documented to
  // sometimes report env(safe-area-inset-bottom) as stale/incorrect on the
  // very first layout pass — before the WebView's own chrome has finished
  // settling — and silently self-corrects the moment ANY reflow happens,
  // which is why a single tap anywhere "fixes" it. That means the nav's
  // height/position math (all pure CSS, no JS measurement) is correct; the
  // browser just hasn't applied it yet on that first paint. Forcing one
  // reflow ourselves right after mount reproduces the same self-correction
  // programmatically, so the fix lands before the user ever has to touch
  // the screen instead of relying on them accidentally triggering it.
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (navRef.current) void navRef.current.offsetHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <nav
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-divider bg-background safe-bottom"
      style={{ height: "calc(var(--bottom-nav-height) + var(--safe-bottom))" }}
    >
      <div className="mx-auto flex max-w-md" style={{ height: "var(--bottom-nav-height)" }}>
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-center"
            >
              <span className="text-[20px] leading-none" style={{ opacity: active ? 1 : 0.55 }}>
                {tab.icon}
              </span>
              <span
                className="text-[11px]"
                style={{
                  color: active ? "var(--foreground)" : "var(--muted)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

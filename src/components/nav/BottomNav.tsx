"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "首頁", icon: "🐱" },
  { href: "/status", label: "狀況", icon: "📊" },
  { href: "/room", label: "房間", icon: "🛋️" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-divider bg-background/95 backdrop-blur safe-bottom z-40">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-center"
              style={{ minHeight: 52 }}
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

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/nav/BottomNav";
import { LockGate } from "@/components/lock/LockGate";

export const metadata: Metadata = {
  title: "電子貓日記",
  description: "極簡的個人情緒與生活紀錄工具，裡面住著一隻電子貓。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "電子貓日記",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
  other: {
    // Older iOS Safari versions only honor the legacy apple- prefixed tag;
    // Next 16 only emits the standards-track "mobile-web-app-capable" one.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-TW" className="h-full antialiased">
      <body className="min-h-dvh">
        <LockGate>
          {/*
            The nav is `position: fixed` (see BottomNav.tsx) and sized only
            by its own content + safe area — never by viewport height — so
            it can't be stretched or shifted by page content. The body
            itself is the scroll container (standard document flow, no
            nested vh/dvh-based scroll box) and this bottom padding is the
            single place that reserves exactly the fixed nav's own height
            so content never ends up hidden underneath it.
          */}
          <div
            className="safe-top"
            style={{ paddingBottom: "calc(var(--bottom-nav-height) + var(--safe-bottom))" }}
          >
            {children}
          </div>
          <BottomNav />
        </LockGate>
      </body>
    </html>
  );
}

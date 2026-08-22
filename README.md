# 電子貓日記

一個極簡的個人情緒與生活紀錄 PWA，裡面住著一隻電子貓。不是醫療 App、不是心理諮商 App、不是任務管理 App——核心只有一件事：**隨時把正在發生的事情記下來，慢慢看見自己的情緒、第一反應與處理方式。** 電子貓只是陪伴與輕量遊戲化元素。

Mobile-first：主要使用裝置是 iPhone Safari / iPhone PWA，Desktop 只是「可以用」。

## 使用技術

- [Next.js](https://nextjs.org/)（App Router）+ TypeScript + Tailwind CSS
- IndexedDB（`idb`）做為唯一本機資料儲存，不使用 localStorage 存音檔
- MediaRecorder API 錄音
- Anthropic Claude API（文字整理／情緒分析／趨勢觀察）
- OpenAI Whisper API（語音轉文字）
- Resend（每日提醒 Email）+ Vercel Cron
- PWA（manifest、iOS safe-area、可加入主畫面）
- WebAuthn（Face ID / Touch ID，若裝置支援）+ PIN 作為隱私鎖

## 功能列表

- **首頁**：只有貓、[📝 記錄今天]、[💊 記錄吃藥]，以及極小的「今日 N 筆 🥫 N」
- **記錄今天**：一天可建立無限筆，六個欄位（發生的事／第一反應／實際情緒／想做什麼／表現出來的心態／最後怎麼處理）全部非必填，文字或錄音皆可
- **語音日記**：MediaRecorder 錄音、原始音檔永久保留、Whisper 轉文字後可編輯 transcript（不影響原始音檔）
- **事件詳情**：AI 整理（需明確同意才送出）、使用者可確認/不符合 AI 判斷的情緒、「現在回頭看」（當下 vs 事後）、「預期 vs 實際」
- **2 分鐘陪伴**：計時器與錄音完全獨立，不說話也能完成，完成 🥫+1、沒有懲罰機制
- **狀況頁**：今天/7天/30天、情緒分布、最近的我、常見觸發情境、需要留意、AI 趨勢整理
- **匯出紀錄（醫師報告）**：可選 7天/30天/自訂區間，內容為情緒分布、需要留意、文字轉錄、選擇性語音索引（不含原始錄音檔），用瀏覽器「列印/另存 PDF」輸出
- **房間 + 家具商店**：拖曳擺放家具（支援觸控），🥫 罐頭是房間裝飾貨幣，不是食物，不會因漏記而被扣
- **吃藥紀錄**：單純的今日已吃/未吃切換，不含劑量、不做藥物建議
- **隱私鎖**：PIN（SHA-256 本機雜湊）+ 若裝置支援可加開 Face ID / Touch ID
- **資料管理**：匯出/匯入 JSON（含音檔）、清除所有資料
- **每日提醒 Email**：每天 22:00（台北時間）提醒「記錄一下今天」，不含情緒/吃藥/日記內容

## 本機開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000。建置與檢查：

```bash
npx tsc --noEmit
npx eslint src
npm run build
```

## Environment Variables

複製 `.env.example` 為 `.env.local`：

```bash
cp .env.example .env.local
```

`.env.local` 已加入 `.gitignore`，不會被 commit。未設定對應金鑰時，該功能會在介面顯示「尚未設定」，不會假裝成功。

| 變數 | 用途 |
| --- | --- |
| `ANTHROPIC_API_KEY` | AI 情緒整理／趨勢分析 |
| `OPENAI_API_KEY` | 語音轉文字（Whisper） |
| `RESEND_API_KEY` | 每日提醒信 |
| `RESEND_FROM_EMAIL` | 寄件地址（未驗證網域時用 `onboarding@resend.dev`） |
| `REMINDER_EMAIL_TO` | 覆寫提醒信收件人 |
| `APP_URL` | 提醒信中「記錄今天」按鈕連結的網域 |
| `CRON_SECRET` | 保護 `/api/email/send` 不被任意觸發 |

### AI / Speech-to-Text 設定

1. 到 https://console.anthropic.com/ 建立 `ANTHROPIC_API_KEY`，用於 `/api/analyze/event` 與 `/api/analyze/trend`。
2. 到 https://platform.openai.com/ 建立 `OPENAI_API_KEY`，用於 `/api/stt`（Whisper）。
3. 兩者皆為 server-side 呼叫，金鑰不會出現在前端程式碼或瀏覽器網路請求中。
4. 送出內容給 AI 前，介面一律先顯示「這段內容將送至 AI 服務進行分析」的同意提示。

### Email Reminder 設定

1. 到 https://resend.com/ 建立帳號與 `RESEND_API_KEY`。
2. 設定 `RESEND_FROM_EMAIL`（建議驗證自己的網域；測試階段可用 Resend 提供的 `onboarding@resend.dev`，但只能寄到你自己 Resend 帳號的信箱）。
3. 部署到 Vercel 後，`vercel.json` 內建的 Cron 會在每天 14:00 UTC（= 22:00 Asia/Taipei，台灣不使用日光節約時間，全年固定）呼叫 `/api/email/send`。
4. 在 Vercel 專案設定 `CRON_SECRET`，Vercel Cron 會自動帶上相同的值，避免路由被任意觸發、重複寄送。
5. 「設定」頁面有「寄送測試 Email」按鈕，可獨立於每日排程手動測試。

## PWA 使用方式

1. 用 iPhone Safari 開啟部署後的網址。
2. 點擊「分享」→「加入主畫面」。
3. 從主畫面圖示開啟，會以全螢幕 standalone 模式顯示（沒有網址列），並正確處理 Safe Area / Dynamic Island / Home Indicator。

## 素材來源與授權

貓咪與房間植物像素素材皆來自 [Last Tick](https://last-tick.itch.io)：

- **32x32 Pixel Kittens Cats - Animated NPC**（免費版：gray / white / ginger 三色，全動畫）
- **Pixel Interiors 32x32**（免費版：plants.zip）

授權允許個人與商業用途使用於作品中，禁止單獨轉售或重新散布素材本身；已依作者要求在「設定」頁面標示創作者為 Last Tick。原始下載檔與授權文字保留於 [`assets-raw/`](assets-raw)。

房間家具目前僅有植物（免費版素材涵蓋範圍）。床、沙發、桌子、櫃子、書架、地毯、窗簾等家具屬於同作者的付費「Room pack.zip」（$3 起，name-your-own-price），需另外購買並提供素材檔案後才能加入商店，詳見 [`src/lib/furniture.ts`](src/lib/furniture.ts) 內的註解。

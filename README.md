# 電子貓日記

一個極簡的個人情緒與生活紀錄 PWA，裡面住著一隻電子貓。不是醫療 App、不是心理諮商 App、不是任務管理 App——核心只有一件事：**隨時把正在發生的事情記下來，慢慢看見自己的情緒、第一反應與處理方式。** 電子貓只是陪伴與輕量遊戲化元素。

Mobile-first：主要使用裝置是 iPhone Safari / iPhone PWA，Desktop 只是「可以用」。

## 使用技術

- [Next.js](https://nextjs.org/)（App Router）+ TypeScript + Tailwind CSS
- IndexedDB（`idb`）做為唯一本機資料儲存，不使用 localStorage 存音檔
- MediaRecorder API 錄音、Pointer Events 拖曳（家具與貓咪，觸控/滑鼠通用）
- Google Gemini API（免費額度，語音轉文字，唯一會呼叫外部服務的功能）
- Resend（每日提醒 Email）+ Vercel Cron
- PWA（manifest、iOS safe-area、可加入主畫面）
- WebAuthn（Face ID / Touch ID，若裝置支援）+ PIN 作為隱私鎖

沒有使用任何雲端 AI 分析服務——「AI 幫忙」是本機組字生成的 Prompt，你自己複製貼到平常用的 AI；情緒/事件的整理歸類也都是本地的規則邏輯，不呼叫外部 API、不需要金鑰。

## 功能列表

- **首頁**：只有貓、[📝 記錄今天]、[💊 記錄吃藥]，以及極小的「今日 N 筆 🥫 N」
- **記錄今天**：先選 🎙️錄音 或 ✏️文字記錄；錄音是單一入口（綁定「發生了什麼事」），錄完手動按「轉換成文字」才轉錄，原始音檔永久保留；其餘 5 個欄位（第一反應／實際情緒／想做什麼／表現出來的心態／最後怎麼處理）都是純文字、全部非必填。一天可建立無限筆
- **事件詳情**：「現在回頭看」（當下 vs 事後）、「預期 vs 實際」；不會自動跳出任何分析或建議——存檔就是完成
- **需要 AI 幫忙？**：次要功能，需要使用者主動點「整理成 Prompt」，把這筆（或這個月／過去 30 天）紀錄組成一段可以直接複製貼到 ChatGPT / Claude 等你平常用的 AI 的文字；App 本身不呼叫任何 AI、不評價、不給建議
- **2 分鐘陪伴**：計時器與錄音完全獨立，不說話也能完成，完成 🥫+1、沒有懲罰機制
- **狀況頁**：月曆為主視圖（可切換月份），每格顯示當日整體心情與吃藥狀態；點日期看當天詳情、可手動修改當日整體心情（一旦手動設定就不會被自動計算覆蓋）；下面是本月摘要、最近的我（過去 30 天）、需要留意
- **需要留意**：本地關鍵字安全網（非 AI），偵測到高風險字詞才會安靜標示，不會彈窗、不做診斷
- **匯出紀錄（醫師報告）**：可選 7天/30天/自訂區間，內容為情緒分布、需要留意、文字轉錄、選擇性語音索引（不含原始錄音檔），用瀏覽器「列印/另存 PDF」輸出
- **房間 + 家具商店**：家具與貓咪都可以用手指/滑鼠拖曳（8px 內視為點擊，觸發互動動畫），貓咪位置與家具擺放皆持久保存；🥫 罐頭是房間裝飾貨幣，不是食物，不會因漏記而被扣
- **吃藥紀錄**：單純的今日已吃/未吃切換，不含劑量、不做藥物建議；沒有記錄的日子一律顯示「尚未記錄」，不會顯示「沒吃」
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
| `GEMINI_API_KEY` | 語音轉文字（Google Gemini 免費額度）——這是整個 App 唯一需要的 AI 相關金鑰 |
| `RESEND_API_KEY` | 每日提醒信 |
| `RESEND_FROM_EMAIL` | 寄件地址（未驗證網域時用 `onboarding@resend.dev`） |
| `REMINDER_EMAIL_TO` | 覆寫提醒信收件人 |
| `APP_URL` | 提醒信中「記錄今天」按鈕連結的網域 |
| `CRON_SECRET` | 保護 `/api/email/send` 不被任意觸發 |

### Speech-to-Text 設定

1. 到 https://aistudio.google.com/apikey 免費建立 `GEMINI_API_KEY`（Google 帳號登入即可，免信用卡），用於 `/api/stt`，這是唯一會把使用者內容送到外部服務的功能，且只有在使用者主動按下「轉換成文字」時才會送出。
2. 金鑰是 server-side 呼叫，不會出現在前端程式碼或瀏覽器網路請求中。
3. 未設定金鑰時，錄音跟播放仍正常運作，只是不會自動產生文字，使用者可以自己手動輸入。

### AI 的定位

這個 App 刻意不內建任何「AI 分析你」的功能——不會在存檔後跳出分析、評價或建議。情緒分布、每日整體心情、常見情境這些都是 [`src/lib/stats.ts`](src/lib/stats.ts) 跟 [`src/lib/safetyCheck.ts`](src/lib/safetyCheck.ts) 裡的本地規則邏輯（例如「主要情緒」就是統計使用者自己標記的情緒次數，不是用猜的）。

唯一跟 AI 有關的功能是「整理成 Prompt」（事件詳情頁、狀況頁）：[`src/lib/aiPrompt.ts`](src/lib/aiPrompt.ts) 把使用者自己的紀錄組成一段文字，使用者按複製後自行貼到 ChatGPT / Claude 等平常用的 AI——App 本身完全不呼叫任何文字分析 API，這段文字在按下複製之前不會離開裝置。

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

- **64x64 FREE Pixel Cats animated NPC**（免費版：black / ginger / white 三色，全動畫）
- **Pixel Interiors 32x32**（免費版：plants.zip）

授權允許個人與商業用途使用於作品中，禁止單獨轉售或重新散布素材本身；已依作者要求在「設定」頁面標示創作者為 Last Tick。原始下載檔與授權文字保留於 [`assets-raw/`](assets-raw)。

房間家具目前僅有植物（免費版素材涵蓋範圍）。床、沙發、桌子、櫃子、書架、地毯、窗簾等家具屬於同作者的付費「Room pack.zip」（$3 起，name-your-own-price），需另外購買並提供素材檔案後才能加入商店，詳見 [`src/lib/furniture.ts`](src/lib/furniture.ts) 內的註解。

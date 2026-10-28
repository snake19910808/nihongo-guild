# CLAUDE.md — 冒險者公會・日語之旅 (Nihongo Guild) 專案交接與最高指導守則

> **交接時間**：2026-10-29  
> **當前版本**：`v2.0.2`（Git Commit: `ccbd550`，已同步推送至 `origin/main`）  
> **正式站點**：https://snake19910808.github.io/nihongo-guild/  
> **核心企劃活文件**：請務必先閱讀根目錄的 [`PLAN.md`](./PLAN.md)

---

## 1. 使用者溝通與開發最高守則（必須 100% 遵守）

1. **白話親切、容易理解**：
   - 解釋概念時，以「15–18 歲高中生」或非技術背景也能輕鬆聽懂的方式表達。
   - 多用日常生活事物打比方（如：餐廳點餐、外送、便利貼、抽屜分類），避免生硬學術黑話。
   - 遇到英文專有名詞（如 API、Props、State、Git、Token、HTTP 429 等）保留英文原文，並順帶用一句大白話解釋它的用途。
   - 省略無意義的客套開場白（如「好的！沒問題！」），直接講重點。
2. **語言偏好**：
   - 一律使用**台灣正體中文**，嚴格禁止中國大陸用語（如：程式碼❌代碼、軟體❌軟件、預設❌默認、專案❌項目、函式❌函數、品質❌質量）。
3. **任務企劃與進度追蹤**：
   - 大任務先規劃後動工，與使用者確認方向後再執行。
   - 持續維護單一計畫活文件 [`PLAN.md`](./PLAN.md)，工作流遵循「**規劃 ➔ 執行 ➔ 檢測 ➔ 紀錄**」迴圈，並在文末更新 Changelog。
4. **程式碼修改守則**：
   - **動手前報備**：修改前必須明確列出預計更動的檔案與函式。
   - **範圍嚴格控制**：嚴格只動使用者要求的部分，嚴禁順手重構、改名或刪除現有註解。
   - **改後說明與具體驗證**：修改完成後，提供「照著做就能測」的具體步驟（按哪裡、輸入什麼、會看到/聽到什麼）。
5. **偵錯與環境規範**：
   - **先查根因再動手**：遇到問題先分析根本原因並用白話說明，嚴禁盲猜亂試；自動嘗試上限為 3 次。
   - **Windows PowerShell 環境**：本機為 Windows，執行終端機指令請使用 PowerShell 相容語法（用 `;` 取代 `&&`，勿用 Linux 專屬語法）。

---

## 2. 絕對不可違反的三大安全鐵則（Guardrails）

1. 🚫 **嚴禁觸碰舊倉庫**：使用者 GitHub 帳號下的 `snake19910808/japanese-study` 與其他舊倉庫**分毫不可修改、覆寫或刪除**。
2. 🔒 **版權教材隔離**：
   - 本機目錄內的 `大家學標準日本語_初級本/`、`大家的日本語_初級I/`、`lesson_vedio/*.mp4` 均受版權保護，已寫入 `.gitignore`，**絕對禁止 git add 或推送至 GitHub**。
3. 🔑 **機密安全保護**：
   - `.env`（內含 `GEMINI_API_KEY`）僅供本機測試腳本讀取，嚴禁上傳至 GitHub，亦嚴禁將任何 API Key 或 GitHub PAT 寫死在前端程式碼中。

---

## 3. 專案架構與核心模組現況（v2.0.2）

### 3.1 倉庫與伺服器架構
- **工作目錄**：`c:\Users\s0987\Desktop\Nihongo_Benkyo`
- **公開程式庫**：`https://github.com/snake19910808/nihongo-guild.git`（分支：`main`）
- **私人存檔庫**：`snake19910808/nihongo-save`（由前端透過 GitHub REST API 備份與還原 `save.json`）
- **本機開發伺服器**：執行 `node server.js`（預設監聽 `http://localhost:8000`）
- **PWA Service Worker**：[`sw.js`](./sw.js)，目前快取版本為 `nihongo-guild-v22`（**重要：每次修改前端 JS/CSS/HTML 後，請務必將 `CACHE_NAME` 版本號 +1，否則瀏覽器會讀到舊快取**）。

### 3.2 檔案結構與職責對照表
| 檔案路徑 | 核心職責與目前狀態 |
|---|---|
| [`index.html`](./index.html) / [`css/style.css`](./css/style.css) | 響應式介面：五大分頁（🏰 公會大廳、⚔️ 討伐戰鬥、🧠 記憶神殿、📖 冒險圖鑑、☕ 詩織櫃台）與所有互動彈窗。 |
| [`js/app.js`](./js/app.js) | 主控制器、398 天課表切換、六大日常委託任務、圖鑑收集率統計、設定面板與試聽按鈕綁定。 |
| [`js/furigana.js`](./js/furigana.js) | **假名注音與詩織語音引擎（極重要）**：<br>1. 支援三段注音切換（🟢全標 / 🟡智慧 / 🔴隱藏）與點詞查字。<br>2. **預設鎖定 `voicevoxSpeakerId: 15`（💖 九州そら・あまあま / 溫柔撒嬌女僕音）**。<br>3. 公會大廳 8 句問候與 1 句設定試聽已預錄為本地 MP3（`assets/audio/greeting_1~8.mp3`, `greeting_test.mp3`），透過 `localAudioMap` 0 秒離線秒播。<br>4. 動態句子呼叫 `api.tts.quest/v3/voicevox/synthesis?speaker=15`（含記憶體快取 `dynamicAudioCache` 與 HTTP 429 自動等待重試），若網路失敗才降級至瀏覽器 Web Speech API（`pitch: 1.38`）。 |
| [`js/shiori_ai.js`](./js/shiori_ai.js) | 詩織 AI 導師聊天與每日造句批改。內建三層模型自動故障轉移（Failover）：<br>🥇 主力：`gemini-3.5-flash-lite`（15 RPM / 500 RPD）<br>🥈 第一備用：`gemini-3.1-flash-lite`（15 RPM / 500 RPD）<br>🥉 海量備用：`gemma-4-26b-a4b-it`（30 RPM / 14,400 RPD） |
| [`js/battle.js`](./js/battle.js) / [`js/battle_fx.js`](./js/battle_fx.js) | 《歧路旅人（Octopath Traveler）》風格橫向戰鬥舞台、頂部行動順序軸（Timeline）、弱點方塊破防（Weakness & Break 200% 暴擊）、Canvas 斬擊特效與飄字、Web Audio 純音效合成器。 |
| [`js/avatar.js`](./js/avatar.js) | 冒險者紙娃娃創角系統（自訂姓名、性別、4 款髮型、7 款髮色、眼睛、膚色、4 大職業服裝），Canvas 像素精靈即時繪製。 |
| [`js/speech_eval.js`](./js/speech_eval.js) | **「說」模組**：Web Speech API 語音辨識 + 羅馬拼音/音素編輯距離比對，提供 0～100 發音語感評分與嘴型修正建議。 |
| [`js/handwriting.js`](./js/handwriting.js) | **「寫」模組**：五十音與漢字九宮格米字手寫板、半透明紅字描紅導引、筆墨覆蓋率與重心平衡自動評分。 |
| [`js/listening_reading.js`](./js/listening_reading.js) | **「聽・讀」模組**：情境聽解、0.8x/1.0x 語速調節、聽寫挖空填空（Dictation）、公會村民委託信短文閱讀理解測驗。 |
| [`js/srs.js`](./js/srs.js) | SM-2 間隔重複演算法，預設「🎯 今日特訓模式」自動抽取當日課表 5～15 張精選卡無痛打卡。 |
| [`js/sync.js`](./js/sync.js) | LocalStorage 本地存檔與 GitHub 私人倉庫同步。`defaultSettings.voiceStyle` 已強制設為 `15`。 |
| `data/*.json` | `kana.json` (104)、`kanji.json` (640)、`vocab.json` (2,963)、`grammar.json` (364)、`schedule_398days.json` (398 天課表)、`monsters.json` (52 款魔物：40 小怪 + 8 小 Boss + 4 守門魔王)。 |

---

## 4. 重要背景脈絡（必讀避坑指南）

1. **關於「詩織的聲音」**：
   - 使用者**唯一指定且最愛**的聲音是 **「💖 九州そら・甜美撒嬌軟妹（VOICEVOX あまあま / 溫柔撒嬌女僕音，Speaker ID = `15`）」**。
   - 使用者**非常討厭電腦內建的機械合成音（Web Speech API）**，覺得聽起來像機械音或老阿姨。
   - **為什麼先前其他選項會變機械音？** 因為免費線上 API (`api.tts.quest`) 有嚴格的頻率限制（HTTP 429，連續點擊需間隔約 4 秒），一旦撞到 429 觸發 `.catch()` 就會降級回瀏覽器內建機械音。
   - **目前解法與後續擴充建議**：我們已將公會大廳 9 句話預錄為實體 MP3（`assets/audio/`）。若使用者希望「五十音發音」、「戰鬥題目」或「聊天室」也 100% 永不降級成機械音，建議可：
     - 方案 A：寫腳本透過 `tts.quest`（每筆間隔 4.5 秒）批次預錄 104 個五十音 MP3 存入 `assets/audio/kana/`。
     - 方案 B：若使用者在電腦端安裝免費開源的本機版 VOICEVOX 軟體（預設執行於 `http://127.0.0.1:50021`），前端可優先直連本機 VOICEVOX Engine，即可無限次、0 延遲、無 429 限制地合成任何句子！

2. **關於「詩織的立繪衣著」**：
   - 立繪位於 `assets/shiori_normal.jpg`、`shiori_happy.jpg`、`shiori_shy.jpg`。
   - 使用者要求的風格為「異世界動漫風、優雅性感平口露肩禮服、展現鎖骨與上胸乳溝線條，但**絕對不露點**」。目前已重新生成並套用完成，請勿隨意覆蓋。

---

## 5. 目前待辦與交接後下一步（Next Actions）

- [ ] **1. 確認使用者對 v2.0.2「溫柔撒嬌女僕音」與整體系統的實機測試回饋**。
- [ ] **2. 根據使用者測試後的具體意見**（例如：討伐戰鬥手感、紙娃娃外觀、聽說讀寫四維度工具、或是五十音離線女僕音檔擴充），遵循「先報備 ➔ 修改 ➔ 遞增 `sw.js` 快取版本 ➔ 推送 GitHub ➔ 提供測試步驟」的標準流程迭代。

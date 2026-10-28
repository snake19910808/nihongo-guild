/**
 * app.js - 冒險者公會日語之旅 (Nihongo Guild) 核心主控制器
 */

const App = {
  data: {
    kana: [],
    kanji: [],
    vocab: [],
    grammar: [],
    schedule: []
  },

  settings: {},
  saveData: {},
  currentDayIndex: 1, // 1 ~ 399

  async init() {
    console.log("🌸 Nihongo Guild 冒險者公會日語系統啟動中...");
    
    // 1. 讀取設定與存檔
    this.settings = window.SyncManager.loadSettings();
    this.saveData = window.SyncManager.loadLocalSave();
    this.currentDayIndex = this.saveData.progress.currentDay || 1;

    // 自動嘗試向本地伺服器讀取 .env 中的 API Key (本機啟動時自動免手動填入)
    if (!this.settings.geminiApiKey) {
      try {
        const envRes = await fetch("/api/env-config");
        if (envRes.ok) {
          const envData = await envRes.json();
          if (envData.geminiApiKey) {
            this.settings.geminiApiKey = envData.geminiApiKey;
            this.settings.geminiModel = this.settings.geminiModel || "gemini-3.5-flash-lite";
            window.SyncManager.saveSettings(this.settings);
            console.log("🔑 已自本地 .env 自動載入 GEMINI_API_KEY！");
          }
        }
      } catch (e) {
        // 在 GitHub Pages 靜態環境上屬正常行為
      }
    }

    // 2. 載入 6 大資料集（含魔物生態庫）
    try {
      const [kanaRes, kanjiRes, vocabRes, grammarRes, schedRes, monstersRes] = await Promise.all([
        fetch("data/kana.json"),
        fetch("data/kanji.json"),
        fetch("data/vocab.json"),
        fetch("data/grammar.json"),
        fetch("data/schedule_398days.json"),
        fetch("data/monsters.json")
      ]);

      this.data.kana = await kanaRes.json();
      this.data.kanji = await kanjiRes.json();
      this.data.vocab = await vocabRes.json();
      this.data.grammar = await grammarRes.json();
      this.data.schedule = await schedRes.json();
      this.data.monsters = await monstersRes.json();
      console.log("✅ 所有課程、題庫與 52 款魔物生態庫載入完成！");
    } catch (e) {
      console.error("載入資料集失敗：", e);
      this.showToast(`資料庫載入異常 (${e.name}: ${e.message})，請確認伺服器連線或重整頁面`, "error");
    }

    // 3. 初始化模組
    if (window.AvatarManager) {
      window.AvatarManager.init();
    }

    if (window.SpeechEvaluator) {
      window.SpeechEvaluator.init();
    }

    if (window.ListeningReadingModule) {
      window.ListeningReadingModule.init();
    }

    if (window.FuriganaEngine) {
      window.FuriganaEngine.init(
        this.saveData.progress.furiganaMode || "all",
        this.saveData.progress.masteredKanji || []
      );
    }

    if (window.SRSManager) {
      const todaySched = (this.data.schedule || []).find((s) => s.day === this.currentDayIndex);
      window.SRSManager.init(
        this.data.vocab,
        this.data.kanji,
        this.data.kana,
        this.saveData.srs?.cards || {},
        todaySched
      );
    }

    if (window.BattleManager) {
      window.BattleManager.init({
        kana: this.data.kana,
        vocab: this.data.vocab,
        kanji: this.data.kanji,
        grammar: this.data.grammar,
        monsters: this.data.monsters
      });
    }

    // 4. 綁定全域 UI 事件
    this.bindNavigation();
    this.bindFuriganaToggle();
    this.bindGuildHallControls();
    this.bindChatEvents();
    this.bindCompendium();
    this.bindSettings();
    this.bindModal();

    // 5. 渲染各介面初始狀態
    this.updatePlayerHeader();
    this.renderTodayQuest(this.currentDayIndex);
    this.renderSrsCard();
    this.renderCompendium();
    this.fillSettingsForm();

    // 6. 詩織迎賓問候
    this.greetPlayer();

    // 7. 註冊 Service Worker
    this.registerServiceWorker();
  },

  /**
   * 註冊 PWA Service Worker
   */
  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => console.log("Service Worker 註冊成功，範圍：", reg.scope))
        .catch((err) => console.warn("Service Worker 註冊失敗：", err));
    }
  },

  /**
   * 切換分頁 (提供程式化呼叫)
   */
  switchTab(tabId) {
    const fullId = tabId.startsWith("tab-") ? tabId : "tab-" + tabId;
    const tabBtn = document.querySelector(`.nav-tab[data-tab="${fullId}"]`);
    if (tabBtn) {
      tabBtn.click();
    }
  },

  /**
   * 導覽分頁切換
   */
  bindNavigation() {
    const navTabs = document.querySelectorAll(".nav-tab");
    navTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetId = tab.getAttribute("data-tab");
        navTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const panes = document.querySelectorAll(".tab-pane");
        panes.forEach((p) => p.classList.remove("active"));
        const activePane = document.getElementById(targetId);
        if (activePane) activePane.classList.add("active");

        // 若切換到戰鬥分頁，啟動當前戰區魔物並重繪畫布
        if (targetId === "tab-battle") {
          if (window.BattleManager) {
            if (!window.BattleManager.currentZone) {
              window.BattleManager.startZone("kana");
            } else {
              window.BattleManager.renderPlayerAvatar();
            }
          }
          if (window.BattleFX) {
            window.BattleFX.resizeCanvas();
          }
        }

        // 若切換到大廳，更新角色頭像
        if (targetId === "tab-hall") {
          if (window.AvatarManager) {
            window.AvatarManager.renderAllPreviews();
          }
        }

        // 若切換到圖鑑，刷新收集率與卡片
        if (targetId === "tab-compendium") {
          this.updateCompendiumStats();
          const activeTab = document.querySelector(".c-tab.active");
          const cat = activeTab ? activeTab.getAttribute("data-category") : "all";
          this.renderCompendium(cat);
        }

        // 若切換到 SRS，重新渲染卡片
        if (targetId === "tab-srs") {
          this.renderSrsCard();
        }
      });
    });
  },

  /**
   * 假名注音切換開關 (🟢 全部 / 🟡 智慧 / 🔴 隱藏)
   */
  bindFuriganaToggle() {
    const furiBtns = document.querySelectorAll(".furi-btn");
    furiBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode");
        furiBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        if (window.FuriganaEngine) {
          window.FuriganaEngine.setMode(mode);
        }
        this.saveData.progress.furiganaMode = mode;
        this.saveProgress();
      });
    });

    // 設置初始 active 按鈕
    const curMode = this.saveData.progress.furiganaMode || "all";
    const curBtn = document.querySelector(`.furi-btn[data-mode="${curMode}"]`);
    if (curBtn) {
      furiBtns.forEach((b) => b.classList.remove("active"));
      curBtn.classList.add("active");
    }
  },

  /**
   * 更新頂部玩家數值
   */
  updatePlayerHeader() {
    const p = this.saveData.player;
    const lvlEl = document.getElementById("playerLevel");
    const expText = document.getElementById("playerExpText");
    const expFill = document.getElementById("playerExpFill");
    const goldEl = document.getElementById("playerGold");
    const streakEl = document.getElementById("playerStreak");
    const affTrack = document.getElementById("shioriAffectionFill");
    const affText = document.getElementById("shioriAffectionText");

    if (lvlEl) lvlEl.textContent = `Lv.${p.level}`;
    if (goldEl) goldEl.textContent = `${p.gold} G`;
    if (streakEl) streakEl.textContent = `${p.streakDays} 天`;

    const maxExp = p.level * 100;
    const expPct = Math.min(100, Math.round((p.exp / maxExp) * 100));
    if (expText) expText.textContent = `${p.exp} / ${maxExp} EXP`;
    if (expFill) expFill.style.width = `${expPct}%`;

    const affPct = Math.min(100, Math.round((p.shioriAffection / 100) * 100));
    if (affTrack) affTrack.style.width = `${affPct}%`;
    if (affText) affText.textContent = `好感度 Lv.${Math.floor(p.shioriAffection / 10)} (${p.shioriAffection}/100)`;
  },

  /**
   * 獎勵玩家經驗值、金幣、好感度
   */
  awardPlayer({ exp = 0, gold = 0, affection = 0 }) {
    const p = this.saveData.player;
    p.exp += exp;
    p.gold += gold;
    p.shioriAffection = Math.min(100, p.shioriAffection + affection);

    // 檢查升級
    let leveledUp = false;
    let maxExp = p.level * 100;
    while (p.exp >= maxExp) {
      p.exp -= maxExp;
      p.level += 1;
      maxExp = p.level * 100;
      leveledUp = true;
    }

    if (leveledUp) {
      this.showToast(`🎉 恭喜升級！你已晉升為 Lv.${p.level} 冒險者！`, "victory");
      if (window.ShioriAI) {
        window.ShioriAI.updatePortrait("happy");
      }
    }

    this.updatePlayerHeader();
    this.saveProgress();
  },

  currentGreeting: null,

  /**
   * 詩織大廳迎賓話語
   */
  greetPlayer(triggerVoice = false) {
    const bubbleZh = document.getElementById("shioriHallDialogueZh");
    const bubbleJa = document.getElementById("shioriHallDialogueJa");

    const greetings = [
      {
        ja: `冒険者[ぼうけんしゃ]さん、今日[きょう]も公会[こうかい]へようこそ！`,
        zh: `冒險者，今天也歡迎來到公會！今天的委託清單已經準備好了喔，一步一步踏實前進吧！`
      },
      {
        ja: `焦[あせ]らず、毎日[まいにち]少[すこ]しずつ続[つづ]けましょうね。`,
        zh: `學日文最重要的是持續不斷。只要每天花點時間，詩織保證你一年後一定能順利通過 N3！`
      },
      {
        ja: `今日[きょう]の目標[もくひょう]、一緒[いっしょ]にクリアしましょう！`,
        zh: `今天也要一起把六大任務打勾打滿喔！做完的話，晚上有特別的讚賞等著你呢～`
      },
      {
        ja: `頑張[がんば]っているあなたを、詩織[しおり]はずっと応援[おうえん]していますよ。`,
        zh: `看著你每天努力不懈的身影，詩織一直都在心裡為你默默加油喔！`
      },
      {
        ja: `疲[つか]れたら、いつでも公会[こうかい]でお茶[ちゃ]を飲[の]んで休[やす]んでくださいね。`,
        zh: `讀書累了的話，隨時來公會吧！我為你泡一杯香醇熱茶，放鬆一下再出發。`
      },
      {
        ja: `今日[きょう]も新[あたら]しい言葉[ことば]との出会[であ]い、楽[たの]しみですね！`,
        zh: `今天又會遇見哪些有趣的日文單字呢？光是想像就讓人期待呢！`
      },
      {
        ja: `一歩[いっぽ]一歩[いっぽ]の積[つ]み重[かさ]ねが、大[おお]きな力[ちから]になりますよ。`,
        zh: `不要小看每天累積的一小步，這都會變成你日後打倒強大考題的魔力喔！`
      },
      {
        ja: `質問[しつもん]があれば、いつでもカウンターで声[こえ]をかけてくださいね。`,
        zh: `如果有不懂的文法或單字，隨時點擊「☕ 前往櫃台聊天」，我會耐心為你解答的！`
      }
    ];

    let pick = greetings[Math.floor(Math.random() * greetings.length)];
    if (this.currentGreeting && greetings.length > 1) {
      while (pick.ja === this.currentGreeting.ja) {
        pick = greetings[Math.floor(Math.random() * greetings.length)];
      }
    }
    this.currentGreeting = pick;

    if (bubbleJa) {
      bubbleJa.innerHTML = window.FuriganaEngine ? window.FuriganaEngine.render(pick.ja) : pick.ja;
    }
    if (bubbleZh) {
      bubbleZh.textContent = pick.zh;
    }

    if (triggerVoice && window.FuriganaEngine) {
      window.FuriganaEngine.speak(pick.ja);
    }
  },

  /**
   * 公會大廳與課表控制項
   */
  bindGuildHallControls() {
    const prevBtn = document.getElementById("prevDayBtn");
    const nextBtn = document.getElementById("nextDayBtn");
    const jumpBtn = document.getElementById("jumpTodayBtn");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (this.currentDayIndex > 1) {
          this.currentDayIndex--;
          this.renderTodayQuest(this.currentDayIndex);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (this.currentDayIndex < this.data.schedule.length) {
          this.currentDayIndex++;
          this.renderTodayQuest(this.currentDayIndex);
        }
      });
    }

    if (jumpBtn) {
      jumpBtn.addEventListener("click", () => {
        this.currentDayIndex = this.saveData.progress.currentDay || 1;
        this.renderTodayQuest(this.currentDayIndex);
      });
    }

    // 1. 詩織打氣互動按鈕（更換問候 + 語音朗讀）
    const talkBtn = document.getElementById("hallTalkBtn");
    if (talkBtn) {
      talkBtn.addEventListener("click", () => {
        this.greetPlayer(true);
        if (window.ShioriAI) {
          window.ShioriAI.updatePortrait("happy");
          setTimeout(() => window.ShioriAI.updatePortrait("normal"), 3000);
        }
      });
    }

    // 2. 獨立日語語音朗讀按鈕
    const voiceBtn = document.getElementById("shioriHallVoiceBtn");
    if (voiceBtn) {
      voiceBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.currentGreeting && window.FuriganaEngine) {
          window.FuriganaEngine.speak(this.currentGreeting.ja);
        } else {
          this.greetPlayer(true);
        }
      });
    }

    // 3. 前往專屬櫃台聊天室按鈕
    const goChatBtn = document.getElementById("hallGoChatBtn");
    if (goChatBtn) {
      goChatBtn.addEventListener("click", () => {
        this.switchTab("tab-shiori");
      });
    }

    // 4. 點擊對話氣泡本體也可重播語音
    const bubbleEl = document.getElementById("shioriBubble");
    if (bubbleEl) {
      bubbleEl.addEventListener("click", (e) => {
        // 若點擊的是語音按鈕本身則不重複觸發
        if (e.target.closest("#shioriHallVoiceBtn")) return;
        if (this.currentGreeting && window.FuriganaEngine) {
          window.FuriganaEngine.speak(this.currentGreeting.ja);
        }
      });
    }
  },

  /**
   * 渲染指定天數的委託課表
   */
  renderTodayQuest(dayNum) {
    const targetDay = parseInt(dayNum) || 1;
    const sched = this.data.schedule.find((s) => parseInt(s.day) === targetDay) || this.data.schedule[0];
    if (!sched) return;

    // 標題與標籤
    const dayBadge = document.getElementById("questDayBadge");
    const chapBadge = document.getElementById("questChapterBadge");
    const questTitle = document.getElementById("questMainTitle");
    const dateText = document.getElementById("questDateText");

    if (dayBadge) dayBadge.textContent = `Day ${sched.day} / 399`;
    if (chapBadge) chapBadge.textContent = sched.chapterName || `第 ${sched.week} 週`;
    if (questTitle) questTitle.textContent = sched.title;
    if (dateText) dateText.textContent = `${sched.date} (${sched.weekday})`;

    // 出口仁課本與影片指引
    const tbBox = document.getElementById("textbookGuideBox");
    if (tbBox) {
      let tbHtml = `
        <div class="tb-line"><strong>📖 核心教材：</strong>${sched.textbookPrimary || "五十音基礎指引 / 實力模擬"}</div>
        <div class="tb-line"><strong>🎯 配套資源：</strong>${sched.textbookSecondary || "出口仁老師文法講解與練習"}</div>
      `;
      // 偵測是否有對應影片
      const matchLesson = (sched.textbookPrimary + " " + (sched.textbookSecondary || "")).match(/第\s*(\d+)\s*課/);
      const lessonNum = matchLesson ? matchLesson[1] : null;

      if (lessonNum) {
        tbHtml += `
          <div class="tb-line" style="margin-top:6px;">
            <strong>🎬 推薦教學影片：</strong>出口仁老師《大家學標準日本語》第 ${lessonNum} 課
            <button class="task-action-btn" id="openVideoHintBtn" style="margin-left:8px;">觀看本機影片說明</button>
          </div>
        `;
      }
      tbBox.innerHTML = tbHtml;

      const vBtn = document.getElementById("openVideoHintBtn");
      if (vBtn && lessonNum) {
        vBtn.addEventListener("click", () => this.showVideoHelpModal(lessonNum));
      }
    }

    // 6 大子委託任務清單
    const taskList = document.getElementById("questTasksList");
    if (taskList) {
      taskList.innerHTML = "";
      const dayTasks = this.saveData.progress.completedTasks[`day_${dayNum}`] || [];
      const quests = sched.dailyQuests || sched.tasks || [];

      quests.forEach((t) => {
        const isCompleted = dayTasks.includes(t.id);
        const item = document.createElement("div");
        item.className = `task-item ${isCompleted ? "completed" : ""}`;
        item.innerHTML = `
          <div class="task-left">
            <div class="task-check">${isCompleted ? "✓" : ""}</div>
            <div>
              <div class="task-name">${t.name}</div>
              <div style="font-size:0.8rem;color:var(--text-sub);">${t.desc || t.detail || ""}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="task-time">${t.minutes || 20} 分鐘</span>
            <button class="task-action-btn">${isCompleted ? "已完成" : "打勾完成"}</button>
          </div>
        `;

        item.addEventListener("click", () => this.toggleTaskCompletion(dayNum, t.id, t.minutes || 20));
        taskList.appendChild(item);
      });
    }

    // 當日收錄單字與漢字預覽
    this.renderDailyChips(sched);
  },

  /**
   * 任務勾選與獎勵計算
   */
  toggleTaskCompletion(dayNum, taskId, minutes = 20) {
    const key = `day_${dayNum}`;
    if (!this.saveData.progress.completedTasks[key]) {
      this.saveData.progress.completedTasks[key] = [];
    }
    const list = this.saveData.progress.completedTasks[key];
    const idx = list.indexOf(taskId);

    if (idx === -1) {
      list.push(taskId);
      // 依任務時長給予 EXP 與金幣
      const gainExp = Math.round(minutes * 0.8);
      const gainGold = Math.round(minutes * 0.5);
      this.awardPlayer({ exp: gainExp, gold: gainGold, affection: 1 });
      this.showToast(`✨ 任務完成！獲得 +${gainExp} EXP、+${gainGold} G！`, "success");
    } else {
      list.splice(idx, 1);
    }

    this.renderTodayQuest(dayNum);
    this.saveProgress();
  },

  /**
   * 渲染當日單字/漢字小卡
   */
  renderDailyChips(sched) {
    const chipsContainer = document.getElementById("dailyChipsContainer");
    if (!chipsContainer) return;
    chipsContainer.innerHTML = "";

    const vocabList = sched.assignedVocab || sched.vocabList || [];
    const kanjiList = sched.assignedKanji || sched.kanjiList || [];

    if (vocabList.length === 0 && kanjiList.length === 0) {
      chipsContainer.innerHTML = `<span style="font-size:0.85rem;color:var(--text-muted);">本日為複習與實戰週，無新增獨立單字。</span>`;
      return;
    }

    // 單字 Chips
    vocabList.forEach((word) => {
      const chip = document.createElement("span");
      chip.className = "vocab-chip";
      chip.innerHTML = `📘 ${word}`;
      chip.addEventListener("click", () => this.openWordDetail(word));
      chipsContainer.appendChild(chip);
    });

    // 漢字 Chips
    kanjiList.forEach((kanji) => {
      const chip = document.createElement("span");
      chip.className = "kanji-chip";
      chip.innerHTML = `🀄 ${kanji}`;
      chip.addEventListener("click", () => this.openKanjiDetail(kanji));
      chipsContainer.appendChild(chip);
    });
  },

  /**
   * 本機影片觀看教學彈窗
   */
  showVideoHelpModal(lessonNum) {
    const content = `
      <h3 style="color:var(--accent-gold-light);margin-bottom:12px;">🎬 出口仁老師《大家學標準日本語》第 ${lessonNum} 課</h3>
      <p style="margin-bottom:12px;">
        依照版權保護規範，影片檔案未上傳至雲端，已安全保存在您的個人電腦中：
      </p>
      <div style="background:var(--bg-primary);padding:10px;border-radius:6px;font-family:monospace;word-break:break-all;margin-bottom:14px;border:1px solid var(--border-subtle);">
        C:\\Users\\s0987\\Desktop\\Nihongo_Benkyo\\大家學標準日本語_初級本\\lesson_vedio\\${lessonNum}.mp4
      </div>
      <p style="font-size:0.9rem;color:var(--text-sub);line-height:1.6;margin-bottom:16px;">
        💡 <strong>觀看小秘訣：</strong>出口仁老師講解文法時，會將句型結構畫成簡單表格。觀看時請跟著老師<strong>「大聲開口覆誦三次」</strong>，效果會加倍顯著喔！
      </p>
      <div style="text-align:right;">
        <button class="btn-talk" onclick="window.App.copyToClipboard('C:\\\\Users\\\\s0987\\\\Desktop\\\\Nihongo_Benkyo\\\\大家學標準日本語_初級本\\\\lesson_vedio\\\\${lessonNum}.mp4'); window.App.showToast('已複製影片路徑！可貼到播放軟體開啟', 'success');">複製影片本機路徑</button>
      </div>
    `;
    this.openModal(content);
  },

  /**
   * SRS 記憶抽認卡介面
   */
  renderSrsCard() {
    if (!window.SRSManager) return;
    const card = window.SRSManager.getCurrentCard();
    const stats = window.SRSManager.getStats();

    const statsEl = document.getElementById("srsStatsText");
    const countBadge = document.getElementById("srsDueCountBadge");
    if (window.SRSManager.mode === "daily") {
      if (statsEl) statsEl.textContent = `今日目標：已修煉 ${stats.dailyDone} / ${stats.dailyTarget} 張`;
      if (countBadge) countBadge.textContent = `${stats.due} 張待背`;
    } else {
      if (statsEl) statsEl.textContent = `全庫待背：${stats.due} / 總收錄：${stats.total} (掌握：${stats.mastered})`;
      if (countBadge) countBadge.textContent = `${stats.due} 張`;
    }

    const flashcardEl = document.getElementById("flashcardElement");
    const frontWord = document.getElementById("cardFrontWord");
    const frontSub = document.getElementById("cardFrontSub");
    const backWord = document.getElementById("cardBackWord");
    const backReading = document.getElementById("cardBackReading");
    const backMeaning = document.getElementById("cardBackMeaning");
    const backEx = document.getElementById("cardBackExample");

    if (flashcardEl) flashcardEl.classList.remove("flipped");

    if (!card) {
      if (frontWord) frontWord.textContent = "🎉 今日修煉大成功！";
      if (frontSub) frontSub.textContent = window.SRSManager.mode === "daily" 
        ? "本日 5～15 張核心詞彙已全部複習完成！公會【神殿複習】子委託已打勾！" 
        : "當前篩選下的卡片已全部複習完成，詩織為你感到驕傲！";
      if (backWord) backWord.textContent = "🌟 優秀！";
      if (backReading) backReading.textContent = "明天也一起繼續進步吧！";
      return;
    }

    if (frontWord) frontWord.textContent = card.front;
    if (frontSub) frontSub.textContent = card.subFront;
    if (backWord) backWord.textContent = card.front;
    if (backReading) backReading.textContent = card.reading;
    if (backMeaning) backMeaning.textContent = card.meaning;
    if (backEx) backEx.textContent = card.example || "";

    // 翻牌事件綁定
    if (flashcardEl && !flashcardEl.hasCardClickBound) {
      flashcardEl.hasCardClickBound = true;
      flashcardEl.addEventListener("click", () => {
        flashcardEl.classList.toggle("flipped");
        // 自動發音
        const cur = window.SRSManager.getCurrentCard();
        if (cur && window.FuriganaEngine) {
          window.FuriganaEngine.speak(cur.reading || cur.front);
        }
      });
    }

    // 4 個評分按鈕綁定
    const srsBtns = document.querySelectorAll(".srs-btn");
    srsBtns.forEach((btn) => {
      btn.onclick = () => {
        const rating = parseInt(btn.getAttribute("data-grade"));
        window.SRSManager.gradeCurrentCard(rating);
        this.saveData.srs = { cards: window.SRSManager.getSavedCardsData() };
        this.awardPlayer({ exp: 5, gold: 2 });
        this.renderSrsCard();
      };
    });

    // 模式切換按鈕 (今日課表 vs 全庫自由檢索)
    const srsModeBtns = document.querySelectorAll(".srs-mode-btn");
    srsModeBtns.forEach((btn) => {
      btn.onclick = () => {
        srsModeBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const mode = btn.dataset.mode;
        const todaySched = (this.data.schedule || []).find((s) => s.day === this.currentDayIndex);
        window.SRSManager.setMode(mode, todaySched);

        // 依模式顯隱等級篩選標籤
        const filterBtns = document.querySelectorAll(".srs-filter-btn");
        filterBtns.forEach((fb) => {
          fb.style.display = mode === "all" ? "inline-block" : "none";
        });
        this.renderSrsCard();
      };
    });

    // 等級篩選按鈕
    const srsFilterBtns = document.querySelectorAll(".srs-filter-btn");
    srsFilterBtns.forEach((btn) => {
      btn.onclick = () => {
        srsFilterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        window.SRSManager.setFilter(btn.getAttribute("data-filter"));
        this.renderSrsCard();
      };
    });
  },

  /**
   * 詩織櫃台對話介面 (AI Tutor & Chat - 具備雙向語音交流能力)
   */
  bindChatEvents() {
    const inputEl = document.getElementById("shioriChatInput");
    const sendBtn = document.getElementById("shioriSendBtn");
    const micBtn = document.getElementById("shioriMicBtn");
    const openGraderBtn = document.getElementById("openWritingGraderBtn");

    const doSend = async () => {
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = "";

      this.appendChatMessage("user", text);

      // 詩織思考中
      const tempId = this.appendChatMessage("shiori", "詩織正在為你思考中，請稍候片刻……");

      const apiKey = this.settings.geminiApiKey;
      const model = this.settings.geminiModel || "gemini-3.5-flash-lite";

      const res = await window.ShioriAI.sendMessage(text, apiKey, model);

      // 更新訊息內容與立繪，並掛載語音播放按鈕
      this.updateChatMessage(tempId, res.formattedHtml || res.rawText, res.rawText);
      window.ShioriAI.updatePortrait(res.mood || "normal");

      // 自動朗讀回覆（語音對話教學模式）
      if (window.FuriganaEngine) {
        window.FuriganaEngine.speak(res.rawText);
      }

      // 增加好感度
      this.awardPlayer({ exp: 8, affection: 1 });
    };

    if (sendBtn) sendBtn.addEventListener("click", doSend);
    if (inputEl) {
      inputEl.addEventListener("keypress", (e) => {
        if (e.key === "Enter") doSend();
      });
    }

    // 語音輸入 (麥克風)
    if (micBtn) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "ja-JP";
        recognition.interimResults = false;
        recognition.onstart = () => {
          micBtn.classList.add("recording");
          this.showToast("🎙️ 正在聆聽您的發音/語音...", "info");
        };
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (inputEl) {
            inputEl.value = transcript;
            doSend();
          }
        };
        recognition.onend = () => {
          micBtn.classList.remove("recording");
        };
        recognition.onerror = (err) => {
          micBtn.classList.remove("recording");
          console.warn("語音輸入異常：", err);
        };
        micBtn.addEventListener("click", () => {
          try {
            recognition.start();
          } catch (e) {
            recognition.stop();
          }
        });
      } else {
        micBtn.addEventListener("click", () => {
          this.showToast("您的瀏覽器未支援語音辨識（建議使用 Chrome / Edge）", "warning");
        });
      }
    }

    if (openGraderBtn) {
      openGraderBtn.addEventListener("click", () => this.showWritingGraderModal());
    }
  },

  appendChatMessage(sender, contentHtml) {
    const chatContainer = document.getElementById("shioriChatMessages");
    if (!chatContainer) return null;

    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const bubble = document.createElement("div");
    bubble.id = id;
    bubble.className = `msg-bubble ${sender}`;
    bubble.innerHTML = contentHtml;

    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
  },

  updateChatMessage(id, newHtml, rawText = "") {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `
        <div class="msg-content">${newHtml}</div>
        <div class="msg-actions" style="margin-top:6px;display:flex;justify-content:flex-end;">
          <button class="msg-speak-btn" style="background:transparent;border:1px solid var(--border-gold);color:var(--accent-gold);border-radius:12px;font-size:0.75rem;padding:2px 8px;cursor:pointer;">🔊 朗讀語音</button>
        </div>
      `;
      const speakBtn = el.querySelector(".msg-speak-btn");
      if (speakBtn && window.FuriganaEngine) {
        speakBtn.addEventListener("click", () => {
          window.FuriganaEngine.speak(rawText || el.textContent);
        });
      }
      const chatContainer = document.getElementById("shioriChatMessages");
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  },

  /**
   * 每日三句造句批改彈窗
   */
  showWritingGraderModal() {
    const content = `
      <h3 style="color:var(--accent-gold-light);margin-bottom:8px;">✍️ 每日三句造句批改（詩織親自審查）</h3>
      <p style="font-size:0.9rem;color:var(--text-sub);margin-bottom:14px;">
        請依今天學到的文法與單字，嘗試寫出 3 個日文句子（漢字可以寫漢字，也可以寫平假名）：
      </p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
        <input type="text" id="gradeSent1" class="chat-input" placeholder="例：わたしは がくせいです。" style="width:100%;">
        <input type="text" id="gradeSent2" class="chat-input" placeholder="例：あした としょかんへ いきます。" style="width:100%;">
        <input type="text" id="gradeSent3" class="chat-input" placeholder="例：日本語を べんきょうします。" style="width:100%;">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button class="btn-talk" id="submitGradingBtn">送出給詩織批改 ➔</button>
      </div>
      <div id="gradingResultArea" style="margin-top:14px;max-height:260px;overflow-y:auto;"></div>
    `;

    this.openModal(content);

    const submitBtn = document.getElementById("submitGradingBtn");
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const s1 = document.getElementById("gradeSent1").value.trim();
        const s2 = document.getElementById("gradeSent2").value.trim();
        const s3 = document.getElementById("gradeSent3").value.trim();

        if (!s1 && !s2 && !s3) {
          this.showToast("請至少填寫一個造句喔！", "info");
          return;
        }

        const resArea = document.getElementById("gradingResultArea");
        resArea.innerHTML = `<p style="color:var(--accent-gold);text-align:center;">詩織正在戴上眼鏡為你批改作業中……☕</p>`;

        const apiKey = this.settings.geminiApiKey;
        const model = this.settings.geminiModel || "gemini-2.5-flash";

        const res = await window.ShioriAI.gradeDailySentences(s1, s2, s3, apiKey, model);
        resArea.innerHTML = `
          <div style="background:var(--bg-primary);padding:14px;border-radius:8px;border:1px solid var(--border-gold);line-height:1.7;">
            ${res.formattedHtml || res.rawText}
          </div>
        `;
        window.ShioriAI.updatePortrait(res.mood || "happy");
        this.awardPlayer({ exp: 25, gold: 15, affection: 3 });
      };
    }
  },

  /**
   * 冒險者圖鑑 (Compendium)
   */
  bindCompendium() {
    const tabs = document.querySelectorAll(".c-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.renderCompendium(tab.getAttribute("data-category"));
      });
    });

    const searchInput = document.getElementById("compendiumSearch");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const activeTab = document.querySelector(".c-tab.active");
        const cat = activeTab ? activeTab.getAttribute("data-category") : "all";
        this.renderCompendium(cat, searchInput.value.trim().toLowerCase());
      });
    }
  },

  updateCompendiumStats() {
    let capturedMonsters = [];
    try {
      capturedMonsters = JSON.parse(localStorage.getItem("nihongo_guild_compendium_monsters") || "[]");
    } catch (e) {}

    const masteredKanji = (this.saveData.progress.masteredKanji || []).length;
    const masteredVocab = Object.keys(this.saveData.srs?.cards || {}).length;

    const totalMonsters = (this.data.monsters && this.data.monsters.length) || 52;
    const totalKanji = (this.data.kanji && this.data.kanji.length) || 640;
    const totalVocab = (this.data.vocab && this.data.vocab.length) || 2963;

    const mPct = Math.round((capturedMonsters.length / totalMonsters) * 100);
    const kPct = Math.round((masteredKanji / totalKanji) * 100);
    const vPct = Math.round((masteredVocab / totalVocab) * 100);
    const totalPct = Math.min(100, Math.round(mPct * 0.4 + kPct * 0.3 + vPct * 0.3));

    const totalEl = document.getElementById("cStatTotalPct");
    const monEl = document.getElementById("cStatMonsters");
    const kanEl = document.getElementById("cStatKanji");
    const vocEl = document.getElementById("cStatVocab");

    if (totalEl) totalEl.textContent = `${totalPct}%`;
    if (monEl) monEl.textContent = `${capturedMonsters.length} / ${totalMonsters} 隻 (${mPct}%)`;
    if (kanEl) kanEl.textContent = `${masteredKanji} / ${totalKanji} 字 (${kPct}%)`;
    if (vocEl) vocEl.textContent = `${masteredVocab} / ${totalVocab} 詞 (${vPct}%)`;
  },

  renderCompendium(category = "all", query = "") {
    this.updateCompendiumStats();

    const deck = document.getElementById("cardsDeckGrid");
    if (!deck) return;
    deck.innerHTML = "";

    let items = [];

    // 👾 52 款魔物生態圖鑑 (寶可夢式剪影點亮)
    if (category === "all" || category === "monsters") {
      let capturedList = [];
      try {
        capturedList = JSON.parse(localStorage.getItem("nihongo_guild_compendium_monsters") || "[]");
      } catch (e) {}

      (this.data.monsters || []).forEach((m) => {
        const isCaptured = capturedList.includes(m.id);
        items.push({
          type: "monster",
          id: m.id,
          title: isCaptured ? `${m.name} (${m.nameJa || ""})` : `??? (未遭遇魔物)`,
          sub: isCaptured ? `區域：${m.zone.toUpperCase()} ｜ 階級：${m.tier}` : `區域：${m.zone.toUpperCase()} ｜ 階級：???`,
          desc: isCaptured ? `HP: ${m.hp} ｜ 護盾: 🛡️ ${m.shield} ｜ 弱點：${(m.weaknesses || []).join("、")}` : `尚未在討伐戰鬥中擊敗，弱點未知`,
          tier: isCaptured ? "tier-3" : "tier-1",
          isCaptured,
          raw: m
        });
      });
    }

    if (category === "all" || category === "kana") {
      this.data.kana.forEach((k) => {
        items.push({
          type: "kana",
          title: `${k.hiragana} (${k.katakana})`,
          sub: `[${k.romaji}]`,
          desc: k.example || "五十音基礎假名",
          tier: "tier-1",
          raw: k
        });
      });
    }

    if (category === "all" || category === "n5" || category === "n4" || category === "n3") {
      const targetLvl = category.toUpperCase();

      // 單字
      this.data.vocab
        .filter((v) => category === "all" || v.level === targetLvl)
        .slice(0, 150)
        .forEach((v) => {
          let tier = "tier-1";
          if (v.level === "N4") tier = "tier-2";
          if (v.level === "N3") tier = "tier-3";

          items.push({
            type: "vocab",
            title: v.word,
            sub: `【${v.reading}】${v.pos ? "[" + v.pos + "]" : ""}`,
            desc: v.meaningZh,
            tier,
            raw: v
          });
        });

      // 漢字
      this.data.kanji
        .filter((k) => category === "all" || k.level === targetLvl)
        .slice(0, 80)
        .forEach((k) => {
          items.push({
            type: "kanji",
            title: k.kanji,
            sub: `音：${k.onyomi || "—"} / 訓：${k.kunyomi || "—"}`,
            desc: k.meaningZh,
            tier: "tier-2",
            raw: k
          });
        });

      // 文法
      this.data.grammar
        .filter((g) => category === "all" || g.level === targetLvl)
        .slice(0, 50)
        .forEach((g) => {
          items.push({
            type: "grammar",
            title: g.title,
            sub: `[${g.level} 文法]`,
            desc: g.meaningZh,
            tier: "tier-3",
            raw: g
          });
        });
    }

    // 搜尋過濾
    if (query) {
      items = items.filter(
        (it) =>
          it.title.toLowerCase().includes(query) ||
          it.sub.toLowerCase().includes(query) ||
          it.desc.toLowerCase().includes(query)
      );
    }

    // 渲染卡片
    items.slice(0, 120).forEach((item) => {
      const card = document.createElement("div");

      if (item.type === "monster") {
        card.className = `compendium-card ${item.isCaptured ? "captured" : "silhouette"}`;
        card.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <img src="${item.raw.sprite || 'assets/monster_slime.jpg'}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid var(--border-gold);" />
            <div>
              <div style="font-size:1.05rem;font-weight:bold;color:${item.isCaptured ? 'var(--accent-gold)' : 'var(--text-sub)'};">${item.title}</div>
              <div style="font-size:0.75rem;color:var(--text-sub);">${item.sub}</div>
            </div>
            ${item.isCaptured ? '<span class="stamp-badge" style="margin-left:auto;">✨ 已收服</span>' : ''}
          </div>
          <div style="font-size:0.82rem;color:var(--text-main);">${item.desc}</div>
        `;
        card.addEventListener("click", () => {
          if (item.isCaptured) {
            this.openMonsterDetail(item.raw);
          } else {
            this.showToast("此魔物尚未擊敗收服，請前往討伐戰鬥探索遭遇！", "info");
          }
        });
      } else {
        card.className = `compendium-card ${item.tier}`;
        card.innerHTML = `
          <div style="font-size:1.2rem;font-weight:bold;color:var(--accent-gold-light);margin-bottom:4px;">${item.title}</div>
          <div style="font-size:0.85rem;color:var(--text-sub);margin-bottom:6px;">${item.sub}</div>
          <div style="font-size:0.85rem;color:#fff;">${item.desc}</div>
        `;
        card.addEventListener("click", () => {
          if (item.type === "vocab") this.openWordDetail(item.raw.word);
          else if (item.type === "kanji") this.openKanjiDetail(item.raw.kanji);
          else if (item.type === "kana") this.openKanaDetail(item.raw);
          else if (item.type === "grammar") this.openGrammarDetail(item.raw);
        });
      }

      deck.appendChild(card);
    });
  },

  openMonsterDetail(m) {
    const content = `
      <div style="text-align:center;margin-bottom:14px;">
        <img src="${m.sprite || 'assets/monster_slime.jpg'}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--accent-gold);box-shadow:0 0 16px rgba(241,196,15,0.4);" />
        <h3 style="color:var(--accent-gold);margin-top:10px;">${m.name}</h3>
        <div style="color:var(--text-sub);font-size:0.95rem;">${m.nameJa || ""}</div>
        <span class="chap-badge" style="margin-top:6px;display:inline-block;">區域：${m.zone.toUpperCase()} ｜ 階級：${m.tier}</span>
      </div>

      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;padding:12px;font-size:0.9rem;margin-bottom:14px;">
        <div><strong>❤️ 生命力 (HP)：</strong>${m.hp}</div>
        <div style="margin-top:4px;"><strong>🛡️ 破防盾牌層數：</strong>${m.shield} 層</div>
        <div style="margin-top:4px;"><strong>⚔️ 弱點類型：</strong>${(m.weaknesses || []).join("、")}</div>
        <div style="margin-top:4px;"><strong>🎁 討伐獎勵：</strong>+${m.exp || 30} EXP、+${m.gold || 20} G</div>
      </div>
      <div style="text-align:right;">
        <button class="btn-talk" onclick="window.App.closeModal()">確認</button>
      </div>
    `;
    this.openModal(content);
  },

  /**
   * 字典與詳情彈窗
   */
  openWordDetail(wordStr) {
    const v = this.data.vocab.find((x) => x.word === wordStr || x.reading === wordStr);
    if (!v) return;

    let exHtml = "";
    if (v.exampleSentence) {
      const rubyJa = window.FuriganaEngine
        ? window.FuriganaEngine.render(v.exampleSentence.ja)
        : v.exampleSentence.ja;
      exHtml = `
        <div style="background:var(--bg-primary);padding:10px 14px;border-radius:6px;border-left:3px solid var(--accent-blue);margin-top:12px;">
          <div style="font-size:1.05rem;line-height:1.8;margin-bottom:4px;">${rubyJa}</div>
          <div style="font-size:0.88rem;color:var(--text-sub);">${v.exampleSentence.zh || ""}</div>
        </div>
      `;
    }

    const content = `
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:10px;margin-bottom:14px;">
        <div>
          <span style="font-size:1.8rem;font-weight:bold;color:var(--accent-gold-light);">${v.word}</span>
          <span style="font-size:1.1rem;color:var(--text-sub);margin-left:8px;">【${v.reading}】</span>
          <span style="font-size:0.8rem;background:#34495e;padding:2px 6px;border-radius:4px;margin-left:6px;">${v.level}</span>
        </div>
        <button class="icon-btn" onclick="window.FuriganaEngine.speak('${v.reading || v.word}')" style="font-size:1.2rem;padding:6px 12px;">🔊 聆聽</button>
      </div>
      <div style="font-size:1.1rem;color:#fff;margin-bottom:8px;"><strong>中文解釋：</strong>${v.meaningZh}</div>
      <div style="font-size:0.9rem;color:var(--text-sub);margin-bottom:10px;"><strong>詞性分類：</strong>${v.pos || "單字"}</div>
      ${exHtml}
    `;
    this.openModal(content);
  },

  openKanjiDetail(kanjiChar) {
    const k = this.data.kanji.find((x) => x.kanji === kanjiChar);
    if (!k) return;

    const content = `
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-subtle);padding-bottom:10px;margin-bottom:14px;">
        <span style="font-size:2.8rem;font-weight:bold;color:var(--accent-gold-light);">${k.kanji}</span>
        <div style="text-align:right;">
          <div style="font-size:0.9rem;color:var(--text-sub);">筆畫數：${k.strokes} 畫</div>
          <div style="font-size:0.8rem;background:#27ae60;display:inline-block;padding:2px 8px;border-radius:4px;margin-top:4px;">${k.level}</div>
        </div>
      </div>
      <div style="font-size:1.05rem;line-height:1.8;margin-bottom:10px;">
        <div><strong>音讀 (On)：</strong>${k.onyomi || "—"}</div>
        <div><strong>訓讀 (Kun)：</strong>${k.kunyomi || "—"}</div>
        <div><strong>中文意義：</strong>${k.meaningZh}</div>
      </div>
      <div style="margin-top:12px;background:var(--bg-primary);padding:10px;border-radius:6px;">
        <strong>常見造詞範例：</strong> ${(k.examples || []).join("、")}
      </div>
    `;
    this.openModal(content);
  },

  openKanaDetail(kana) {
    const content = `
      <div style="text-align:center;padding:10px 0;">
        <div style="font-size:3.5rem;font-weight:bold;color:var(--accent-gold-light);">${kana.hiragana}</div>
        <div style="font-size:1.8rem;color:var(--text-sub);margin-bottom:10px;">片假名：${kana.katakana}</div>
        <div style="font-size:1.2rem;margin-bottom:14px;">羅馬拼音：<strong>[${kana.romaji}]</strong></div>
        <div style="font-size:0.95rem;color:var(--text-muted);">${kana.example || ""}</div>
        <button class="btn-talk" onclick="window.FuriganaEngine.speak('${kana.hiragana}')" style="margin-top:16px;">🔊 聆聽標準發音</button>
      </div>
    `;
    this.openModal(content);
  },

  openGrammarDetail(g) {
    const content = `
      <h3 style="color:var(--accent-gold-light);margin-bottom:8px;">【${g.title}】(${g.level})</h3>
      <div style="font-size:1.05rem;color:#fff;margin-bottom:10px;"><strong>意義：</strong>${g.meaningZh}</div>
      <div style="font-size:0.92rem;color:var(--text-sub);line-height:1.6;margin-bottom:14px;">${g.explanation}</div>
      <div style="background:var(--bg-primary);padding:12px;border-radius:6px;border-left:3px solid var(--border-gold);">
        <div style="font-size:1.05rem;margin-bottom:4px;">${g.example?.ja ? window.FuriganaEngine.render(g.example.ja) : ""}</div>
        <div style="font-size:0.88rem;color:var(--text-sub);">${g.example?.zh || ""}</div>
      </div>
    `;
    this.openModal(content);
  },

  /**
   * 設定面板與存檔同步 (Settings & Sync)
   */
  bindSettings() {
    const saveBtn = document.getElementById("saveSettingsBtn");
    const pushBtn = document.getElementById("syncPushBtn");
    const fetchBtn = document.getElementById("syncFetchBtn");
    const exportBtn = document.getElementById("exportSaveBtn");
    const importInput = document.getElementById("importSaveFile");

    const testVoiceBtn = document.getElementById("testVoiceBtn");
    if (testVoiceBtn) {
      testVoiceBtn.addEventListener("click", () => {
        const val = parseInt(document.getElementById("settingVoiceStyle")?.value, 10);
        const v = isNaN(val) ? 15 : val;
        if (window.FuriganaEngine) {
          window.FuriganaEngine.setVoiceStyle(v);
          window.FuriganaEngine.speak("冒険者[ぼうけんしゃ]さん、今日[きょう]も一緒[いっしょ]に頑張[がんば]りましょうね！");
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        this.settings.geminiApiKey = document.getElementById("settingGeminiKey").value.trim();
        this.settings.geminiModel = document.getElementById("settingGeminiModel").value || "gemini-3.5-flash-lite";
        const voiceSelect = document.getElementById("settingVoiceStyle");
        const val = voiceSelect ? parseInt(voiceSelect.value, 10) : 15;
        const voiceStyle = isNaN(val) ? 15 : val;
        this.settings.voiceStyle = voiceStyle;
        if (window.FuriganaEngine) {
          window.FuriganaEngine.setVoiceStyle(voiceStyle);
        }
        this.settings.githubPat = document.getElementById("settingGithubPat").value.trim();
        this.settings.githubRepo = document.getElementById("settingGithubRepo").value.trim();

        window.SyncManager.saveSettings(this.settings);
        this.showToast("設定已儲存成功！已套用全新動漫音質。", "success");
      });
    }

    if (pushBtn) {
      pushBtn.addEventListener("click", async () => {
        pushBtn.disabled = true;
        pushBtn.textContent = "上傳同步中...";
        try {
          await window.SyncManager.pushToGitHub(
            this.saveData,
            this.settings.githubPat,
            this.settings.githubRepo
          );
          this.showToast("已成功備份存檔至 GitHub 私人倉庫！", "success");
        } catch (err) {
          this.showToast(`同步失敗：${err.message}`, "error");
        } finally {
          pushBtn.disabled = false;
          pushBtn.textContent = "備份存檔至 GitHub";
        }
      });
    }

    if (fetchBtn) {
      fetchBtn.addEventListener("click", async () => {
        if (!confirm("確定要從 GitHub 下載雲端存檔嗎？本機目前的未備份進度將被覆蓋。")) return;
        fetchBtn.disabled = true;
        fetchBtn.textContent = "下載還原中...";
        try {
          const res = await window.SyncManager.fetchFromGitHub(
            this.settings.githubPat,
            this.settings.githubRepo
          );
          this.saveData = res.save;
          this.showToast("已成功從 GitHub 還原最新存檔！", "success");
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          this.showToast(`下載失敗：${err.message}`, "error");
        } finally {
          fetchBtn.disabled = false;
          fetchBtn.textContent = "從 GitHub 下載存檔";
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        window.SyncManager.exportToFile(this.saveData);
      });
    }

    if (importInput) {
      importInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            this.saveData = await window.SyncManager.importFromFile(file);
            this.showToast("存檔匯入成功！即將重新載入頁面...", "success");
            setTimeout(() => location.reload(), 1200);
          } catch (err) {
            this.showToast(`匯入失敗：${err.message}`, "error");
          }
        }
      });
    }
  },

  fillSettingsForm() {
    const kInput = document.getElementById("settingGeminiKey");
    const mSelect = document.getElementById("settingGeminiModel");
    const vSelect = document.getElementById("settingVoiceStyle");
    const pInput = document.getElementById("settingGithubPat");
    const rInput = document.getElementById("settingGithubRepo");

    if (kInput) kInput.value = this.settings.geminiApiKey || "";
    if (mSelect) mSelect.value = this.settings.geminiModel || "gemini-3.5-flash-lite";
    const currentVoice = (this.settings.voiceStyle !== undefined && this.settings.voiceStyle !== null) ? this.settings.voiceStyle : 15;
    if (vSelect) vSelect.value = currentVoice;
    if (pInput) pInput.value = this.settings.githubPat || "";
    if (rInput) rInput.value = this.settings.githubRepo || "snake19910808/nihongo-save";

    if (window.FuriganaEngine) {
      window.FuriganaEngine.setVoiceStyle(currentVoice);
    }
  },

  saveProgress() {
    window.SyncManager.saveLocal(this.saveData);
  },

  /**
   * 戰鬥勝利結算回調
   */
  onBattleVictory(rewards) {
    this.awardPlayer(rewards);
  },

  /**
   * 通用彈窗與提示訊息 (Modal & Toast)
   */
  bindModal() {
    const overlay = document.getElementById("appModalOverlay");
    const closeBtn = document.getElementById("modalCloseBtn");
    if (closeBtn && overlay) {
      closeBtn.addEventListener("click", () => overlay.classList.remove("active"));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.classList.remove("active");
      });
    }
  },

  openModal(contentHtml) {
    const overlay = document.getElementById("appModalOverlay");
    const body = document.getElementById("modalDynamicBody");
    if (overlay && body) {
      body.innerHTML = contentHtml;
      overlay.classList.add("active");
    }
  },

  closeModal() {
    const overlay = document.getElementById("appModalOverlay");
    if (overlay) overlay.classList.remove("active");
  },

  showToast(msg, type = "info") {
    let toast = document.getElementById("appToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "appToast";
      toast.style.position = "fixed";
      toast.style.bottom = "24px";
      toast.style.left = "50%";
      toast.style.transform = "translateX(-50%)";
      toast.style.padding = "10px 20px";
      toast.style.borderRadius = "20px";
      toast.style.fontWeight = "bold";
      toast.style.boxShadow = "0 4px 15px rgba(0,0,0,0.5)";
      toast.style.zIndex = "9999";
      toast.style.transition = "all 0.3s ease";
      document.body.appendChild(toast);
    }

    if (type === "success" || type === "victory") {
      toast.style.background = "#27ae60";
      toast.style.color = "#fff";
    } else if (type === "error") {
      toast.style.background = "#c0392b";
      toast.style.color = "#fff";
    } else {
      toast.style.background = "#2c3e50";
      toast.style.color = "#f1c40f";
    }

    toast.textContent = msg;
    toast.style.opacity = "1";
    toast.style.visibility = "visible";

    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.visibility = "hidden";
    }, 3000);
  },

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }
};

window.App = App;
window.addEventListener("DOMContentLoaded", () => App.init());

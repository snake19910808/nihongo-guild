/**
 * battle.js - 《歧路旅人（Octopath Traveler）》風格戰鬥引擎 (v2.0)
 * HD-2D Turn-Based Combat + Weakness & Break + Timeline + Pixel Avatar + 52 Monsters DB
 */

const BattleManager = {
  datasets: {
    kana: [],
    vocab: [],
    kanji: [],
    grammar: [],
    monsters: []
  },

  currentZone: "kana", // "kana", "n5", "n4", "n3"
  zoneMonsters: [],
  currentMonster: null,
  monsterHp: 100,
  monsterMaxHp: 100,
  monsterShield: 2,
  monsterMaxShield: 2,
  isBroken: false,
  breakTurnsRemaining: 0,
  revealedWeaknesses: {}, // { "kana_01": Set(["kana_romaji"]) }

  // 玩家戰鬥屬性
  playerHp: 100,
  playerMaxHp: 100,
  combo: 0,
  zoneKillCount: 0, // 擊殺計數，決定何時出菁英 Boss 或世界守門 Boss
  currentQuestion: null,
  isAnsweringLocked: false,

  weaknessMap: {
    kana_romaji: { label: "羅馬拼音", icon: "🔤", color: "#3498db" },
    kana_kata: { label: "片假名", icon: "🈂️", color: "#e67e22" },
    vocab_meaning: { label: "單字詞義", icon: "📖", color: "#2ecc71" },
    vocab_reading: { label: "假名讀音", icon: "🔤", color: "#9b59b6" },
    kanji_on: { label: "漢字音讀", icon: "🏮", color: "#e74c3c" },
    kanji_kun: { label: "漢字訓讀", icon: "🎋", color: "#1abc9c" },
    grammar_meaning: { label: "核心文法", icon: "📜", color: "#f39c12" },
    listening: { label: "聽力理解", icon: "🎧", color: "#00d2d3" },
    speaking: { label: "發音朗讀", icon: "🗣️", color: "#ff6b6b" },
    writing: { label: "筆順書寫", icon: "🖌️", color: "#54a0ff" }
  },

  async init(datasets) {
    this.datasets = datasets;

    // 載入 52 隻魔物生態庫
    await this.loadMonstersData();
    this.bindEvents();
    if (window.BattleFX) {
      window.BattleFX.init("battleFxCanvas");
    }
    this.startZone("kana");
  },

  async loadMonstersData() {
    try {
      const res = await fetch("data/monsters.json");
      if (res.ok) {
        this.datasets.monsters = await res.json();
      }
    } catch (e) {
      console.warn("無法載入 data/monsters.json，使用備援魔物清單：", e);
    }
  },

  bindEvents() {
    // 地圖區域切換
    const mapBtns = document.querySelectorAll(".map-btn");
    mapBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const zoneId = btn.getAttribute("data-zone");
        if (zoneId) {
          mapBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.startZone(zoneId);
        }
      });
    });
  },

  startZone(zoneId) {
    this.currentZone = zoneId;
    this.combo = 0;
    this.zoneKillCount = 0;
    this.playerHp = this.playerMaxHp;
    this.updatePlayerHpBar();

    // 篩選當前區域魔物庫
    const pool = (this.datasets.monsters || []).filter((m) => m.zone === zoneId);
    this.zoneMonsters = pool.length > 0 ? pool : this.getFallbackMonsters(zoneId);

    this.spawnNextMonster();
  },

  /**
   * 生成下一隻怪物（依擊殺數決定一般怪物、菁英小 Boss 或世界大 Boss）
   */
  spawnNextMonster() {
    this.isAnsweringLocked = false;
    this.isBroken = false;
    this.breakTurnsRemaining = 0;

    let targetTier = "normal";
    if (this.zoneKillCount > 0 && this.zoneKillCount % 10 === 9) {
      targetTier = "boss"; // 第 10 戰：區域世界大 Boss
    } else if (this.zoneKillCount > 0 && this.zoneKillCount % 5 === 4) {
      targetTier = "elite"; // 第 5 戰：菁英小 Boss
    }

    const tierCandidates = this.zoneMonsters.filter((m) => m.tier === targetTier);
    const chosen = tierCandidates.length > 0
      ? tierCandidates[Math.floor(Math.random() * tierCandidates.length)]
      : this.zoneMonsters[Math.floor(Math.random() * this.zoneMonsters.length)];

    this.currentMonster = Object.assign({}, chosen);
    this.monsterMaxHp = chosen.hp || 120;
    this.monsterHp = this.monsterMaxHp;
    this.monsterMaxShield = chosen.shield || 3;
    this.monsterShield = this.monsterMaxShield;

    if (!this.revealedWeaknesses[chosen.id]) {
      this.revealedWeaknesses[chosen.id] = new Set();
    }

    this.renderMonsterUI();
    this.renderPlayerAvatar();
    this.updateTimeline();

    let prefix = "遭遇了";
    if (chosen.tier === "elite") prefix = "⚠️ 警報！遭遇了菁英魔物";
    if (chosen.tier === "boss") prefix = "🚨 終極對決！遭遇了世界守門魔王";

    this.showMessage(
      `${prefix}【<strong>${chosen.name}</strong>】！盾牌層數：${this.monsterShield}！擊中弱點觸發 BREAK 破防！`,
      "info"
    );

    this.nextQuestion();
  },

  renderMonsterUI() {
    const m = this.currentMonster;
    const nameEl = document.getElementById("monsterName");
    const spriteEl = document.getElementById("monsterSprite");
    const tierBadge = document.getElementById("monsterTierBadge");

    if (nameEl) nameEl.textContent = `${m.name} (${m.nameJa || ""})`;
    if (tierBadge) {
      tierBadge.textContent = m.tier === "boss" ? "👑 區域魔王" : m.tier === "elite" ? "⭐ 菁英小Boss" : "🐺 普通魔物";
      tierBadge.className = `chap-badge ${m.tier}`;
    }

    if (spriteEl) {
      spriteEl.src = m.sprite || "assets/monster_slime.jpg";
      spriteEl.alt = m.name;
      spriteEl.classList.remove("hit", "broken");
    }

    this.updateHpBar();
    this.renderWeaknesses();
  },

  renderWeaknesses() {
    const wrap = document.getElementById("monsterWeaknessWrap");
    if (!wrap) return;

    wrap.innerHTML = "";
    const m = this.currentMonster;
    const revealedSet = this.revealedWeaknesses[m.id] || new Set();

    // 1. 盾牌計數器 (Shield Counter)
    const shieldBadge = document.createElement("div");
    shieldBadge.className = `shield-badge ${this.isBroken ? "broken" : ""}`;
    shieldBadge.innerHTML = this.isBroken ? `⚡ BREAK!` : `🛡️ ${this.monsterShield}`;
    wrap.appendChild(shieldBadge);

    // 2. 歧路旅人弱點方塊
    (m.weaknesses || []).forEach((wKey) => {
      const wInfo = this.weaknessMap[wKey] || { label: wKey, icon: "⚔️", color: "#7f8c8d" };
      const isKnown = revealedSet.has(wKey) || this.isBroken;

      const slot = document.createElement("div");
      slot.className = `weakness-slot ${isKnown ? "revealed" : "hidden"}`;
      if (isKnown) {
        slot.style.borderColor = wInfo.color;
        slot.innerHTML = `<span style="font-size:0.9rem;">${wInfo.icon}</span><span style="font-size:0.75rem;margin-left:2px;">${wInfo.label}</span>`;
      } else {
        slot.innerHTML = `<span style="font-size:0.85rem;color:var(--text-sub);">[ ? ]</span>`;
      }
      wrap.appendChild(slot);
    });
  },

  renderPlayerAvatar(pose = "idle") {
    if (window.AvatarManager) {
      window.AvatarManager.renderPreviewOnCanvas("battlePlayerCanvas", 120, 120, pose);
    }
  },

  updatePlayerHpBar() {
    const fill = document.getElementById("playerHpInner");
    const txt = document.getElementById("playerHpText");
    const pct = Math.max(0, Math.min(100, Math.round((this.playerHp / this.playerMaxHp) * 100)));
    if (fill) fill.style.width = `${pct}%`;
    if (txt) txt.textContent = `HP: ${this.playerHp} / ${this.playerMaxHp}`;
  },

  updateHpBar() {
    const fillEl = document.getElementById("monsterHpInner");
    const textEl = document.getElementById("monsterHpText");
    const pct = Math.max(0, Math.min(100, Math.round((this.monsterHp / this.monsterMaxHp) * 100)));
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (textEl) textEl.textContent = `HP: ${this.monsterHp} / ${this.monsterMaxHp}`;
  },

  updateTimeline() {
    const line = document.getElementById("battleTimeline");
    if (!line) return;

    const m = this.currentMonster;
    line.innerHTML = `
      <div class="timeline-token player active" title="目前回合：我方勇者行動">
        <span class="token-icon">⚔️</span>
        <span class="token-name">${window.AvatarManager ? window.AvatarManager.currentAvatar.name : "勇者"}</span>
      </div>
      <div class="timeline-arrow">➔</div>
      <div class="timeline-token enemy ${this.isBroken ? "stunned" : ""}" title="敵方行動順序">
        <span class="token-icon">${m.icon || "👾"}</span>
        <span class="token-name">${m.name}</span>
        ${this.isBroken ? `<span class="stun-tag">暈眩</span>` : ""}
      </div>
      <div class="timeline-arrow">➔</div>
      <div class="timeline-token player next">
        <span class="token-icon">⚔️</span>
        <span class="token-name">勇者</span>
      </div>
    `;
  },

  nextQuestion() {
    this.isAnsweringLocked = false;
    this.renderPlayerAvatar("idle");

    // 若破防狀態持續，扣除破防剩餘回合
    if (this.isBroken) {
      this.breakTurnsRemaining--;
      if (this.breakTurnsRemaining <= 0) {
        this.isBroken = false;
        this.monsterShield = this.monsterMaxShield;
        this.renderWeaknesses();
        this.updateTimeline();
        this.showMessage(`魔物從 BREAK 狀態恢復了意識！盾牌重新充能至 ${this.monsterShield}！`, "info");
      }
    }

    this.currentQuestion = this.generateQuestion(this.currentZone);
    this.renderQuestion(this.currentQuestion);
  },

  generateQuestion(zoneId) {
    const m = this.currentMonster;
    const targetWeaknesses = m.weaknesses || [];
    // 有 70% 機率直接出擊中弱點的題目類型，帶來爽快的破盾節奏
    const favorWeakness = Math.random() < 0.7 && targetWeaknesses.length > 0;
    const pickedWeakness = favorWeakness ? targetWeaknesses[Math.floor(Math.random() * targetWeaknesses.length)] : null;

    if (zoneId === "kana" || pickedWeakness === "kana_romaji" || pickedWeakness === "kana_kata") {
      const kanaPool = this.datasets.kana || [];
      if (!kanaPool.length) return this.getFallbackQuestion();
      const target = kanaPool[Math.floor(Math.random() * kanaPool.length)];

      const isRomaji = pickedWeakness === "kana_romaji" || Math.random() > 0.5;
      if (isRomaji) {
        const distractors = this.pickDistractors(kanaPool, target, 3).map((k) => k.romaji);
        const options = this.shuffle([target.romaji, ...distractors]);
        return {
          type: "kana",
          weaknessKey: "kana_romaji",
          prompt: `平假名「${target.hiragana}」的羅馬拼音是？`,
          audioText: target.hiragana,
          options,
          correctAnswer: target.romaji,
          explanation: `「${target.hiragana}」讀音為 [${target.romaji}]，片假名寫作「${target.katakana}」。`
        };
      } else {
        const distractors = this.pickDistractors(kanaPool, target, 3).map((k) => k.katakana);
        const options = this.shuffle([target.katakana, ...distractors]);
        return {
          type: "kana",
          weaknessKey: "kana_kata",
          prompt: `平假名「${target.hiragana}」對應的片假名是？`,
          audioText: target.hiragana,
          options,
          correctAnswer: target.katakana,
          explanation: `平假名「${target.hiragana}」對應的片假名是「${target.katakana}」[${target.romaji}]。`
        };
      }
    }

    // N5, N4, N3
    const targetLvl = zoneId.toUpperCase();
    const lvlVocab = (this.datasets.vocab || []).filter((v) => v.level === targetLvl);
    const lvlKanji = (this.datasets.kanji || []).filter((k) => k.level === targetLvl);
    const lvlGrammar = (this.datasets.grammar || []).filter((g) => g.level === targetLvl);

    // 聽力題
    if (pickedWeakness === "listening" && lvlVocab.length >= 4) {
      const target = lvlVocab[Math.floor(Math.random() * lvlVocab.length)];
      const distractors = this.pickDistractors(lvlVocab, target, 3).map((v) => v.meaningZh);
      const options = this.shuffle([target.meaningZh, ...distractors]);
      return {
        type: "listening",
        weaknessKey: "listening",
        prompt: `🔊 請聽日語發音，選出正確意思！`,
        audioText: target.reading || target.word,
        isAudioAutoPlay: true,
        options,
        correctAnswer: target.meaningZh,
        explanation: `發音為「${target.word}【${target.reading}】」，意思為「${target.meaningZh}」。`
      };
    }

    // 文法題
    if (pickedWeakness === "grammar_meaning" && lvlGrammar.length >= 4) {
      const target = lvlGrammar[Math.floor(Math.random() * lvlGrammar.length)];
      const distractors = this.pickDistractors(lvlGrammar, target, 3).map((g) => g.title);
      const options = this.shuffle([target.title, ...distractors]);
      return {
        type: "grammar",
        weaknessKey: "grammar_meaning",
        prompt: `哪個文法句型的核心意義是「${target.meaningZh}」？`,
        subPrompt: target.explanation ? target.explanation.slice(0, 45) + "..." : "",
        audioText: target.title,
        options,
        correctAnswer: target.title,
        explanation: `【${target.title}】：${target.meaningZh}。例句：${target.example ? target.example.ja : "—"}`
      };
    }

    // 漢字讀音題
    if ((pickedWeakness === "kanji_on" || pickedWeakness === "kanji_kun") && lvlKanji.length >= 4) {
      const target = lvlKanji[Math.floor(Math.random() * lvlKanji.length)];
      const isKun = pickedWeakness === "kanji_kun";
      const correctReading = isKun && target.kunyomi && target.kunyomi !== "—"
        ? target.kunyomi
        : target.onyomi && target.onyomi !== "—" ? target.onyomi : target.kunyomi || "—";

      const distractors = this.pickDistractors(lvlKanji, target, 3).map((k) =>
        isKun && k.kunyomi && k.kunyomi !== "—" ? k.kunyomi : k.onyomi || k.kunyomi || "—"
      );
      const options = this.shuffle([correctReading, ...distractors]);
      return {
        type: "reading",
        weaknessKey: isKun ? "kanji_kun" : "kanji_on",
        prompt: `漢字「${target.kanji}」的${isKun ? "訓讀" : "音讀"}是？`,
        subPrompt: `（意思：${target.meaningZh}）`,
        audioText: target.kanji,
        options,
        correctAnswer: correctReading,
        explanation: `「${target.kanji}」音讀：${target.onyomi || "—"} / 訓讀：${target.kunyomi || "—"}，意思為「${target.meaningZh}」。`
      };
    }

    // 預設單字詞義題
    const pool = lvlVocab.length >= 4 ? lvlVocab : this.datasets.vocab;
    if (pool && pool.length >= 4) {
      const target = pool[Math.floor(Math.random() * pool.length)];
      const distractors = this.pickDistractors(pool, target, 3).map((v) => v.meaningZh);
      const options = this.shuffle([target.meaningZh, ...distractors]);
      return {
        type: "meaning",
        weaknessKey: "vocab_meaning",
        prompt: `單字「${target.word}」【${target.reading}】的意思是？`,
        audioText: target.word,
        targetWord: target.word,
        targetReading: target.reading,
        options,
        correctAnswer: target.meaningZh,
        explanation: `「${target.word}【${target.reading}】」的意思是「${target.meaningZh}」。`
      };
    }

    return this.getFallbackQuestion();
  },

  getFallbackQuestion() {
    return {
      type: "kana",
      weaknessKey: "kana_romaji",
      prompt: "平假名「あ」的羅馬拼音是？",
      audioText: "あ",
      options: ["a", "i", "u", "e"],
      correctAnswer: "a",
      explanation: "「あ」讀音為 [a]。"
    };
  },

  renderQuestion(q) {
    const promptEl = document.getElementById("quizPrompt");
    const optionsGrid = document.getElementById("quizOptions");
    const msgBox = document.getElementById("battleMsg");

    if (msgBox) {
      msgBox.className = "battle-message-box";
      msgBox.innerHTML = `連擊：<strong style="color:var(--accent-gold);margin-left:4px;">${this.combo} Combo</strong>`;
    }

    if (promptEl) {
      let html = `<div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;">`;
      html += `<span>${q.prompt}</span>`;
      if (q.audioText) {
        html += `<button class="icon-btn" id="quizAudioBtn" title="點擊發音" style="font-size:0.95rem;padding:4px 8px;">🔊 播放發音</button>`;
      }
      // 額外四維度互動按鈕
      if (q.targetReading || q.audioText) {
        html += `<button class="icon-btn speech-mic-btn" id="quizSpeechMicBtn" title="朗讀發音打擊弱點" style="font-size:0.85rem;padding:4px 8px;background:rgba(231,76,60,0.18);border-color:#e74c3c;">🎙️ 語音答題</button>`;
      }
      if (q.targetWord || q.audioText) {
        html += `<button class="icon-btn" id="quizHandwritingBtn" title="開啟手寫板書寫" style="font-size:0.85rem;padding:4px 8px;background:rgba(52,152,219,0.18);border-color:#3498db;">🖌️ 手寫答題</button>`;
      }
      html += `</div>`;

      if (q.subPrompt) {
        html += `<div style="font-size:0.9rem;color:var(--text-sub);margin-top:4px;">${q.subPrompt}</div>`;
      }
      promptEl.innerHTML = html;

      // 綁定發音
      const audioBtn = document.getElementById("quizAudioBtn");
      if (audioBtn) {
        audioBtn.onclick = () => {
          if (window.FuriganaEngine) window.FuriganaEngine.speak(q.audioText);
        };
      }

      // 綁定語音朗讀答題
      const micBtn = document.getElementById("quizSpeechMicBtn");
      if (micBtn && window.SpeechEvaluator) {
        micBtn.onclick = () => {
          window.SpeechEvaluator.startRecord(q.audioText, q.targetReading || q.audioText, (res) => {
            if (res.score >= 70) {
              this.handleOptionClick(q.correctAnswer, null, true);
            }
          });
        };
      }

      // 綁定手寫答題
      const hwBtn = document.getElementById("quizHandwritingBtn");
      if (hwBtn && window.HandwritingBoard) {
        hwBtn.onclick = () => {
          const char = (q.targetWord || q.audioText || "あ")[0];
          window.HandwritingBoard.openModal(char, (res) => {
            if (res.score >= 70) {
              this.handleOptionClick(q.correctAnswer, null, true);
            }
          });
        };
      }
    }

    if (q.isAudioAutoPlay && window.FuriganaEngine) {
      setTimeout(() => window.FuriganaEngine.speak(q.audioText), 300);
    }

    if (optionsGrid) {
      optionsGrid.innerHTML = "";
      q.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt;
        btn.onclick = () => this.handleOptionClick(opt, btn);
        optionsGrid.appendChild(btn);
      });
    }
  },

  handleOptionClick(selectedOpt, btnEl, isSpecialInput = false) {
    if (this.isAnsweringLocked) return;
    this.isAnsweringLocked = true;

    const q = this.currentQuestion;
    const isCorrect = selectedOpt === q.correctAnswer;
    const m = this.currentMonster;
    const spriteEl = document.getElementById("monsterSprite");

    // 標記選項按鈕
    const allBtns = document.querySelectorAll(".option-btn");
    allBtns.forEach((b) => {
      if (b.textContent === q.correctAnswer) b.classList.add("correct");
      else if (b === btnEl && !isCorrect) b.classList.add("wrong");
    });

    if (isCorrect) {
      this.combo++;
      // 我方角色切換出招姿勢
      this.renderPlayerAvatar("attack");

      // 檢查是否擊中弱點 (Weakness Hit)
      const isWeaknessHit = (m.weaknesses || []).includes(q.weaknessKey);
      if (isWeaknessHit) {
        if (!this.revealedWeaknesses[m.id]) this.revealedWeaknesses[m.id] = new Set();
        this.revealedWeaknesses[m.id].add(q.weaknessKey);
      }

      // 破盾邏輯
      let triggeredBreak = false;
      if (isWeaknessHit && !this.isBroken) {
        this.monsterShield = Math.max(0, this.monsterShield - 1);
        if (this.monsterShield === 0) {
          this.isBroken = true;
          this.breakTurnsRemaining = 2; // 破防持續 2 回合
          triggeredBreak = true;
        }
      }

      this.renderWeaknesses();

      // 計算傷害 (破防狀態下造成 200% CRITICAL 暴擊傷害)
      const baseDmg = 35;
      const comboBonus = (this.combo - 1) * 8;
      const rawDmg = baseDmg + comboBonus + Math.floor(Math.random() * 10);
      const totalDmg = this.isBroken ? Math.round(rawDmg * 2.0) : rawDmg;

      this.monsterHp = Math.max(0, this.monsterHp - totalDmg);
      this.updateHpBar();

      // 觸發打擊特效
      if (window.BattleFX) {
        const monsterRect = spriteEl ? spriteEl.getBoundingClientRect() : null;
        const fxCanvas = document.getElementById("battleFxCanvas");
        let fxX = 160, fxY = 140;
        if (fxCanvas && monsterRect) {
          const cRect = fxCanvas.getBoundingClientRect();
          fxX = monsterRect.left - cRect.left + monsterRect.width / 2;
          fxY = monsterRect.top - cRect.top + monsterRect.height / 2;
        }

        if (triggeredBreak) {
          window.BattleFX.spawnBreakBanner(fxX, fxY);
        } else if (isWeaknessHit && !this.isBroken) {
          window.BattleFX.sound.playShieldHit();
        }

        window.BattleFX.spawnSlash(fxX, fxY, isWeaknessHit ? "#f1c40f" : "#3498db", this.isBroken);
        window.BattleFX.spawnDamageText(fxX, fxY, totalDmg, this.isBroken, triggeredBreak);
      }

      // 魔物受擊動畫
      if (spriteEl) {
        spriteEl.classList.add("hit");
        if (this.isBroken) spriteEl.classList.add("broken");
        setTimeout(() => spriteEl.classList.remove("hit"), 350);
      }

      let weaknessNote = isWeaknessHit ? `<span style="color:#f1c40f;font-weight:bold;">【弱點擊中！破除 1 層護盾！】</span>` : "";
      if (triggeredBreak) weaknessNote = `<span style="color:#ff4757;font-weight:bold;font-size:1.05rem;">⚡ 破防成功 (BREAK)！魔物陷入暈眩，承受 200% 暴擊傷害！</span>`;

      this.showMessage(
        `💥 答對了！${weaknessNote} 造成 <strong>${totalDmg}</strong> 點打擊傷害！(${this.combo} 連擊)<br><span style="color:var(--text-sub);">${q.explanation}</span>`,
        "correct"
      );

      // 檢查魔物被擊敗
      if (this.monsterHp <= 0) {
        setTimeout(() => this.handleMonsterDefeated(), 800);
        return;
      }

      // 1.2 秒後推進下一題
      setTimeout(() => this.nextQuestion(), 1200);
    } else {
      // 答錯！
      this.combo = 0;
      if (window.BattleFX) window.BattleFX.sound.playWrong();

      // 魔物反擊，我方受擊
      this.renderPlayerAvatar("hit");
      if (window.BattleFX) window.BattleFX.triggerScreenShake(6);

      const penaltyDmg = 15;
      this.playerHp = Math.max(10, this.playerHp - penaltyDmg);
      this.updatePlayerHpBar();

      this.showMessage(
        `❌ 答錯了！正確答案是【<strong>${q.correctAnswer}</strong>】。<br>魔物反擊造成了 ${penaltyDmg} 點傷害！<br><span style="color:var(--text-sub);">${q.explanation}</span>`,
        "wrong"
      );

      const promptEl = document.getElementById("quizPrompt");
      if (promptEl) {
        const nextBtn = document.createElement("button");
        nextBtn.className = "btn-talk";
        nextBtn.style.marginTop = "10px";
        nextBtn.textContent = "記住了，進入下一回合 ➔";
        nextBtn.onclick = () => this.nextQuestion();
        promptEl.appendChild(nextBtn);
      }
    }
  },

  handleMonsterDefeated() {
    const m = this.currentMonster;
    const bonusExp = m.exp || 30;
    const bonusGold = m.gold || 20;

    this.zoneKillCount++;
    this.renderPlayerAvatar("victory");
    if (window.BattleFX) window.BattleFX.sound.playVictory();

    // 登錄冒險圖鑑收服進度
    this.recordCompendiumCapture(m);

    this.showMessage(
      `🎉 <strong>討伐成功！</strong> 擊敗了 ${m.name}！<br>獲得經驗值 +${bonusExp} EXP、金幣 +${bonusGold} G！詩織好感度 +2！冒險圖鑑已點亮！`,
      "victory"
    );

    if (window.App && window.App.onBattleVictory) {
      window.App.onBattleVictory({
        exp: bonusExp,
        gold: bonusGold,
        affection: 2
      });
    }

    // 2 秒後迎接下一隻魔物
    setTimeout(() => {
      this.spawnNextMonster();
    }, 2000);
  },

  recordCompendiumCapture(monster) {
    try {
      let saved = JSON.parse(localStorage.getItem("nihongo_guild_compendium_monsters") || "[]");
      if (!saved.includes(monster.id)) {
        saved.push(monster.id);
        localStorage.setItem("nihongo_guild_compendium_monsters", JSON.stringify(saved));
      }
    } catch (e) {}
  },

  pickDistractors(arr, excludeItem, count) {
    const copy = arr.filter((x) => x !== excludeItem);
    const result = [];
    while (result.length < count && copy.length > 0) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  },

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  showMessage(msgHtml, type = "info") {
    const msgBox = document.getElementById("battleMsg");
    if (!msgBox) return;
    msgBox.className = `battle-message-box ${type}`;
    msgBox.innerHTML = msgHtml;
  },

  getFallbackMonsters(zoneId) {
    return [
      {
        id: `${zoneId}_01`,
        name: "史萊姆",
        nameJa: "スライム",
        zone: zoneId,
        tier: "normal",
        hp: 120,
        shield: 2,
        weaknesses: ["kana_romaji", "kana_kata"],
        sprite: "assets/monster_slime.jpg",
        icon: "🟢",
        exp: 20,
        gold: 15
      }
    ];
  }
};

window.BattleManager = BattleManager;

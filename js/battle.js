/**
 * battle.js - 冒險者公會日語討伐戰鬥引擎 (RPG Turn-Based Battle Engine)
 */

const BattleManager = {
  datasets: {
    kana: [],
    vocab: [],
    kanji: [],
    grammar: []
  },

  currentZone: "kana", // "kana", "n5", "n4", "n3"
  currentMonster: null,
  monsterHp: 100,
  monsterMaxHp: 100,
  combo: 0,
  currentQuestion: null,
  isAnsweringLocked: false,

  zones: {
    kana: {
      id: "kana",
      name: "新手村莊（五十音平原）",
      monsterName: "草史萊姆 (Slime Lv.1)",
      sprite: "assets/monster_slime.jpg",
      maxHp: 100,
      rewardExp: 30,
      rewardGold: 20
    },
    n5: {
      id: "n5",
      name: "迷霧幽林（N5 森林領地）",
      monsterName: "青苔石魔像 (Moss Golem Lv.5)",
      sprite: "assets/monster_golem.jpg",
      maxHp: 150,
      rewardExp: 50,
      rewardGold: 35
    },
    n4: {
      id: "n4",
      name: "遠古神殿（N4 廢墟地下城）",
      monsterName: "幽暗巨龍 (Abyss Dragon Lv.15)",
      sprite: "assets/monster_dragon.jpg",
      maxHp: 220,
      rewardExp: 80,
      rewardGold: 55
    },
    n3: {
      id: "n3",
      name: "魔王神殿（N3 終極魔王殿）",
      monsterName: "暗黑魔王 (Demon King Lv.30)",
      sprite: "assets/monster_demon_king.jpg",
      maxHp: 300,
      rewardExp: 130,
      rewardGold: 100
    }
  },

  init(datasets) {
    this.datasets = datasets;
    this.bindEvents();
    this.startZone("kana");
  },

  bindEvents() {
    // 地圖切換按鈕
    const mapBtns = document.querySelectorAll(".map-btn");
    mapBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const zoneId = btn.getAttribute("data-zone");
        if (zoneId && this.zones[zoneId]) {
          mapBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.startZone(zoneId);
        }
      });
    });
  },

  startZone(zoneId) {
    this.currentZone = zoneId;
    const z = this.zones[zoneId];
    this.currentMonster = z;
    this.monsterMaxHp = z.maxHp;
    this.monsterHp = z.maxHp;
    this.combo = 0;
    this.isAnsweringLocked = false;

    // 更新魔物 UI
    const nameEl = document.getElementById("monsterName");
    const spriteEl = document.getElementById("monsterSprite");
    if (nameEl) nameEl.textContent = z.monsterName;
    if (spriteEl) {
      spriteEl.src = z.sprite;
      spriteEl.alt = z.monsterName;
      spriteEl.classList.remove("hit");
    }

    this.updateHpBar();
    this.showMessage(`進入【${z.name}】！遭遇了 ${z.monsterName}！準備戰鬥！`, "info");
    this.nextQuestion();
  },

  updateHpBar() {
    const fillEl = document.getElementById("monsterHpInner");
    const textEl = document.getElementById("monsterHpText");
    const pct = Math.max(0, Math.min(100, Math.round((this.monsterHp / this.monsterMaxHp) * 100)));
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (textEl) textEl.textContent = `HP: ${this.monsterHp} / ${this.monsterMaxHp}`;
  },

  nextQuestion() {
    this.isAnsweringLocked = false;
    this.currentQuestion = this.generateQuestion(this.currentZone);
    this.renderQuestion(this.currentQuestion);
  },

  generateQuestion(zoneId) {
    const qTypes = ["reading", "listening", "meaning", "grammar"];
    
    // 五十音村莊專用題型
    if (zoneId === "kana") {
      const kanaPool = this.datasets.kana || [];
      if (!kanaPool.length) return this.getFallbackQuestion();
      const target = kanaPool[Math.floor(Math.random() * kanaPool.length)];
      
      const subType = Math.random() > 0.5 ? "romaji" : "katakana";
      if (subType === "romaji") {
        const distractors = this.pickDistractors(kanaPool, target, 3).map((k) => k.romaji);
        const options = this.shuffle([target.romaji, ...distractors]);
        return {
          type: "kana",
          prompt: `平假名「${target.hiragana}」的羅馬拼音是？`,
          audioText: target.hiragana,
          options,
          correctAnswer: target.romaji,
          explanation: `「${target.hiragana}」的讀音是 [${target.romaji}]，片假名寫作「${target.katakana}」。`
        };
      } else {
        const distractors = this.pickDistractors(kanaPool, target, 3).map((k) => k.katakana);
        const options = this.shuffle([target.katakana, ...distractors]);
        return {
          type: "kana",
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
    const type = qTypes[Math.floor(Math.random() * qTypes.length)];
    const lvlVocab = (this.datasets.vocab || []).filter((v) => v.level === targetLvl);
    const lvlKanji = (this.datasets.kanji || []).filter((k) => k.level === targetLvl);
    const lvlGrammar = (this.datasets.grammar || []).filter((g) => g.level === targetLvl);

    if (type === "reading" && lvlKanji.length >= 4) {
      // 漢字讀音題
      const target = lvlKanji[Math.floor(Math.random() * lvlKanji.length)];
      const correctReading = target.onyomi && target.onyomi !== "—" ? target.onyomi : target.kunyomi || "—";
      const distractors = this.pickDistractors(lvlKanji, target, 3).map(
        (k) => (k.onyomi && k.onyomi !== "—" ? k.onyomi : k.kunyomi || "—")
      );
      const options = this.shuffle([correctReading, ...distractors]);
      return {
        type: "reading",
        prompt: `漢字「${target.kanji}」的主要讀音是？`,
        subPrompt: `（意思：${target.meaningZh}）`,
        audioText: target.kanji,
        options,
        correctAnswer: correctReading,
        explanation: `「${target.kanji}」音讀：${target.onyomi || "—"} / 訓讀：${target.kunyomi || "—"}，意思為「${target.meaningZh}」。`
      };
    }

    if (type === "listening" && lvlVocab.length >= 4) {
      // 聽力題 (請聽語音選意思)
      const target = lvlVocab[Math.floor(Math.random() * lvlVocab.length)];
      const distractors = this.pickDistractors(lvlVocab, target, 3).map((v) => v.meaningZh);
      const options = this.shuffle([target.meaningZh, ...distractors]);
      return {
        type: "listening",
        prompt: `🔊 點擊按鈕聽發音，選出正確意思！`,
        audioText: target.reading || target.word,
        isAudioAutoPlay: true,
        options,
        correctAnswer: target.meaningZh,
        explanation: `發音為「${target.word}【${target.reading}】」，中文意思是「${target.meaningZh}」。`
      };
    }

    if (type === "grammar" && lvlGrammar.length >= 4) {
      // 文法填空題
      const target = lvlGrammar[Math.floor(Math.random() * lvlGrammar.length)];
      const distractors = this.pickDistractors(lvlGrammar, target, 3).map((g) => g.title);
      const options = this.shuffle([target.title, ...distractors]);
      return {
        type: "grammar",
        prompt: `哪個文法句型的核心意義是「${target.meaningZh}」？`,
        subPrompt: target.explanation ? target.explanation.slice(0, 45) + "..." : "",
        audioText: target.title,
        options,
        correctAnswer: target.title,
        explanation: `【${target.title}】：${target.meaningZh}。例句：${target.example ? target.example.ja : "—"}`
      };
    }

    // 預設字義題 (Vocab Meaning)
    const pool = lvlVocab.length >= 4 ? lvlVocab : this.datasets.vocab;
    if (pool && pool.length >= 4) {
      const target = pool[Math.floor(Math.random() * pool.length)];
      const distractors = this.pickDistractors(pool, target, 3).map((v) => v.meaningZh);
      const options = this.shuffle([target.meaningZh, ...distractors]);
      return {
        type: "meaning",
        prompt: `單字「${target.word}」【${target.reading}】的意思是？`,
        audioText: target.word,
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
      prompt: "平假名「あ」的羅馬拼音是？",
      audioText: "あ",
      options: ["a", "i", "u", "e"],
      correctAnswer: "a",
      explanation: "「あ」讀音為 [a]。"
    };
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
        html += `<button class="icon-btn" id="quizAudioBtn" title="點擊發音" style="font-size:1.1rem;padding:4px 8px;">🔊 播放發音</button>`;
      }
      html += `</div>`;
      if (q.subPrompt) {
        html += `<div style="font-size:0.9rem;color:var(--text-sub);margin-top:4px;">${q.subPrompt}</div>`;
      }
      promptEl.innerHTML = html;

      // 綁定發音按鈕
      const audioBtn = document.getElementById("quizAudioBtn");
      if (audioBtn) {
        audioBtn.addEventListener("click", () => {
          if (window.FuriganaEngine) {
            window.FuriganaEngine.speak(q.audioText);
          }
        });
      }
    }

    // 自動播放聽力題語音
    if (q.isAudioAutoPlay && window.FuriganaEngine) {
      setTimeout(() => {
        window.FuriganaEngine.speak(q.audioText);
      }, 300);
    }

    if (optionsGrid) {
      optionsGrid.innerHTML = "";
      q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt;
        btn.addEventListener("click", () => this.handleOptionClick(opt, btn));
        optionsGrid.appendChild(btn);
      });
    }
  },

  handleOptionClick(selectedOpt, btnEl) {
    if (this.isAnsweringLocked) return;
    this.isAnsweringLocked = true;

    const q = this.currentQuestion;
    const isCorrect = selectedOpt === q.correctAnswer;
    const spriteEl = document.getElementById("monsterSprite");

    // 標記選項顏色
    const allBtns = document.querySelectorAll(".option-btn");
    allBtns.forEach((b) => {
      if (b.textContent === q.correctAnswer) {
        b.classList.add("correct");
      } else if (b === btnEl && !isCorrect) {
        b.classList.add("wrong");
      }
    });

    if (isCorrect) {
      this.combo++;
      const baseDmg = 25;
      const comboBonus = (this.combo - 1) * 6;
      const randomDmg = Math.floor(Math.random() * 8);
      const totalDmg = baseDmg + comboBonus + randomDmg;

      this.monsterHp = Math.max(0, this.monsterHp - totalDmg);
      this.updateHpBar();

      // 受擊動畫
      if (spriteEl) {
        spriteEl.classList.add("hit");
        setTimeout(() => spriteEl.classList.remove("hit"), 400);
      }

      const praiseList = [
        "太棒了！精準命中！",
        "漂亮！答得又快又準！",
        "連擊持續中！詩織為你加油！",
        "好厲害！魔物受到重大打擊！"
      ];
      const praise = praiseList[Math.floor(Math.random() * praiseList.length)];

      this.showMessage(
        `💥 答對了！造成 <strong>${totalDmg}</strong> 點傷害！(${this.combo} 連擊)<br><span style="color:var(--text-sub);">${praise}</span>`,
        "correct"
      );

      // 檢查魔物是否被擊敗
      if (this.monsterHp <= 0) {
        setTimeout(() => this.handleMonsterDefeated(), 1000);
        return;
      }

      // 1.3 秒後下一題
      setTimeout(() => this.nextQuestion(), 1300);
    } else {
      this.combo = 0;
      this.showMessage(
        `❌ 答錯了！正確答案是【<strong>${q.correctAnswer}</strong>】。<br><span style="color:var(--text-sub);">${q.explanation}</span>`,
        "wrong"
      );

      // 提供繼續按鈕
      const promptEl = document.getElementById("quizPrompt");
      if (promptEl) {
        const nextBtn = document.createElement("button");
        nextBtn.className = "btn-talk";
        nextBtn.style.marginTop = "10px";
        nextBtn.textContent = "記住了，進入下一題 ➔";
        nextBtn.addEventListener("click", () => this.nextQuestion());
        promptEl.appendChild(nextBtn);
      }
    }
  },

  handleMonsterDefeated() {
    const z = this.currentMonster;
    const bonusExp = z.rewardExp;
    const bonusGold = z.rewardGold;

    this.showMessage(
      `🎉 <strong>討伐成功！</strong> 擊敗了 ${z.monsterName}！<br>獲得經驗值 +${bonusExp} EXP、金幣 +${bonusGold} G！詩織好感度 +2！`,
      "victory"
    );

    // 回調通知主應用程式更新玩家數據
    if (window.App && window.App.onBattleVictory) {
      window.App.onBattleVictory({
        exp: bonusExp,
        gold: bonusGold,
        affection: 2
      });
    }

    // 重新產生新魔物
    setTimeout(() => {
      this.monsterHp = this.monsterMaxHp;
      this.updateHpBar();
      this.nextQuestion();
    }, 2000);
  },

  showMessage(msgHtml, type = "info") {
    const msgBox = document.getElementById("battleMsg");
    if (!msgBox) return;
    msgBox.className = `battle-message-box ${type}`;
    msgBox.innerHTML = msgHtml;
  }
};

window.BattleManager = BattleManager;

/**
 * srs.js - SM-2 間隔重複記憶抽認卡系統
 */

const SRSManager = {
  allCards: [],
  dueCards: [],
  currentCardIndex: 0,
  filterLevel: "ALL", // "ALL", "N5", "N4", "N3", "KANJI"

  init(vocabData, kanjiData, kanaData, savedCards = {}) {
    this.allCards = [];

    // 載入假名卡
    kanaData.forEach((k) => {
      this.allCards.push({
        id: k.id,
        type: "kana",
        level: "N5",
        front: k.hiragana,
        subFront: k.katakana,
        back: k.romaji,
        reading: k.hiragana,
        meaning: `發音 [${k.romaji}]・${k.example || ""}`,
        example: k.example || ""
      });
    });

    // 載入漢字卡
    kanjiData.forEach((k) => {
      this.allCards.push({
        id: k.id,
        type: "kanji",
        level: k.level,
        front: k.kanji,
        subFront: `筆畫：${k.strokes} 畫`,
        back: k.meaningZh,
        reading: `音：${k.onyomi || "—"} / 訓：${k.kunyomi || "—"}`,
        meaning: k.meaningZh,
        example: (k.examples || []).join("、")
      });
    });

    // 載入單字卡
    vocabData.forEach((v) => {
      this.allCards.push({
        id: v.id,
        type: "vocab",
        level: v.level,
        front: v.word,
        subFront: `[${v.pos || "單字"}]`,
        back: v.meaningZh,
        reading: v.reading,
        meaning: v.meaningZh,
        example: v.exampleSentence ? v.exampleSentence.ja : ""
      });
    });

    // 合併存檔中的 SRS 狀態
    const todayStr = new Date().toISOString().split("T")[0];
    this.allCards.forEach((c) => {
      const s = savedCards[c.id];
      if (s) {
        c.interval = s.interval;
        c.repetition = s.repetition;
        c.efactor = s.efactor;
        c.dueDate = s.dueDate;
      } else {
        c.interval = 0;
        c.repetition = 0;
        c.efactor = 2.5;
        c.dueDate = todayStr; // 新卡預設今天可複習
      }
    });

    this.filterDueCards();
  },

  setFilter(lvl) {
    this.filterLevel = lvl;
    this.filterDueCards();
    this.renderCurrentCard();
  },

  filterDueCards() {
    const todayStr = new Date().toISOString().split("T")[0];
    this.dueCards = this.allCards.filter((c) => {
      const isDue = c.dueDate <= todayStr;
      if (!isDue) return false;
      if (this.filterLevel === "ALL") return true;
      if (this.filterLevel === "KANJI") return c.type === "kanji";
      return c.level === this.filterLevel;
    });
    this.currentCardIndex = 0;
  },

  getCurrentCard() {
    if (this.dueCards.length === 0) return null;
    return this.dueCards[this.currentCardIndex % this.dueCards.length];
  },

  /**
   * SM-2 評分計算 (rating: 1=Again, 2=Hard, 3=Good, 4=Easy)
   */
  answerCard(rating) {
    const card = this.getCurrentCard();
    if (!card) return;

    // SM-2 演算法核心
    // rating 轉換為 SM-2 的 quality (0~5): 1->1, 2->3, 3->4, 4->5
    const qMap = { 1: 1, 2: 3, 3: 4, 4: 5 };
    const quality = qMap[rating] || 3;

    if (quality < 3) {
      card.repetition = 0;
      card.interval = 1;
    } else {
      if (card.repetition === 0) {
        card.interval = 1;
      } else if (card.repetition === 1) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.efactor);
      }
      card.repetition += 1;
    }

    card.efactor = Math.max(1.3, card.efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    // 計算下次到期日
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + card.interval);
    card.dueDate = nextDate.toISOString().split("T")[0];

    // 更新到全域存檔
    if (window.App && window.App.playerData) {
      window.App.playerData.srs.cards[card.id] = {
        interval: card.interval,
        repetition: card.repetition,
        efactor: card.efactor,
        dueDate: card.dueDate
      };
      
      // 給予少許 EXP 與金幣
      window.App.addRewards(rating >= 3 ? 5 : 2, 1);
      window.App.saveProgress();
    }

    // 移動到下一張
    this.dueCards.splice(this.currentCardIndex, 1);
    if (this.dueCards.length > 0) {
      this.currentCardIndex = this.currentCardIndex % this.dueCards.length;
    }
    this.renderCurrentCard();
  },

  renderCurrentCard() {
    const card = this.getCurrentCard();
    const flashcardEl = document.getElementById("srs-flashcard");
    const counterEl = document.getElementById("srs-card-counter");
    if (!flashcardEl) return;

    flashcardEl.classList.remove("flipped");

    if (counterEl) {
      counterEl.textContent = `待複習卡片：${this.dueCards.length} 張`;
    }

    if (!card) {
      document.getElementById("srs-front-word").textContent = "🎉";
      document.getElementById("srs-front-sub").textContent = "太棒了！今日所有卡片已複習完畢！";
      document.getElementById("srs-back-reading").textContent = "素晴らしい！";
      document.getElementById("srs-back-meaning").textContent = "明天請繼續保持冒險精神！";
      document.getElementById("srs-back-example").textContent = "";
      return;
    }

    // 正面
    document.getElementById("srs-front-word").textContent = card.front;
    document.getElementById("srs-front-sub").textContent = card.subFront;

    // 背面
    document.getElementById("srs-back-reading").textContent = card.reading;
    document.getElementById("srs-back-meaning").textContent = card.meaning;
    document.getElementById("srs-back-example").innerHTML = window.FuriganaEngine ? window.FuriganaEngine.parseToRuby(card.example) : card.example;

    // 自動語音按鈕
    const speakBtn = document.getElementById("srs-speak-btn");
    if (speakBtn) {
      speakBtn.onclick = (e) => {
        e.stopPropagation();
        if (window.FuriganaEngine) window.FuriganaEngine.speak(card.front);
      };
    }
  }
};

window.SRSManager = SRSManager;

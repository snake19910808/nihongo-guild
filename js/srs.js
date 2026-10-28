/**
 * srs.js - SM-2 間隔重複記憶神殿（日常化 5～15 張無痛打卡 + 自由檢索）
 * Daily-Bite-Sized SRS Deck Tied to 398-Day Plan + Full Mastery Deck
 */

const SRSManager = {
  allCards: [],
  dueCards: [],
  currentCardIndex: 0,
  mode: "daily", // "daily" (今日 5~15 張精準打卡) | "all" (全書庫自主複習)
  filterLevel: "ALL", // "ALL", "N5", "N4", "N3", "KANJI"
  dailyCardsCount: 0,
  dailyCompletedCount: 0,

  init(vocabData, kanjiData, kanaData, savedCards = {}, scheduleDayData = null) {
    this.allCards = [];
    const saved = savedCards || {};

    // 1. 假名卡
    (kanaData || []).forEach((k) => {
      this.allCards.push({
        id: k.id,
        type: "kana",
        level: "N5",
        front: k.hiragana,
        subFront: `片假名：${k.katakana}`,
        back: k.romaji,
        reading: k.hiragana,
        meaning: `羅馬拼音 [${k.romaji}]・${k.example || ""}`,
        example: k.example || "",
        tags: ["kana", k.hiragana, k.katakana, k.romaji]
      });
    });

    // 2. 漢字卡
    (kanjiData || []).forEach((k) => {
      this.allCards.push({
        id: k.id,
        type: "kanji",
        level: k.level,
        front: k.kanji,
        subFront: `筆畫：${k.strokes} 畫 ｜ ${k.level}`,
        back: k.meaningZh,
        reading: `音讀：${k.onyomi || "—"} / 訓讀：${k.kunyomi || "—"}`,
        meaning: k.meaningZh,
        example: (k.examples || []).join("、"),
        tags: ["kanji", k.kanji, k.meaningZh]
      });
    });

    // 3. 單字卡
    (vocabData || []).forEach((v) => {
      this.allCards.push({
        id: v.id,
        type: "vocab",
        level: v.level,
        front: v.word,
        subFront: `[${v.pos || "單字"}] ｜ ${v.level}`,
        back: v.meaningZh,
        reading: v.reading,
        meaning: v.meaningZh,
        example: v.exampleSentence ? v.exampleSentence.ja : "",
        tags: ["vocab", v.word, v.reading, v.meaningZh]
      });
    });

    // 合併存檔狀態
    const todayStr = new Date().toISOString().split("T")[0];
    this.allCards.forEach((c) => {
      const s = saved[c.id];
      if (s) {
        c.interval = s.interval;
        c.repetition = s.repetition;
        c.efactor = s.efactor;
        c.dueDate = s.dueDate;
        c.isLearned = true;
      } else {
        c.interval = 0;
        c.repetition = 0;
        c.efactor = 2.5;
        c.dueDate = null; // 未排程的新卡
        c.isLearned = false;
      }
    });

    this.rebuildDeck(scheduleDayData);
  },

  /**
   * 重構抽認卡牌組（優先建立今日 5～15 張課堂卡片）
   */
  rebuildDeck(scheduleDayData = null) {
    const todayStr = new Date().toISOString().split("T")[0];

    if (this.mode === "daily") {
      // 提取今日課表分配之單字與漢字
      let targetIds = new Set();
      if (scheduleDayData) {
        (scheduleDayData.assignedVocab || []).forEach((w) => {
          const match = this.allCards.find((c) => c.front === w || c.reading === w);
          if (match) targetIds.add(match.id);
        });
        (scheduleDayData.assignedKanji || []).forEach((k) => {
          const match = this.allCards.find((c) => c.front === k);
          if (match) targetIds.add(match.id);
        });
        (scheduleDayData.assignedKana || []).forEach((k) => {
          const match = this.allCards.find((c) => c.front === k);
          if (match) targetIds.add(match.id);
        });
      }

      // 如果今日課表卡少於 8 張，補充歷史到期需要複習的卡片
      const dueCardsHistory = this.allCards.filter((c) => c.dueDate && c.dueDate <= todayStr);
      dueCardsHistory.slice(0, 10).forEach((c) => targetIds.add(c.id));

      // 若還是不足，從 N5/假名中補充至 8 張（確保初學者隨時有卡可背）
      if (targetIds.size < 5) {
        const fallbacks = this.allCards.filter((c) => c.level === "N5" || c.type === "kana");
        for (let i = 0; i < fallbacks.length && targetIds.size < 8; i++) {
          targetIds.add(fallbacks[i].id);
        }
      }

      this.dueCards = this.allCards.filter((c) => targetIds.has(c.id));
      this.dailyCardsCount = this.dueCards.length;
      this.dailyCompletedCount = 0;
    } else {
      // 全庫自主檢索模式
      this.dueCards = this.allCards.filter((c) => {
        if (this.filterLevel === "ALL") return true;
        if (this.filterLevel === "KANJI") return c.type === "kanji";
        return c.level === this.filterLevel;
      });
    }

    this.currentCardIndex = 0;
  },

  setMode(mode, scheduleDayData = null) {
    this.mode = mode;
    this.rebuildDeck(scheduleDayData);
  },

  setFilter(lvl) {
    this.filterLevel = lvl;
    if (this.mode === "all") {
      this.rebuildDeck();
    }
  },

  getCurrentCard() {
    if (this.dueCards.length === 0) return null;
    return this.dueCards[this.currentCardIndex % this.dueCards.length];
  },

  gradeCurrentCard(rating) {
    const card = this.getCurrentCard();
    if (!card) return;

    // SM-2 演算法 (rating: 1=Again, 2=Hard, 3=Good, 4=Easy)
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
      card.isLearned = true;
    }

    card.efactor = Math.max(1.3, card.efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    // 到期日計算
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + card.interval);
    card.dueDate = nextDate.toISOString().split("T")[0];

    // 更新每日完成進度
    if (quality >= 3) {
      this.dailyCompletedCount++;
    }

    // 移除當前已過關卡片
    this.dueCards.splice(this.currentCardIndex % this.dueCards.length, 1);

    // 檢查今日卡包是否全數通關
    if (this.dueCards.length === 0 && this.mode === "daily") {
      if (window.App && window.App.showToast) {
        window.App.showToast("🎉 恭喜完成今日抽認卡修煉！已完成今日【神殿複習】子委託！", "success");
      }
      // 自動打勾今日任務
      if (window.App && window.App.markTaskComplete) {
        window.App.markTaskComplete("task_srs");
      }
    }
  },

  getStats() {
    const mastered = this.allCards.filter((c) => c.repetition >= 3).length;
    return {
      due: this.dueCards.length,
      total: this.allCards.length,
      mastered,
      dailyTarget: this.dailyCardsCount,
      dailyDone: this.dailyCompletedCount
    };
  },

  getSavedCardsData() {
    const res = {};
    this.allCards.forEach((c) => {
      if (c.dueDate) {
        res[c.id] = {
          interval: c.interval,
          repetition: c.repetition,
          efactor: c.efactor,
          dueDate: c.dueDate
        };
      }
    });
    return res;
  }
};

window.SRSManager = SRSManager;

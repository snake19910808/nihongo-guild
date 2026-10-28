/**
 * furigana.js - 假名注音引擎與語音朗讀
 * 支援三段式切換 (🟢全標 / 🟡智慧 / 🔴隱藏) 與冒險者點詞查字小卡
 */

const FuriganaEngine = {
  currentMode: "all", // "all", "smart", "hidden"
  masteredWords: new Set(),

  init(initialMode = "all", masteredList = []) {
    this.currentMode = initialMode;
    this.masteredWords = new Set(masteredList);
    this.applyModeToBody();
    
    // 預先載入瀏覽器語音清單
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  },

  setMode(mode) {
    this.currentMode = mode;
    this.applyModeToBody();
    if (window.App && window.App.saveProgress) {
      window.App.playerData.progress.furiganaMode = mode;
      window.App.saveProgress();
    }
  },

  applyModeToBody() {
    document.body.classList.remove("furi-all", "furi-smart", "furi-hidden");
    document.body.classList.add(`furi-${this.currentMode}`);
    
    // 更新按鈕樣式
    document.querySelectorAll(".furi-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === this.currentMode);
    });
  },

  /**
   * 將括號標記法 "私[わたし]は学生[がくせい]です。" 轉換為 HTML <ruby> 標籤
   */
  parseToRuby(text) {
    if (!text) return "";
    return text.replace(/([一-龯々]+)\[([ぁ-んァ-ヶー]+)\]/g, (match, kanji, kana) => {
      const isMastered = this.masteredWords.has(kanji);
      const masteredClass = isMastered ? " class='mastered'" : "";
      return `<ruby class="ruby-word" data-word="${kanji}" data-reading="${kana}">${kanji}<rt${masteredClass}>${kana}</rt></ruby>`;
    });
  },

  render(text) {
    return this.parseToRuby(text);
  },

  /**
   * 使用 Web Speech API 朗讀日語發音
   */
  speak(text) {
    if (!("speechSynthesis" in window)) {
      console.warn("當前瀏覽器不支援 Web Speech API");
      if (window.App && window.App.showToast) {
        window.App.showToast("您的瀏覽器未支援語音朗讀功能", "error");
      }
      return;
    }
    
    // 如果語音引擎處於暫停狀態，先嘗試恢復
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel(); // 停止先前的朗讀

    // 去除括號讀音與 HTML 標籤只保留純文字
    const cleanText = text.replace(/\[.*?\]/g, "").replace(/<[^>]*>/g, "").trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "ja-JP";
    utterance.rate = 0.95; // 稍微放慢一點適合學習者
    utterance.pitch = 1.05; // 微微提高音調，貼近詩織溫柔女聲

    // 尋找最佳日文語音包（優先尋找日語女性語音包）
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const femaleJaVoice = voices.find(
        (v) => (v.lang.startsWith("ja") || v.lang.includes("JP")) &&
               (v.name.includes("Female") || v.name.includes("Kyoko") || v.name.includes("Nanami") || v.name.includes("Haruka") || v.name.includes("Ayumi") || v.name.includes("Google 日本語"))
      );
      const anyJaVoice = voices.find((v) => v.lang.startsWith("ja") || v.lang.includes("JP"));
      if (femaleJaVoice || anyJaVoice) {
        utterance.voice = femaleJaVoice || anyJaVoice;
      }
    }

    utterance.onerror = (e) => {
      console.warn("Web Speech API 朗讀異常：", e);
    };

    window.speechSynthesis.speak(utterance);
  },

  /**
   * 開啟點詞查字字典小卡
   */
  openDictModal(wordOrKanji, reading = "", meaning = "", example = "") {
    const modal = document.getElementById("dict-modal");
    if (!modal) return;

    document.getElementById("dict-modal-title").innerHTML = this.parseToRuby(wordOrKanji);
    document.getElementById("dict-modal-reading").textContent = reading;
    document.getElementById("dict-modal-meaning").textContent = meaning || "冒險者單字庫收錄";
    document.getElementById("dict-modal-example").innerHTML = this.parseToRuby(example);

    const speakBtn = document.getElementById("dict-modal-speak");
    if (speakBtn) {
      speakBtn.onclick = () => this.speak(wordOrKanji);
    }

    modal.classList.add("active");
  }
};

window.FuriganaEngine = FuriganaEngine;

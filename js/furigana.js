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

  currentAudio: null,
  voicevoxSpeakerId: 17, // 預設 17: 九州そら（セクシー / 魅惑性感成熟大姊姊音）

  setVoiceStyle(speakerId) {
    this.voicevoxSpeakerId = parseInt(speakerId) || 17;
  },

  /**
   * 詩織日語語音朗讀核心 (VOICEVOX 色氣動漫音 + 瀏覽器動漫調諧音雙引擎)
   */
  async speak(text) {
    // 去除括號讀音與 HTML 標籤只保留純文字
    const cleanText = text.replace(/\[.*?\]/g, "").replace(/<[^>]*>/g, "").trim();
    if (!cleanText) return;

    // 停止前一個正在播放的音訊
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
    }

    // 1. 優先嘗試調用 VOICEVOX 超高人氣色氣動漫女聲 (九州そら セクシー)
    try {
      const ok = await this.playVoicevox(cleanText);
      if (ok) return;
    } catch (err) {
      console.warn("VOICEVOX 雲端生成暫時異常，切換至動漫調諧語音：", err);
    }

    // 2. 備用方案：瀏覽器 Web Speech API (經過年輕動漫女聲重度調頻，告別老阿姨)
    this.speakBrowser(cleanText);
  },

  /**
   * 調用 VOICEVOX 線上日式動漫角色語音
   */
  async playVoicevox(text) {
    // 截取適當長度避免生成延遲過久
    const shortText = text.slice(0, 120);
    const speakerId = this.voicevoxSpeakerId || 17;
    const url = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(shortText)}&speaker=${speakerId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return false;

    const data = await res.json();
    if (!data.success && !data.mp3DownloadUrl) return false;

    const mp3Url = data.mp3DownloadUrl || data.wavDownloadUrl;
    const statusUrl = data.audioStatusUrl;

    // 輪詢確認音訊合成完成 (通常 0.5 ~ 1 秒完成)
    if (statusUrl) {
      for (let i = 0; i < 5; i++) {
        try {
          const sRes = await fetch(statusUrl);
          const sData = await sRes.json();
          if (sData.isAudioReady) break;
        } catch (e) {}
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return new Promise((resolve) => {
      const audio = new Audio(mp3Url);
      this.currentAudio = audio;
      audio.onplay = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
      setTimeout(() => resolve(true), 2000);
    });
  },

  /**
   * 瀏覽器 Web Speech API 備用語音 (經高調音修正)
   */
  speakBrowser(cleanText) {
    if (!("speechSynthesis" in window)) {
      console.warn("當前瀏覽器不支援 Web Speech API");
      return;
    }
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "ja-JP";
    // 關鍵調音：大幅拉高音調 (Pitch) 與語速 (Rate)，徹底消除沉悶機器人老態！
    utterance.pitch = 1.38; // 1.38 動漫高甜調音
    utterance.rate = 1.08;  // 1.08 輕快自然少女/少婦語速

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const googleVoice = voices.find((v) => v.name.includes("Google 日本語"));
      const femaleJaVoice = voices.find(
        (v) => (v.lang.startsWith("ja") || v.lang.includes("JP")) &&
               (v.name.includes("Nanami") || v.name.includes("Kyoko") || v.name.includes("Aoi") || v.name.includes("Mayu") || v.name.includes("Ayumi"))
      );
      const anyJaVoice = voices.find((v) => v.lang.startsWith("ja") || v.lang.includes("JP"));
      if (googleVoice || femaleJaVoice || anyJaVoice) {
        utterance.voice = googleVoice || femaleJaVoice || anyJaVoice;
      }
    }

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

/**
 * furigana.js - 假名注音引擎與語音朗讀
 * 支援三段式切換 (🟢全標 / 🟡智慧 / 🔴隱藏) 與冒險者點詞查字小卡
 */

const FuriganaEngine = {
  currentMode: "all", // "all", "smart", "hidden"
  masteredWords: new Set(),

  cachedVoices: [],

  init(initialMode = "all", masteredList = []) {
    this.currentMode = initialMode;
    this.masteredWords = new Set(masteredList);
    this.applyModeToBody();
    
    // 預先載入並持續快取瀏覽器語音清單
    this.initVoices();
  },

  initVoices() {
    if (!("speechSynthesis" in window)) return;
    const update = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          this.cachedVoices = v;
        }
      } catch (e) {}
    };
    update();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = update;
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

  toRubyHtml(text) {
    return this.parseToRuby(text);
  },

  currentAudio: null,
  voicevoxSpeakerId: 0, // 預設 0: 瀏覽器動漫高甜少女音 (1.38 Pitch) 零延遲且穩定絕不跑掉

  setVoiceStyle(speakerId) {
    this.voicevoxSpeakerId = parseInt(speakerId) || 0;
  },

  /**
   * 詩織日語語音朗讀核心 (預設直接調用動漫高甜調諧音，零秒延遲且穩定絕不跑掉)
   */
  speak(text, options = {}) {
    if (!text) return;
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

    // 若使用者主動在設定選擇了 VOICEVOX 聲線 (> 0) 才嘗試網路合成
    if (this.voicevoxSpeakerId && this.voicevoxSpeakerId > 0) {
      this.playVoicevox(cleanText).catch(() => {
        this.speakBrowser(cleanText, options);
      });
      return;
    }

    // 預設一律直接以瀏覽器動漫少女調諧音立即發音 (同步觸發，零延遲，絕不跑掉)
    this.speakBrowser(cleanText, options);
  },

  /**
   * 取得跨平台最佳日語語音包 (支援 Windows, Mac, Android ja_JP, iOS)
   * 嚴格篩選動漫高甜女聲，堅決排除男性、機器人與非日語合成音
   */
  getBestJapaneseVoice() {
    if (!("speechSynthesis" in window)) return null;
    let voices = this.cachedVoices;
    if (!voices || voices.length === 0) {
      voices = window.speechSynthesis.getVoices() || [];
      if (voices.length > 0) this.cachedVoices = voices;
    }
    if (!voices || voices.length === 0) return null;

    // 1. 優先尋找 Microsoft Nanami Online (Natural) - Edge 內建神級甜美自然女聲
    const nanamiVoice = voices.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes("nanami") && (v.lang.toLowerCase().startsWith("ja") || n.includes("japanese") || n.includes("japan"));
    });
    if (nanamiVoice) return nanamiVoice;

    // 2. 優先尋找 Google 日本語 (Chrome 內建極高品質神經網路女聲)
    const googleJa = voices.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes("google") && (v.lang.toLowerCase().startsWith("ja") || n.includes("日本語") || n.includes("japanese"));
    });
    if (googleJa) return googleJa;

    // 3. 尋找 Windows / Mac / iOS 知名日系女性美聲 (Haruka, Ayumi, Sayaka, Kyoko, Otoya, Aoi, Mayu)
    const sweetFemaleList = ["haruka", "ayumi", "sayaka", "kyoko", "otoya", "aoi", "mayu", "shiori", "hina"];
    for (const name of sweetFemaleList) {
      const found = voices.find((v) => {
        const l = v.lang.replace("_", "-").toLowerCase();
        const n = v.name.toLowerCase();
        return (l.startsWith("ja") || n.includes("japanese") || n.includes("japan")) && n.includes(name);
      });
      if (found) return found;
    }

    // 4. 尋找標註 female 的日語語音
    const anyFemaleJa = voices.find((v) => {
      const l = v.lang.replace("_", "-").toLowerCase();
      const n = v.name.toLowerCase();
      return (l.startsWith("ja") || n.includes("japanese")) && (n.includes("female") || n.includes("女"));
    });
    if (anyFemaleJa) return anyFemaleJa;

    // 5. 任何日語語音 (相容 Android ja_JP 等)，但嚴格排除男性與非日語
    const maleBlacklist = ["ichiro", "keita", "male", "david", "mark", "george", "hanhan", "yating", "zhiwei", "男"];
    const safeJa = voices.find((v) => {
      const l = v.lang.replace("_", "-").toLowerCase();
      const n = v.name.toLowerCase();
      const isJa = l.startsWith("ja") || n.includes("japanese") || n.includes("japan") || n.includes("日本語");
      const isMale = maleBlacklist.some((bad) => n.includes(bad));
      return isJa && !isMale;
    });
    if (safeJa) return safeJa;

    // 6. 若實在只有普通日語語音 (例如 Android 原生 ja_JP)
    const anyJa = voices.find((v) => {
      const l = v.lang.replace("_", "-").toLowerCase();
      return l.startsWith("ja") || v.name.toLowerCase().includes("japanese") || v.name.includes("日本語");
    });
    return anyJa || null;
  },

  /**
   * 瀏覽器 Web Speech API 核心 (1.38 Pitch 高甜動漫調音)
   */
  speakBrowser(cleanText, options = {}) {
    if (!("speechSynthesis" in window)) {
      console.warn("當前瀏覽器不支援 Web Speech API");
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel(); // 停止先前的朗讀

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "ja-JP";
    // 關鍵高甜調音：Pitch 設為 1.38，語速 1.05，徹底消除老太婆慢速機械老態！
    utterance.pitch = (options && options.pitch) ? options.pitch : 1.38;
    utterance.rate = (options && options.rate) ? options.rate : 1.05;

    const voice = this.getBestJapaneseVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onerror = (e) => {
      console.warn("Web Speech API 朗讀異常：", e);
    };

    window.speechSynthesis.speak(utterance);
  },

  /**
   * 調用 VOICEVOX 線上日式動漫角色語音 (備選)
   */
  async playVoicevox(text) {
    const shortText = text.slice(0, 120);
    const speakerId = this.voicevoxSpeakerId || 17;
    const url = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(shortText)}&speaker=${speakerId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("VOICEVOX 請求失敗");

    const data = await res.json();
    if (!data.success && !data.mp3DownloadUrl) throw new Error("VOICEVOX 未返回音訊");

    const mp3Url = data.mp3DownloadUrl || data.wavDownloadUrl;
    const statusUrl = data.audioStatusUrl;

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

    return new Promise((resolve, reject) => {
      const audio = new Audio(mp3Url);
      this.currentAudio = audio;
      audio.onplay = () => resolve(true);
      audio.onerror = () => reject(new Error("音訊播放錯誤"));
      audio.play().catch((err) => reject(err));
      setTimeout(() => resolve(true), 1500);
    });
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

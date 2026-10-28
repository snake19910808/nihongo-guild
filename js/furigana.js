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
  voicevoxSpeakerId: 15, // 預設 15: 九州そら（あまあま / 溫柔撒嬌女僕音・推薦主角聲線）

  // 本機高品質預錄女僕音檔對照表 (0 秒零延遲、免網路、絕無 429 限制)
  localAudioMap: {
    "冒険者さん、今日も公会へようこそ！": "assets/audio/greeting_1.mp3",
    "焦らず、毎日少しずつ続けましょうね。": "assets/audio/greeting_2.mp3",
    "今日の目標、一緒にクリアしましょう！": "assets/audio/greeting_3.mp3",
    "頑張っているあなたを、詩織はずっと応援していますよ。": "assets/audio/greeting_4.mp3",
    "疲れたら、いつでも公会でお茶を飲んで休んでくださいね。": "assets/audio/greeting_5.mp3",
    "今日も新しい言葉との出会い、楽しみですね！": "assets/audio/greeting_6.mp3",
    "一歩一歩の積み重ねが、大きな力になりますよ。": "assets/audio/greeting_7.mp3",
    "質問があれば、いつでもカウンターで声をかけてくださいね。": "assets/audio/greeting_8.mp3",
    "冒険者さん、今日も一緒に頑張りましょうね！": "assets/audio/greeting_test.mp3"
  },
  dynamicAudioCache: new Map(),

  setVoiceStyle(speakerId) {
    this.voicevoxSpeakerId = parseInt(speakerId);
    if (isNaN(this.voicevoxSpeakerId)) this.voicevoxSpeakerId = 15;
  },

  /**
   * 詩織日語語音朗讀核心 (優先本機高品質女僕音檔 ➔ VOICEVOX 聲優音 ➔ 離線調諧音)
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

    // 1. 若命中預錄高品質女僕音檔，直接 0 秒離線播放，100% 絕不延遲與報錯
    const localFile = this.localAudioMap[cleanText];
    if (localFile) {
      this.playAudioFile(localFile);
      return;
    }

    // 2. 若使用者選擇了 VOICEVOX 聲線 (> 0，如 15 號女僕音)，調用網路合成並快取
    if (this.voicevoxSpeakerId && this.voicevoxSpeakerId > 0) {
      this.playVoicevox(cleanText).catch((err) => {
        console.warn("VOICEVOX 網路繁忙，平滑降級至調諧語音：", err);
        this.speakBrowser(cleanText, options);
      });
      return;
    }

    // 3. 離線備用：瀏覽器調諧音
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
   * 播放指定音訊 URL 或本地音檔
   */
  playAudioFile(url) {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      this.currentAudio = audio;
      audio.onplay = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
      setTimeout(() => resolve(true), 2500);
    });
  },

  /**
   * 調用 VOICEVOX 線上日式動漫角色語音 (含快取與 429 降級保護)
   */
  async playVoicevox(text) {
    const shortText = text.slice(0, 120);
    const speakerId = this.voicevoxSpeakerId || 15;
    const cacheKey = `${speakerId}_${shortText}`;

    // 1. 優先檢查記憶體快取，重複對話 0 秒秒播
    if (this.dynamicAudioCache.has(cacheKey)) {
      const cachedUrl = this.dynamicAudioCache.get(cacheKey);
      return this.playAudioFile(cachedUrl);
    }

    const url = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(shortText)}&speaker=${speakerId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    let res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 429) {
        // 若遇頻率限制等待 2 秒重試一次
        await new Promise((r) => setTimeout(r, 2000));
        res = await fetch(url);
      }
      if (!res.ok) throw new Error(`VOICEVOX 請求失敗 (${res.status})`);
    }

    const data = await res.json();
    if (!data.success && !data.mp3DownloadUrl) {
      if (data.errorMessage === 429) {
        await new Promise((r) => setTimeout(r, 2500));
        const retryRes = await fetch(url);
        const retryData = await retryRes.json();
        if (retryData.success && retryData.mp3DownloadUrl) {
          return this.handleAudioReady(retryData, cacheKey);
        }
      }
      throw new Error("VOICEVOX 伺服器忙碌中");
    }

    return this.handleAudioReady(data, cacheKey);
  },

  async handleAudioReady(data, cacheKey) {
    const mp3Url = data.mp3DownloadUrl || data.wavDownloadUrl;
    const statusUrl = data.audioStatusUrl;

    if (statusUrl) {
      for (let i = 0; i < 6; i++) {
        try {
          const sRes = await fetch(statusUrl);
          const sData = await sRes.json();
          if (sData.isAudioReady) break;
        } catch (e) {}
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    if (cacheKey && mp3Url) {
      this.dynamicAudioCache.set(cacheKey, mp3Url);
    }

    return this.playAudioFile(mp3Url);
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

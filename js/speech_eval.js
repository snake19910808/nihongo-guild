/**
 * speech_eval.js - 日語發音語感與音素評分儀 (Japanese Pronunciation Scorer)
 * Real-time Speech Recognition (ja-JP) + Phoneme Matching + Shiori Guidance
 */

const SpeechEvaluator = {
  recognition: null,
  isListening: false,
  currentTarget: null,
  onResultCallback: null,

  // 日語初學者最容易混淆的音素陷阱庫
  phonemeTraps: {
    "つ": {
      wrongWith: ["す", "ち", "ツー", "スー"],
      advice: "【つ (tsu)】發音口訣：舌尖輕抵上齒齦，舌頭放開時帶出微弱噴氣（ts），千萬不要咬死牙齒念成【す】喔！"
    },
    "ふ": {
      wrongWith: ["フ", "hu", "fu"],
      advice: "【ふ (fu)】發音口訣：不要用上牙咬下嘴唇（那是英語的 F），而是像吹熄蠟燭一樣，上下雙唇微開輕輕吹氣！"
    },
    "ら": {
      wrongWith: ["la", "ra"],
      advice: "【ら行 (ra, ri, ru, re, ro)】發音口訣：不是英語捲舌的 R，舌尖只要輕彈一下口腔上顎即可，類似台語的輕快彈舌！"
    },
    "っ": {
      wrongWith: [],
      advice: "【促音 (っ)】停頓口訣：遇到小『っ』記得收住氣流停頓一拍，不要直接滑過去喔！"
    },
    "ざ": {
      wrongWith: ["さ", "za"],
      advice: "【濁音 (ざ・じ・ず・ぜ・ぞ)】口訣：摸著喉嚨確認聲帶是否有明顯的『嗡嗡』振動感！"
    }
  },

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = "ja-JP";
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateMicUI(true);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateMicUI(false);
      };

      this.recognition.onerror = (e) => {
        console.warn("語音識別錯誤：", e.error);
        this.isListening = false;
        this.updateMicUI(false);
        this.showToast(`語音辨識提示：${e.error === "not-allowed" ? "請允許麥克風權限" : "未能辨識清楚，請再試一次！"}`);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence || 0.85;
        this.evaluate(transcript, confidence);
      };
    } else {
      console.warn("當前瀏覽器不支援 SpeechRecognition，將啟用模擬評分備援。");
    }
  },

  /**
   * 開始針對目標假名/句子進行錄音檢測
   */
  startRecord(targetText, targetReading, callback) {
    this.currentTarget = {
      text: targetText,
      reading: this.toHiragana(targetReading || targetText)
    };
    this.onResultCallback = callback;

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn("SpeechRecognition 重複啟動：", e);
      }
    } else {
      // 瀏覽器無麥克風支援時的備援互動
      const mockInput = prompt(`【語音模擬檢測】請嘗試輸入或確認您朗讀的日文：`, targetText);
      if (mockInput) {
        this.evaluate(mockInput, 0.9);
      }
    }
  },

  stopRecord() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  },

  /**
   * 核心音素比對演算法
   */
  evaluate(userTranscript, confidence = 0.85) {
    if (!this.currentTarget) return;

    const target = this.currentTarget.reading;
    const userHira = this.toHiragana(userTranscript.trim());

    // 1. 計算編輯距離相似度 (Levenshtein Distance)
    const dist = this.levenshtein(target, userHira);
    const maxLen = Math.max(target.length, userHira.length, 1);
    let rawRatio = Math.max(0, 1 - dist / maxLen);

    // 2. 轉換為 0～100 評分，結合自信度
    let score = Math.round(rawRatio * 90 + confidence * 10);
    if (target === userHira) {
      score = 98 + Math.floor(Math.random() * 3); // 98 ~ 100
    }
    score = Math.max(10, Math.min(100, score));

    // 3. 陷阱音素診斷
    let specificAdvice = null;
    let missedPhoneme = null;

    for (const [phoneme, trap] of Object.entries(this.phonemeTraps)) {
      if (target.includes(phoneme)) {
        // 如果目標有這個音，但使用者發音可能偏差
        const hasWrong = trap.wrongWith.some((w) => userHira.includes(w) || userTranscript.includes(w));
        if (hasWrong || score < 85) {
          missedPhoneme = phoneme;
          specificAdvice = trap.advice;
          break;
        }
      }
    }

    // 4. 等級與詩織評語
    let grade = "C";
    let comment = "加油！放鬆嘴唇，再跟著詩織聽一遍正確讀音！";

    if (score >= 90) {
      grade = "S";
      comment = "すごい！發音非常道地純熟！就像日本當地冒險者一樣標準！";
    } else if (score >= 80) {
      grade = "A";
      comment = "很好！語調相當流暢自然，詩織完全聽懂了！";
    } else if (score >= 70) {
      grade = "B";
      comment = "不錯喔！大部分音節都咬準了，注意音素細節會更棒！";
    }

    const result = {
      score,
      grade,
      userText: userTranscript,
      targetText: this.currentTarget.text,
      targetReading: this.currentTarget.reading,
      comment,
      missedPhoneme,
      advice: specificAdvice || "提示：深呼吸，讓氣流穩定穿過雙唇，不急不躁地朗讀出來！"
    };

    if (this.onResultCallback) {
      this.onResultCallback(result);
    }

    this.showResultModal(result);
  },

  showResultModal(res) {
    let modal = document.getElementById("speechResultModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "speechResultModal";
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    const gradeColors = {
      S: "#f1c40f",
      A: "#2ecc71",
      B: "#3498db",
      C: "#e67e22"
    };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:440px;text-align:center;">
        <div style="font-size:1.1rem;font-weight:bold;color:var(--text-sub);margin-bottom:8px;">
          🎙️ 詩織的發音語感診斷室
        </div>

        <div style="font-size:3.5rem;font-weight:900;color:${gradeColors[res.grade]};text-shadow:0 0 15px ${gradeColors[res.grade]}66;margin:10px 0;">
          ${res.score}<span style="font-size:1.5rem;font-weight:bold;margin-left:4px;">分</span>
        </div>

        <div class="small-tag" style="background:${gradeColors[res.grade]}22;color:${gradeColors[res.grade]};font-size:1.1rem;padding:4px 16px;border-radius:20px;display:inline-block;margin-bottom:14px;">
          評級：${res.grade} Rank
        </div>

        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;padding:12px;text-align:left;font-size:0.9rem;margin-bottom:14px;">
          <div><strong>目標日語：</strong><span style="color:var(--accent-gold);">${res.targetText}</span>【${res.targetReading}】</div>
          <div style="margin-top:6px;"><strong>辨識結果：</strong><span>${res.userText}</span></div>
        </div>

        <div style="background:#2c3e5044;border-left:4px solid var(--accent-cyan);padding:10px 14px;text-align:left;font-size:0.88rem;color:var(--text-main);margin-bottom:16px;">
          <div style="font-weight:bold;color:var(--accent-cyan);margin-bottom:4px;">🌸 詩織指導：</div>
          <div>${res.comment}</div>
          ${res.advice ? `<div style="margin-top:6px;font-size:0.82rem;color:var(--accent-gold);">${res.advice}</div>` : ""}
        </div>

        <div style="display:flex;justify-content:center;gap:12px;">
          <button class="icon-btn" id="listenCorrectBtn" style="padding:8px 16px;">🔊 聽正確發音</button>
          <button class="btn-talk" id="closeSpeechModalBtn">記住了，繼續冒險 ➔</button>
        </div>
      </div>
    `;

    modal.classList.add("active");

    modal.querySelector("#listenCorrectBtn").onclick = () => {
      if (window.FuriganaEngine) {
        window.FuriganaEngine.speak(res.targetReading);
      }
    };

    modal.querySelector("#closeSpeechModalBtn").onclick = () => {
      modal.classList.remove("active");
    };
  },

  updateMicUI(isRecording) {
    const micBtns = document.querySelectorAll(".speech-mic-btn");
    micBtns.forEach((btn) => {
      btn.classList.toggle("recording", isRecording);
      btn.textContent = isRecording ? "🔴 正在聆聽...（請朗讀）" : "🎙️ 語音評分";
    });
  },

  toHiragana(str) {
    if (!str) return "";
    return str.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  },

  levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  },

  showToast(msg) {
    if (window.App && window.App.showToast) {
      window.App.showToast(msg);
    } else {
      console.log(msg);
    }
  }
};

window.SpeechEvaluator = SpeechEvaluator;

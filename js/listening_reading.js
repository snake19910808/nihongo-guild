/**
 * listening_reading.js - 日語深度聽力（情境長句、0.8x/1.0x、聽寫挖空）與公會委託任務信閱讀
 * Contextual Listening (Dictation + Speed Toggle) & Guild Quest Letter Reader
 */

const ListeningReadingModule = {
  // 公會村民委託信庫（沉浸式短文閱讀）
  questLetters: [
    {
      id: "letter_01",
      day: 1,
      sender: "村莊麵包師傅・皮耶爾 (Pierre)",
      title: "【委託】早晨麵包出爐的神秘便條",
      senderAvatar: "🥖",
      difficulty: "新手級 (五十音/N5)",
      contentJa: "冒険者[ぼうけんしゃ]の皆さん[みなさん]、こんにちは！\n私[わたし]は村[むら]のパン屋[や]です。毎朝[まいあさ]、おいしいパンを焼[や]いています。\n今朝[けさ]、店[みせ]の前[まえ]に不思議[ふしぎ]な手紙[てがみ]がありました。「ありがとう」と書[か]いてありました。\n誰[だれ]が書[か]いたのか知[し]りたいです。手伝[てつだ]ってください！",
      contentZh: "各位冒險者大家好！\n我是村裡的麵包師傅。每天早晨我都烤出香噴噴的麵包。\n今天早上，店門口放了一封不可思議的信，上面寫著「謝謝」。\n我很想知道是誰寫的，請幫幫我！",
      question: "麵包店門口留下的便條上寫著什麼字？",
      options: ["ありがとう (謝謝)", "さようなら (再見)", "すみません (不好意思)", "おはよう (早安)"],
      answerIdx: 0,
      rewardExp: 25,
      rewardGold: 15
    },
    {
      id: "letter_02",
      day: 2,
      sender: "酒館老闆娘・瑪格麗特 (Margaret)",
      title: "【委託】來自遠方行商人的預約信",
      senderAvatar: "🍺",
      difficulty: "N5 初級",
      contentJa: "ギルドの皆様[みなさま]へ。\n明日[あした]、王都[おうと]から商人[しょうにん]のパーティーが来[き]ます。\n晩[ばん]ご飯[はん]に温[あたた]かいスープと魚[さかな]の料理[りょうり]を用意[ようい]したいです。\nしかし、新鮮[しんせん]な魚[さかな]が足りません[たりません]。川[かわ]で魚[さかな]を５匹[ひき]獲[と]ってきてくれませんか？",
      contentZh: "致公會的各位。\n明天從王都將有一群商人隊伍抵達。\n晚餐我想為他們準備熱騰騰的濃湯和魚料理。\n但是新鮮的魚不夠了。可以幫我去河邊抓 5 條魚回來嗎？",
      question: "酒館老闆娘希望冒險者幫忙採集什麼食材？",
      options: ["新鮮な魚 (新鮮的魚)", "おいしい野菜 (美味的蔬菜)", "王都のパン (王都的麵包)", "甘い果物 (甜美的水果)"],
      answerIdx: 0,
      rewardExp: 30,
      rewardGold: 20
    },
    {
      id: "letter_03",
      day: 3,
      sender: "圖書館管理員・諾亞 (Noah)",
      title: "【委託】古代石碑的字跡調查",
      senderAvatar: "📚",
      difficulty: "N5 進階",
      contentJa: "冒険者[ぼうけんしゃ]殿[どの]。\n図書館[としょかん]の地下[ちか]で古[ふる]い日記[にっき]を発見[はっけん]しました。\n「この場所[ばしょ]には大切[たいせつ]な宝物[たからもの]が眠[ねむ]っている」と記[しる]されています。\n天気が[てんき]がいい日[ひ]に、森[もり]の神殿[しんでん]を一緒[いっしょ]に調査[ちょうさ]しませんか？",
      contentZh: "冒險者閣下。\n我在圖書館地下室發現了一本古老的日記。\n上面記載著「這個地方沉睡著珍貴的寶物」。\n天氣晴朗的日子，要不要和我一起去森林神殿調查呢？",
      question: "管理員在哪裡發現了古老的日記？",
      options: ["図書館の地下 (圖書館地下室)", "森の神殿 (森林神殿)", "冒険者ギルド (冒險者公會)", "川の近く (河川附近)"],
      answerIdx: 0,
      rewardExp: 35,
      rewardGold: 25
    },
    {
      id: "letter_04",
      day: 4,
      sender: "魔導士・愛麗絲 (Iris)",
      title: "【委託】藥草採集的求助委託",
      senderAvatar: "🔮",
      difficulty: "N4 入門",
      contentJa: "こんにちは、見習い[みならい]魔導士[まどうし]のアイリスです。\n今[いま]、回復[かいふく]ポーションの研究[けんきゅう]をしています。\n青[あお]い薬草[やくそう]がどうしても見[み]つかりません。\n森[もり]の奥[おく]にある泉[いずみ]のまわりに生[は]えているそうです。護衛[ごえい]をお願[ねが]いできますか？",
      contentZh: "你好，我是見習魔導士愛麗絲。\n我現在正在研究生命恢復藥水。\n但是怎麼也找不到藍色藥草。\n聽說在森林深處的泉水周圍有生長，可以請你擔任我的護衛嗎？",
      question: "愛麗絲正在研究製作什麼物品？",
      options: ["回復ポーション (恢復藥水)", "古代の魔導書 (古代魔導書)", "強力な剣 (強力的劍)", "美味しい料理 (美味的料理)"],
      answerIdx: 0,
      rewardExp: 40,
      rewardGold: 30
    }
  ],

  // 深度聽力聽寫挖空題庫
  dictationBank: [
    {
      id: "dic_01",
      audio: "こんにちは、お元気ですか。",
      reading: "こんにちは、おげんきですか。",
      prompt: "請聽語音，在空格中填入缺少的假名：",
      display: "こんにちは、お【　】きですか。",
      missing: "げん",
      meaningZh: "你好，你最近好嗎？",
      explanation: "「お元気[げんき]ですか」是日語經典問候句，缺少的音是「げん」。"
    },
    {
      id: "dic_02",
      audio: "これは私の本です。",
      reading: "これはわたしのほんです。",
      prompt: "請聽語音，在空格中填入缺少的助詞假名：",
      display: "これは私【　】本です。",
      missing: "の",
      meaningZh: "這是我的書。",
      explanation: "「名詞＋の＋名詞」表示所有格屬性，缺少的助詞是「の」。"
    },
    {
      id: "dic_03",
      audio: "明日、図書館へ行きます。",
      reading: "あした、としょかんへいきます。",
      prompt: "請聽語音，在空格中填入缺少的動詞讀音：",
      display: "明日、図書館へ【　】きます。",
      missing: "い",
      meaningZh: "明天要去圖書館。",
      explanation: "「行[い]きます」意為前往，缺少的假名為「い」。"
    },
    {
      id: "dic_04",
      audio: "日本語の勉強はとても面白いです。",
      reading: "にほんごのべんきょうはとてもおもしろいです。",
      prompt: "請聽語音，填入形容詞前面的副詞假名：",
      display: "日本語の勉強は【　】面白いです。",
      missing: "とても",
      meaningZh: "學日文非常有趣。",
      explanation: "「とても」表示「非常、很」，缺少的假名為「とても」。"
    }
  ],

  currentAudioSpeed: 1.0, // 0.8 | 1.0

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // 綁定公會委託信閱讀按鈕
    const letterBtn = document.getElementById("openQuestLetterBtn");
    if (letterBtn) {
      letterBtn.addEventListener("click", () => this.openQuestLetterModal());
    }
  },

  playSpeedAudio(text) {
    if (window.FuriganaEngine) {
      window.FuriganaEngine.speak(text, { rate: this.currentAudioSpeed * 1.05 });
    }
  },

  toggleSpeed() {
    this.currentAudioSpeed = this.currentAudioSpeed === 1.0 ? 0.8 : 1.0;
    return this.currentAudioSpeed;
  },

  /**
   * 開啟公會村民委託信閱讀測驗視窗 (Guild Quest Letter Reader)
   */
  openQuestLetterModal(day = 1) {
    let letter = this.questLetters.find((l) => l.day === day) || this.questLetters[0];

    let modal = document.getElementById("questLetterModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "questLetterModal";
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    const renderRuby = (txt) => {
      if (window.FuriganaEngine) return window.FuriganaEngine.render(txt);
      return txt;
    };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:520px;">
        <div class="modal-header">
          <div style="font-size:1.15rem;font-weight:bold;color:var(--accent-gold);display:flex;align-items:center;gap:8px;">
            <span>${letter.senderAvatar}</span>
            <span>公會委託信（村民求助閱讀任務）</span>
          </div>
          <button class="modal-close" id="closeLetterModalBtn">✕</button>
        </div>

        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:14px;margin:12px 0;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;margin-bottom:10px;">
            <div style="font-weight:bold;color:var(--accent-cyan);">${letter.title}</div>
            <span class="chap-badge" style="font-size:0.75rem;">${letter.difficulty}</span>
          </div>

          <div style="font-size:0.85rem;color:var(--text-sub);margin-bottom:8px;">
            寄件人：<strong>${letter.sender}</strong>
          </div>

          <!-- 日語信件本文 (含假名注音) -->
          <div class="letter-body-ja" style="font-size:1.02rem;line-height:1.8;white-space:pre-line;color:var(--text-main);background:#1a1f26;padding:12px;border-radius:8px;border-left:4px solid var(--accent-gold);">
            ${renderRuby(letter.contentJa)}
          </div>

          <!-- 音訊朗讀與語速切換 -->
          <div style="display:flex;align-items:center;gap:10px;margin-top:10px;">
            <button class="icon-btn" id="letterAudioBtn" style="padding:6px 12px;">🔊 聆聽整封信</button>
            <button class="icon-btn" id="letterSpeedBtn" style="padding:6px 12px;">⚡ 語速: <span id="speedValText">1.0x</span></button>
            <button class="icon-btn" id="letterTranslateToggleBtn" style="padding:6px 12px;margin-left:auto;">👁️ 中文翻譯</button>
          </div>

          <div id="letterZhContent" style="display:none;font-size:0.88rem;color:var(--text-sub);white-space:pre-line;margin-top:10px;padding:10px;background:rgba(255,255,255,0.04);border-radius:6px;">
            ${letter.contentZh}
          </div>
        </div>

        <!-- 閱讀理解問答 -->
        <div style="background:var(--bg-pane);border:1px solid var(--border-color);border-radius:8px;padding:12px;margin-bottom:14px;">
          <div style="font-weight:bold;color:var(--accent-gold);margin-bottom:8px;">
            📝 閱讀理解確認：${letter.question}
          </div>
          <div id="letterOptionsGrid" style="display:grid;grid-template-columns:1fr;gap:8px;">
            ${letter.options
              .map(
                (opt, idx) => `
              <button class="option-btn letter-opt-btn" data-idx="${idx}" style="text-align:left;padding:8px 12px;">
                ${opt}
              </button>
            `
              )
              .join("")}
          </div>
          <div id="letterFeedbackBox" style="margin-top:8px;font-size:0.9rem;"></div>
        </div>

        <div style="display:flex;justify-content:flex-end;">
          <button class="btn-talk" id="finishLetterBtn">完成閱讀，回報公會 ➔</button>
        </div>
      </div>
    `;

    modal.classList.add("active");

    // 綁定事件
    modal.querySelector("#closeLetterModalBtn").onclick = () => modal.classList.remove("active");
    modal.querySelector("#finishLetterBtn").onclick = () => modal.classList.remove("active");

    const speedBtn = modal.querySelector("#letterSpeedBtn");
    const speedVal = modal.querySelector("#speedValText");
    speedBtn.onclick = () => {
      const spd = this.toggleSpeed();
      speedVal.textContent = `${spd}x`;
    };

    modal.querySelector("#letterAudioBtn").onclick = () => {
      this.playSpeedAudio(letter.contentJa.replace(/\[.*?\]/g, ""));
    };

    const transBtn = modal.querySelector("#letterTranslateToggleBtn");
    const transBox = modal.querySelector("#letterZhContent");
    transBtn.onclick = () => {
      const isHidden = transBox.style.display === "none";
      transBox.style.display = isHidden ? "block" : "none";
      transBtn.textContent = isHidden ? "🙈 隱藏翻譯" : "👁️ 中文翻譯";
    };

    // 答案點擊
    const optBtns = modal.querySelectorAll(".letter-opt-btn");
    const fbBox = modal.querySelector("#letterFeedbackBox");
    optBtns.forEach((b) => {
      b.onclick = () => {
        const choice = parseInt(b.dataset.idx);
        if (choice === letter.answerIdx) {
          b.classList.add("correct");
          fbBox.innerHTML = `<span style="color:#2ecc71;font-weight:bold;">🎉 答對了！</span> 閱讀理解完美！獲得 +${letter.rewardExp} EXP、+${letter.rewardGold} G！`;
          if (window.App && window.App.onBattleVictory) {
            window.App.onBattleVictory({ exp: letter.rewardExp, gold: letter.rewardGold, affection: 1 });
          }
        } else {
          b.classList.add("wrong");
          fbBox.innerHTML = `<span style="color:#e74c3c;">❌ 不對喔，請再仔細閱讀信件內容！</span>`;
        }
      };
    });
  }
};

window.ListeningReadingModule = ListeningReadingModule;

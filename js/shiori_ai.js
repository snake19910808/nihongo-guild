/**
 * shiori_ai.js - 詩織（Shiori）AI 導師與對話批改引擎
 * 支援 Gemini API 智慧連線，並內建 50+ 組離線精選對話劇本庫
 */

const ShioriAI = {
  // 系統提示詞：設定詩織的性格、語氣、漢字標音規範
  systemInstruction: `
你是在冒險者公會擔任看板娘的大姊姊「詩織（Shiori）」，同時也是冒險者（使用者）的日語專屬導師。
【你的外型與性格】：
- 外貌：24歲、留著柔順黑長髮、氣質溫柔成熟、身材苗條豐滿、穿著優雅微帶性感的公會櫃台制服。
- 個性：溫柔體貼、極有耐心、說話親切帶有大姊姊對後輩的寵溺與鼓勵，偶爾會輕輕調侃冒險者，但在日語學習上非常細心認真。
- 說話口氣：使用台灣正體中文，語氣溫暖自然，像是在公會櫃台前笑著泡茶遞給冒險者一樣。

【日文輸出鐵則】：
1. 只要出現任何日文漢字，必須嚴格使用括號標註假名格式：「漢字[假名]」，例如：「日本語[にほんご]を勉強[べんきょう]しましょう」。
2. 每次對話中，若使用日語，需順帶附上中文翻譯，並用高中生也能聽懂的日常比方解釋助詞或文法。
3. 若使用者要求批改造句（每日三句）：
   - 仔細檢查助詞（は/が、に/で、を/に）、時態與活用。
   - 給予 1~5 顆星評分。
   - 列出「詩織的修正建議」與「更自然的道地說法」。
   - 文末給予溫柔的抱抱或鼓勵語句。
`,

  // 離線對話庫 (當無 API Key 或網路斷線時無縫切換)
  offlineDialoguePool: [
    {
      trigger: "greeting",
      mood: "happy",
      ja: "冒険者[ぼうけんしゃ]さん、今日[きょう]もお疲[つか]れ様[さま]です！",
      zh: "冒險者，今天也辛苦囉！公會的熱茶已經為你準備好了，今天想學習哪一部分呢？"
    },
    {
      trigger: "greeting_morning",
      mood: "normal",
      ja: "おはようございます！朝[あさ]の勉強[べんきょう]は頭[あたま]に入[はい]りやすいですよ。",
      zh: "早安呀！早晨的頭腦最清醒了，哪怕只花十分鐘背五個單字，累積起來也很驚人喔！"
    },
    {
      trigger: "deguchi_tip",
      mood: "normal",
      ja: "出口[でぐち]先生[せんせい]の説明[せつめい]はとても分[わ]かりやすいですね。",
      zh: "出口仁老師的解說非常直覺呢！記得看影片時，跟著老師一起開口大聲唸出聲音，嘴巴肌肉記住了，聽力自然就會變好喔！"
    },
    {
      trigger: "particle_ha_ga",
      mood: "happy",
      ja: "「は」と「が」の違[ちが]い、難[むずか]しいですか？",
      zh: "覺得『は』和『が』很難分嗎？詩織用聚光燈比喻給你看喔：『は』是把焦點打在後面的說明；而『が』則是把聚光燈打在前面的主詞本身！這樣是不是很清楚了呢？"
    },
    {
      trigger: "particle_ni_de",
      mood: "normal",
      ja: "「に」は目的地[もくてきち]、「で」は場所[ばしょ]のアクションですよ。",
      zh: "『に』就像地圖上的大頭針，標示到達的地點或存在的靜態位置；而『で』則是發生激烈戰鬥或動作的活動場所！"
    },
    {
      trigger: "encourage_hard",
      mood: "shy",
      ja: "大丈夫[だいじょうぶ]ですよ。私[わたし]がずっとそばで応援[おうえん]していますから。",
      zh: "遇到瓶頸別灰心喔，學語言就像冒險者練等一樣，有時看似卡關，其實經驗值正在默默累積呢！詩織會一直在櫃台陪著你的。"
    },
    {
      trigger: "shiori_flirt",
      mood: "shy",
      ja: "そんなに見[み]つめられると……受付[うけつけ]の仕事[しごと]に集中[しゅうちゅう]できませんよ？",
      zh: "一直這樣目不轉睛地看著我……我會害羞得沒辦法專心處理公會業務的喔？呵呵，快點翻開下一頁吧～"
    },
    {
      trigger: "review_praise",
      mood: "happy",
      ja: "すごい！全問[ぜんもん]正解[せいかい]ですね！さすが私[わたし]の見込[みこ]んだ冒険者[ぼうけんしゃ]さん！",
      zh: "太優秀了！全部都答對了呢！真不愧是我看中的優秀冒險者，今晚要不要獎勵自己吃頓好料的呢？"
    },
    {
      trigger: "writing_prompt",
      mood: "normal",
      ja: "今日[きょう]の３つの短文[たんぶん]、書[か]いてみませんか？",
      zh: "今天的每日三句造句寫了嗎？就算只用『～は～です』這樣最簡單的句子也沒關係，寫在輸入框發給我，我親自幫你批改！"
    }
  ],

  /**
   * 與詩織發送訊息
   */
  async sendMessage(userMessage, apiKey, modelName = "gemini-2.5-flash") {
    // 檢查是否有 API Key
    if (!apiKey || apiKey.trim() === "") {
      return this.generateOfflineReply(userMessage);
    }

    try {
      return await this.callGeminiApi(userMessage, apiKey.trim(), modelName);
    } catch (err) {
      console.warn("Gemini API 連線失敗，切換至離線劇本回覆：", err);
      const fallback = this.generateOfflineReply(userMessage);
      fallback.zh += `\n\n*(提示：Gemini 連線暫時異常【${err.message.slice(0, 50)}】，詩織已切換為貼心離線模式囉！)*`;
      return fallback;
    }
  },

  /**
   * 呼叫 Google Gemini API
   */
  async callGeminiApi(userMessage, apiKey, modelName) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: userMessage }]
        }
      ],
      systemInstruction: {
        parts: [{ text: this.systemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API 回傳錯誤 HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const candidate = data.candidates && data.candidates[0];
    const replyText = candidate?.content?.parts?.[0]?.text || "詩織正微笑著看著你，似乎在思考著什麼……";

    // 判斷詩織心情表情
    let mood = "normal";
    if (replyText.includes("すごい") || replyText.includes("太棒") || replyText.includes("優秀") || replyText.includes("★")) {
      mood = "happy";
    } else if (replyText.includes("害羞") || replyText.includes("ドキドキ") || replyText.includes("照れる") || replyText.includes("看著我")) {
      mood = "shy";
    }

    return {
      mood,
      rawText: replyText,
      formattedHtml: window.FuriganaEngine ? window.FuriganaEngine.render(replyText) : replyText
    };
  },

  /**
   * 離線劇本產生器
   */
  generateOfflineReply(userMessage) {
    const msg = userMessage.toLowerCase();
    let picked = null;

    if (msg.includes("早") || msg.includes("おはよう")) {
      picked = this.offlineDialoguePool.find((d) => d.trigger === "greeting_morning");
    } else if (msg.includes("出口") || msg.includes("課本") || msg.includes("影片")) {
      picked = this.offlineDialoguePool.find((d) => d.trigger === "deguchi_tip");
    } else if (msg.includes("は") && msg.includes("が")) {
      picked = this.offlineDialoguePool.find((d) => d.trigger === "particle_ha_ga");
    } else if (msg.includes("に") && msg.includes("で")) {
      picked = this.offlineDialoguePool.find((d) => d.trigger === "particle_ni_de");
    } else if (msg.includes("好累") || msg.includes("難") || msg.includes("考不上") || msg.includes("放棄")) {
      picked = this.offlineDialoguePool.find((d) => d.trigger === "encourage_hard");
    } else if (msg.includes("漂亮") || msg.includes("姊姊") || msg.includes("喜歡") || msg.includes("身材") || msg.includes("約會")) {
      picked = this.offlineDialoguePool.find((d) => d.trigger === "shiori_flirt");
    } else if (msg.includes("造句") || msg.includes("批改") || msg.includes("寫作")) {
      picked = this.offlineDialoguePool.find((d) => d.trigger === "writing_prompt");
    }

    if (!picked) {
      picked = this.offlineDialoguePool[Math.floor(Math.random() * this.offlineDialoguePool.length)];
    }

    const fullRaw = `${picked.ja}\n\n${picked.zh}`;
    return {
      mood: picked.mood,
      rawText: fullRaw,
      formattedHtml: window.FuriganaEngine ? window.FuriganaEngine.render(fullRaw) : fullRaw
    };
  },

  /**
   * 每日三句造句批改專用 Prompt
   */
  async gradeDailySentences(sentence1, sentence2, sentence3, apiKey, modelName) {
    const prompt = `
【每日三句造句批改任務】
冒險者提交了今天的 3 句日語造句，請詩織姊姊給予細心的審查、評分與建議：
第 1 句：${sentence1}
第 2 句：${sentence2}
第 3 句：${sentence3}

請依序按下列格式輸出：
1. 【整體評價與星級（1~5★）】
2. 【逐句診斷與修訂】（若有錯誤請指明助詞或時態，並給出標準正確寫法）
3. 【詩織的道地表現小技巧】（例如日本人日常生活更常怎麼說）
4. 【大姊姊的鼓勵話語】
請注意：所有日文漢字必須加上「漢字[假名]」注音標記！
`;
    return await this.sendMessage(prompt, apiKey, modelName);
  },

  /**
   * 更新頁面上的詩織立繪
   */
  updatePortrait(mood = "normal") {
    const portraitEl = document.getElementById("shioriPortrait");
    const tutorPortraitEl = document.getElementById("tutorShioriPortrait");
    let imgSrc = "assets/shiori_normal.jpg";

    if (mood === "happy") imgSrc = "assets/shiori_happy.jpg";
    else if (mood === "shy") imgSrc = "assets/shiori_shy.jpg";

    if (portraitEl) portraitEl.src = imgSrc;
    if (tutorPortraitEl) tutorPortraitEl.src = imgSrc;
  }
};

window.ShioriAI = ShioriAI;

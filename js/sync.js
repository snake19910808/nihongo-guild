/**
 * sync.js - 存檔管理與 GitHub 私人倉庫雲端同步
 */

const SyncManager = {
  LOCAL_KEY: "nihongo_guild_save",
  SETTINGS_KEY: "nihongo_guild_settings",

  defaultSettings: {
    geminiApiKey: "",
    geminiModel: "gemini-3.5-flash-lite",
    voiceStyle: 15, // 15: 預設九州そら・あまあま (溫柔撒嬌女僕音)
    githubPat: "",
    githubRepo: "snake19910808/nihongo-save"
  },

  defaultSave: {
    version: "1.0.0",
    updatedAt: new Date().toISOString(),
    player: {
      name: "新人冒險者",
      level: 1,
      exp: 0,
      maxExp: 100,
      gold: 50,
      streakDays: 1,
      lastActiveDate: new Date().toISOString().split("T")[0],
      shioriAffection: 10
    },
    progress: {
      currentDay: 1,
      furiganaMode: "all",
      completedTasks: {}, // { "day_1": ["q1", "q2"] }
      masteredKanji: [],
      masteredVocab: []
    },
    srs: {
      cards: {} // { "v_n5_001": { interval, repetition, efactor, dueDate } }
    },
    compendium: {
      unlockedCards: ["kana_a", "kana_i", "kana_u", "kana_e", "kana_o"]
    }
  },

  loadSettings() {
    try {
      const raw = localStorage.getItem(this.SETTINGS_KEY);
      const s = raw ? { ...this.defaultSettings, ...JSON.parse(raw) } : { ...this.defaultSettings };
      // 自動升級預設至 15 (九州そら・あまあま 溫柔撒嬌女僕音)
      if (s.voiceStyle === undefined || s.voiceStyle === null || s.voiceStyle === "0" || s.voiceStyle === 0 || s.voiceStyle === "17" || s.voiceStyle === 17) {
        s.voiceStyle = 15;
      }
      return s;
    } catch (e) {
      return { ...this.defaultSettings };
    }
  },

  saveSettings(settings) {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  },

  loadLocalSave() {
    try {
      const raw = localStorage.getItem(this.LOCAL_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("本機存檔讀取失敗，使用預設值:", e);
    }
    this.saveLocal(this.defaultSave);
    return JSON.parse(JSON.stringify(this.defaultSave));
  },

  saveLocal(saveData) {
    saveData.updatedAt = new Date().toISOString();
    localStorage.setItem(this.LOCAL_KEY, JSON.stringify(saveData));
  },

  /**
   * 與 GitHub 私人倉庫同步 (下載存檔)
   */
  async fetchFromGitHub(pat, repo) {
    if (!pat || !repo) throw new Error("請先填寫 GitHub Token 與存檔倉庫名稱");
    const url = `https://api.github.com/repos/${repo}/contents/save.json`;
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${pat}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    if (!res.ok) {
      throw new Error(`GitHub 讀取失敗 (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    const contentStr = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ""))));
    const parsed = JSON.parse(contentStr);
    this.saveLocal(parsed);
    return { save: parsed, sha: data.sha };
  },

  /**
   * 推送存檔至 GitHub 私人倉庫
   */
  async pushToGitHub(saveData, pat, repo) {
    if (!pat || !repo) throw new Error("請先填寫 GitHub Token 與存檔倉庫名稱");
    const url = `https://api.github.com/repos/${repo}/contents/save.json`;
    
    // 先取得現有 SHA
    let sha = null;
    try {
      const getRes = await fetch(url, {
        headers: {
          Authorization: `token ${pat}`,
          Accept: "application/vnd.github.v3+json"
        }
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }
    } catch (e) {
      // 檔案可能尚不存在
    }

    saveData.updatedAt = new Date().toISOString();
    const jsonStr = JSON.stringify(saveData, null, 2);
    const contentBase64 = btoa(unescape(encodeURIComponent(jsonStr)));

    const body = {
      message: `學習進度雲端同步 (Day ${saveData.progress.currentDay}) - ${new Date().toLocaleString("zh-TW")}`,
      content: contentBase64,
      ...(sha ? { sha } : {})
    };

    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${pat}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      throw new Error(`GitHub 上傳存檔失敗 (${putRes.status}): ${await putRes.text()}`);
    }
    return await putRes.json();
  },

  /**
   * 匯出存檔為 JSON 檔案
   */
  exportToFile(saveData) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(saveData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nihongo_guild_save_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
};

window.SyncManager = SyncManager;

/**
 * avatar.js - 《歧路旅人》風格紙娃娃角色創建與像素精靈渲染系統
 * Octopath Traveler Styled Character Creation & Pixel Sprite Generator
 */

const AvatarManager = {
  // 角色預設屬性
  currentAvatar: {
    name: "旅人アルス",
    gender: "male", // "male" | "female"
    hairStyle: 1, // 1: 短髮, 2: 帥氣馬尾, 3: 熱血刺蝟頭, 4: 飄逸長髮/雙馬尾
    hairColor: "#3d2714", // 深褐, 金, 黑, 赤紅, 冰藍, 紫
    eyeStyle: 1, // 1: 堅毅, 2: 溫柔圓眼, 3: 銳利沉穩
    eyeColor: "#2980b9", // 藍, 綠, 琥珀金, 灰黑, 紫
    outfitClass: "swordsman", // "swordsman" (劍士), "scholar" (學者), "merchant" (商人), "dancer" (舞者)
    skinTone: "#ffe0bd", // 白皙, 健康, 小麥
    level: 1
  },

  palette: {
    hairColors: [
      { name: "深褐", hex: "#3d2714" },
      { name: "曜黑", hex: "#1c2833" },
      { name: "流金", hex: "#f1c40f" },
      { name: "緋紅", hex: "#c0392b" },
      { name: "冰藍", hex: "#3498db" },
      { name: "銀灰", hex: "#bdc3c7" },
      { name: "紫羅蘭", hex: "#8e44ad" }
    ],
    eyeColors: [
      { name: "澄藍", hex: "#2980b9" },
      { name: "碧綠", hex: "#27ae60" },
      { name: "琥珀", hex: "#e67e22" },
      { name: "深邃", hex: "#2c3e50" },
      { name: "紫晶", hex: "#9b59b6" }
    ],
    skinTones: [
      { name: "雪白", hex: "#fff0e1", shadow: "#f3d1b5" },
      { name: "象牙", hex: "#ffe0bd", shadow: "#e8bd9b" },
      { name: "健康", hex: "#fcd0a1", shadow: "#deaa78" },
      { name: "小麥", hex: "#e5b182", shadow: "#c78d5e" }
    ],
    classes: [
      { id: "swordsman", name: "劍士 (藍銀輕鎧)", weapon: "sword", primary: "#2980b9", secondary: "#bdc3c7", trim: "#f1c40f" },
      { id: "scholar", name: "學者 (翠綠法袍)", weapon: "tome", primary: "#16a085", secondary: "#2c3e50", trim: "#f39c12" },
      { id: "merchant", name: "商人 (褐黃旅行裝)", weapon: "spear", primary: "#d35400", secondary: "#f39c12", trim: "#7f8c8d" },
      { id: "dancer", name: "舞者 (緋紅華服)", weapon: "dagger", primary: "#c0392b", secondary: "#e74c3c", trim: "#f1c40f" }
    ]
  },

  // 動作狀態
  animState: {
    pose: "idle", // "idle", "attack", "hit", "victory"
    frame: 0,
    timer: 0
  },

  init() {
    this.loadFromStorage();
    this.bindEvents();
    this.renderAllPreviews();
    this.checkFirstLaunch();
  },

  loadFromStorage() {
    try {
      const saved = localStorage.getItem("nihongo_guild_avatar");
      if (saved) {
        this.currentAvatar = Object.assign({}, this.currentAvatar, JSON.parse(saved));
      }
    } catch (e) {
      console.warn("無法讀取角色資料：", e);
    }
  },

  saveToStorage() {
    try {
      localStorage.setItem("nihongo_guild_avatar", JSON.stringify(this.currentAvatar));
      if (window.App && window.App.savePlayerStats) {
        window.App.savePlayerStats();
      }
    } catch (e) {
      console.warn("無法儲存角色資料：", e);
    }
  },

  checkFirstLaunch() {
    const isCreated = localStorage.getItem("nihongo_guild_avatar_created");
    if (!isCreated) {
      // 首次開局自動彈出創角視窗
      setTimeout(() => {
        this.openCreatorModal();
      }, 600);
    }
  },

  bindEvents() {
    // 監聽公會大廳或設定頁的「自訂角色」按鈕
    const openBtn = document.getElementById("openAvatarCreatorBtn");
    if (openBtn) {
      openBtn.addEventListener("click", () => this.openCreatorModal());
    }

    const hallAvatarCard = document.getElementById("hallAvatarCard");
    if (hallAvatarCard) {
      hallAvatarCard.addEventListener("click", () => this.openCreatorModal());
    }
  },

  openCreatorModal() {
    let modal = document.getElementById("avatarModal");
    if (!modal) {
      modal = this.createModalElement();
      document.body.appendChild(modal);
    }
    this.populateModalOptions();
    modal.classList.add("active");
    this.renderPreviewOnCanvas("avatarCreatorCanvas", 160, 160);
  },

  closeCreatorModal() {
    const modal = document.getElementById("avatarModal");
    if (modal) modal.classList.remove("active");
  },

  createModalElement() {
    const wrap = document.createElement("div");
    wrap.id = "avatarModal";
    wrap.className = "modal-overlay";
    wrap.innerHTML = `
      <div class="modal-box avatar-modal-box">
        <div class="modal-header">
          <div style="font-size:1.25rem;font-weight:700;color:var(--accent-gold);display:flex;align-items:center;gap:8px;">
            <span>🛡️</span>
            <span>冒險者公會註冊證（角色創建與自訂）</span>
          </div>
          <button class="modal-close" id="closeAvatarModalBtn">✕</button>
        </div>

        <div class="avatar-creator-grid">
          <!-- 左側即時像素畫布預覽 -->
          <div class="avatar-preview-pane">
            <div class="avatar-canvas-frame">
              <canvas id="avatarCreatorCanvas" width="160" height="160"></canvas>
            </div>
            <div class="avatar-pose-btns">
              <button class="small-tag active" data-pose="idle">站立</button>
              <button class="small-tag" data-pose="attack">出招</button>
              <button class="small-tag" data-pose="hit">受擊</button>
              <button class="small-tag" data-pose="victory">勝利</button>
            </div>
            <div id="avatarClassTitle" style="margin-top:10px;font-size:0.95rem;font-weight:bold;color:var(--accent-cyan);text-align:center;">
              劍士・藍銀輕鎧
            </div>
          </div>

          <!-- 右側選項區 -->
          <div class="avatar-options-pane">
            <div class="form-group">
              <label>冒險者姓名：</label>
              <input type="text" id="avatarNameInput" class="custom-input" placeholder="請輸入勇者之名..." maxlength="12">
            </div>

            <div class="form-group">
              <label>性別外觀：</label>
              <div class="btn-group" id="avatarGenderGroup">
                <button type="button" class="opt-choice active" data-gender="male">♂ 青年冒險者</button>
                <button type="button" class="opt-choice" data-gender="female">♀ 少女冒險者</button>
              </div>
            </div>

            <div class="form-group">
              <label>髮型風格：</label>
              <div class="btn-group" id="avatarHairStyleGroup">
                <button type="button" class="opt-choice" data-style="1">俐落短髮</button>
                <button type="button" class="opt-choice" data-style="2">浪人馬尾</button>
                <button type="button" class="opt-choice" data-style="3">熱血刺蝟</button>
                <button type="button" class="opt-choice" data-style="4">飄逸長髮</button>
              </div>
            </div>

            <div class="form-group">
              <label>髮色：</label>
              <div class="color-swatch-row" id="avatarHairColorSwatches"></div>
            </div>

            <div class="form-group">
              <label>眼睛樣式與眸色：</label>
              <div class="btn-group" id="avatarEyeStyleGroup" style="margin-bottom:6px;">
                <button type="button" class="opt-choice" data-eye="1">堅毅明眸</button>
                <button type="button" class="opt-choice" data-eye="2">溫柔圓眼</button>
                <button type="button" class="opt-choice" data-eye="3">銳利專注</button>
              </div>
              <div class="color-swatch-row" id="avatarEyeColorSwatches"></div>
            </div>

            <div class="form-group">
              <label>膚色：</label>
              <div class="color-swatch-row" id="avatarSkinSwatches"></div>
            </div>

            <div class="form-group">
              <label>職業裝扮（歧路旅人職系）：</label>
              <div class="btn-group" id="avatarClassGroup">
                <button type="button" class="opt-choice" data-class="swordsman">⚔️ 劍士</button>
                <button type="button" class="opt-choice" data-class="scholar">📖 學者</button>
                <button type="button" class="opt-choice" data-class="merchant">🎒 商人</button>
                <button type="button" class="opt-choice" data-class="dancer">💃 舞者</button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">
          <button class="btn-secondary" id="randomizeAvatarBtn">🎲 隨機造型</button>
          <button class="btn-talk" id="saveAvatarBtn">✨ 確認出發！踏上旅程</button>
        </div>
      </div>
    `;

    // 綁定關閉
    wrap.querySelector("#closeAvatarModalBtn").addEventListener("click", () => this.closeCreatorModal());
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) this.closeCreatorModal();
    });

    return wrap;
  },

  populateModalOptions() {
    const a = this.currentAvatar;
    const nameInput = document.getElementById("avatarNameInput");
    if (nameInput) {
      nameInput.value = a.name;
      nameInput.oninput = (e) => {
        this.currentAvatar.name = e.target.value.trim() || "旅人";
        this.renderAllPreviews();
      };
    }

    // 性別按鈕
    const genderBtns = document.querySelectorAll("#avatarGenderGroup .opt-choice");
    genderBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.gender === a.gender);
      btn.onclick = () => {
        genderBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentAvatar.gender = btn.dataset.gender;
        this.renderPreviewOnCanvas("avatarCreatorCanvas", 160, 160);
      };
    });

    // 髮型按鈕
    const hairBtns = document.querySelectorAll("#avatarHairStyleGroup .opt-choice");
    hairBtns.forEach((btn) => {
      btn.classList.toggle("active", parseInt(btn.dataset.style) === a.hairStyle);
      btn.onclick = () => {
        hairBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentAvatar.hairStyle = parseInt(btn.dataset.style);
        this.renderPreviewOnCanvas("avatarCreatorCanvas", 160, 160);
      };
    });

    // 髮色 Swatches
    const hairSwatchContainer = document.getElementById("avatarHairColorSwatches");
    if (hairSwatchContainer) {
      hairSwatchContainer.innerHTML = "";
      this.palette.hairColors.forEach((c) => {
        const sw = document.createElement("div");
        sw.className = `color-swatch ${c.hex.toLowerCase() === a.hairColor.toLowerCase() ? "active" : ""}`;
        sw.style.backgroundColor = c.hex;
        sw.title = c.name;
        sw.onclick = () => {
          hairSwatchContainer.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
          sw.classList.add("active");
          this.currentAvatar.hairColor = c.hex;
          this.renderPreviewOnCanvas("avatarCreatorCanvas", 160, 160);
        };
        hairSwatchContainer.appendChild(sw);
      });
    }

    // 眼睛樣式
    const eyeBtns = document.querySelectorAll("#avatarEyeStyleGroup .opt-choice");
    eyeBtns.forEach((btn) => {
      btn.classList.toggle("active", parseInt(btn.dataset.eye) === a.eyeStyle);
      btn.onclick = () => {
        eyeBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentAvatar.eyeStyle = parseInt(btn.dataset.eye);
        this.renderPreviewOnCanvas("avatarCreatorCanvas", 160, 160);
      };
    });

    // 眼睛顏色
    const eyeSwatchContainer = document.getElementById("avatarEyeColorSwatches");
    if (eyeSwatchContainer) {
      eyeSwatchContainer.innerHTML = "";
      this.palette.eyeColors.forEach((c) => {
        const sw = document.createElement("div");
        sw.className = `color-swatch ${c.hex.toLowerCase() === a.eyeColor.toLowerCase() ? "active" : ""}`;
        sw.style.backgroundColor = c.hex;
        sw.title = c.name;
        sw.onclick = () => {
          eyeSwatchContainer.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
          sw.classList.add("active");
          this.currentAvatar.eyeColor = c.hex;
          this.renderPreviewOnCanvas("avatarCreatorCanvas", 160, 160);
        };
        eyeSwatchContainer.appendChild(sw);
      });
    }

    // 膚色 Swatches
    const skinSwatchContainer = document.getElementById("avatarSkinSwatches");
    if (skinSwatchContainer) {
      skinSwatchContainer.innerHTML = "";
      this.palette.skinTones.forEach((s) => {
        const sw = document.createElement("div");
        sw.className = `color-swatch ${s.hex.toLowerCase() === a.skinTone.toLowerCase() ? "active" : ""}`;
        sw.style.backgroundColor = s.hex;
        sw.title = s.name;
        sw.onclick = () => {
          skinSwatchContainer.querySelectorAll(".color-swatch").forEach((b) => b.classList.remove("active"));
          sw.classList.add("active");
          this.currentAvatar.skinTone = s.hex;
          this.renderPreviewOnCanvas("avatarCreatorCanvas", 160, 160);
        };
        skinSwatchContainer.appendChild(sw);
      });
    }

    // 職業裝扮按鈕
    const classBtns = document.querySelectorAll("#avatarClassGroup .opt-choice");
    classBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.class === a.outfitClass);
      btn.onclick = () => {
        classBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentAvatar.outfitClass = btn.dataset.class;
        const clsObj = this.palette.classes.find((x) => x.id === a.outfitClass);
        const titleEl = document.getElementById("avatarClassTitle");
        if (titleEl && clsObj) titleEl.textContent = clsObj.name;
        this.renderPreviewOnCanvas("avatarCreatorCanvas", 160, 160);
      };
    });

    // 動作按鈕切換
    const poseBtns = document.querySelectorAll(".avatar-pose-btns .small-tag");
    poseBtns.forEach((btn) => {
      btn.onclick = () => {
        poseBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.animState.pose = btn.dataset.pose;
        this.renderPreviewOnCanvas("avatarCreatorCanvas", 160, 160);
      };
    });

    // 隨機按鈕
    const rndBtn = document.getElementById("randomizeAvatarBtn");
    if (rndBtn) {
      rndBtn.onclick = () => {
        this.randomize();
        this.populateModalOptions();
        this.renderPreviewOnCanvas("avatarCreatorCanvas", 160, 160);
      };
    }

    // 儲存出發按鈕
    const saveBtn = document.getElementById("saveAvatarBtn");
    if (saveBtn) {
      saveBtn.onclick = () => {
        localStorage.setItem("nihongo_guild_avatar_created", "true");
        this.saveToStorage();
        this.closeCreatorModal();
        this.renderAllPreviews();
        if (window.BattleManager && window.BattleManager.renderPlayerAvatar) {
          window.BattleManager.renderPlayerAvatar();
        }
      };
    }
  },

  randomize() {
    const genders = ["male", "female"];
    this.currentAvatar.gender = genders[Math.floor(Math.random() * genders.length)];
    this.currentAvatar.hairStyle = Math.floor(Math.random() * 4) + 1;
    this.currentAvatar.hairColor = this.palette.hairColors[Math.floor(Math.random() * this.palette.hairColors.length)].hex;
    this.currentAvatar.eyeStyle = Math.floor(Math.random() * 3) + 1;
    this.currentAvatar.eyeColor = this.palette.eyeColors[Math.floor(Math.random() * this.palette.eyeColors.length)].hex;
    this.currentAvatar.skinTone = this.palette.skinTones[Math.floor(Math.random() * this.palette.skinTones.length)].hex;
    this.currentAvatar.outfitClass = this.palette.classes[Math.floor(Math.random() * this.palette.classes.length)].id;
  },

  renderAllPreviews() {
    // 渲染公會大廳名片上的玩家頭像與名字
    const nameEl = document.getElementById("hallPlayerName");
    if (nameEl) nameEl.textContent = this.currentAvatar.name;

    this.renderPreviewOnCanvas("hallPlayerCanvas", 64, 64);
    this.renderPreviewOnCanvas("battlePlayerCanvas", 120, 120);
  },

  /**
   * 像素精靈畫布繪製核心 (Octopath Traveler 16-bit HD-2D Sprite Renderer)
   * 基準解析度：32x32 像素網格，縮放至 canvas 尺寸
   */
  renderPreviewOnCanvas(canvasId, width = 120, height = 120, customPose = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false; // 保持純粹像素風顆粒質感
    ctx.clearRect(0, 0, width, height);

    const pose = customPose || this.animState.pose || "idle";
    const a = this.currentAvatar;
    const scale = width / 32;

    const skinObj = this.palette.skinTones.find((s) => s.hex.toLowerCase() === a.skinTone.toLowerCase()) || this.palette.skinTones[1];
    const classObj = this.palette.classes.find((c) => c.id === a.outfitClass) || this.palette.classes[0];

    // 輔助繪製像素區塊 (Grid Coordinates 0~31)
    const px = (x, y, w = 1, h = 1, color = "#000") => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x * scale), Math.floor(y * scale), Math.ceil(w * scale), Math.ceil(h * scale));
    };

    // 動作位移計算
    let bobY = 0;
    let armSwing = 0;
    let weaponRot = 0;
    let bodyLean = 0;
    let flashWhite = false;

    if (pose === "idle") {
      bobY = 0;
    } else if (pose === "attack") {
      bodyLean = 3;
      armSwing = 6;
      weaponRot = 45;
    } else if (pose === "hit") {
      bodyLean = -3;
      bobY = 1;
      flashWhite = true;
    } else if (pose === "victory") {
      bobY = -2;
      armSwing = -4;
    }

    // 0. 陰影橢圓
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.ellipse(16 * scale, 30 * scale, 7 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    const ox = 16 + bodyLean; // 基準中心 X
    const oy = 6 + bobY;      // 基準頭部 Y

    // 1. 披風 / 背後裝飾（依職業）
    if (a.outfitClass === "scholar") {
      // 綠色學者長斗篷
      px(ox - 6, oy + 10, 12, 13, classObj.secondary);
      px(ox - 7, oy + 12, 14, 10, classObj.primary);
      px(ox - 5, oy + 22, 10, 3, classObj.secondary);
    } else if (a.outfitClass === "swordsman") {
      // 藍色劍士半身披風
      px(ox - 5, oy + 11, 4, 10, classObj.primary);
      px(ox - 6, oy + 13, 3, 7, classObj.secondary);
    }

    // 2. 腿部與靴子 (Legs & Boots)
    const legY = oy + 18;
    // 褲子
    px(ox - 3, legY, 3, 5, "#1a252f");
    px(ox + 1, legY, 3, 5, "#1a252f");
    // 皮靴
    px(ox - 4, legY + 4, 4, 4, "#4a2e18");
    px(ox + 1, legY + 4, 4, 4, "#3e2412");
    // 靴頭高光
    px(ox - 3, legY + 7, 2, 1, "#6d4626");
    px(ox + 2, legY + 7, 2, 1, "#6d4626");

    // 3. 身體軀幹與鎧甲/外衣 (Body & Armor)
    const bodyY = oy + 9;
    // 內襯
    px(ox - 4, bodyY, 9, 9, skinObj.shadow);
    // 職業主裝備
    px(ox - 4, bodyY + 1, 9, 8, classObj.primary);
    // 鎧甲高光與細節
    px(ox - 3, bodyY + 2, 7, 6, classObj.secondary);
    px(ox - 1, bodyY + 1, 3, 7, classObj.trim); // 胸前金飾/皮帶
    // 腰帶
    px(ox - 4, bodyY + 7, 9, 2, "#2c1d11");
    px(ox, bodyY + 7, 2, 2, classObj.trim);

    // 4. 頭部與臉部 (Head & Face)
    const headX = ox - 4;
    const headY = oy;
    // 臉部底色
    px(headX, headY, 9, 9, skinObj.hex);
    // 下巴陰影
    px(headX + 1, headY + 8, 7, 1, skinObj.shadow);
    px(headX + 2, headY + 9, 5, 1, skinObj.shadow);

    // 5. 眼睛 (Eyes)
    const eyeY = headY + 4;
    if (a.eyeStyle === 1) {
      // 堅毅明眸 (雙眼含高光)
      px(headX + 2, eyeY, 2, 2, a.eyeColor);
      px(headX + 6, eyeY, 2, 2, a.eyeColor);
      px(headX + 2, eyeY, 1, 1, "#ffffff");
      px(headX + 6, eyeY, 1, 1, "#ffffff");
    } else if (a.eyeStyle === 2) {
      // 溫柔圓眼
      px(headX + 1, eyeY, 3, 2, a.eyeColor);
      px(headX + 5, eyeY, 3, 2, a.eyeColor);
      px(headX + 2, eyeY, 1, 1, "#ffffff");
      px(headX + 6, eyeY, 1, 1, "#ffffff");
    } else {
      // 銳利專注
      px(headX + 2, eyeY, 2, 1, a.eyeColor);
      px(headX + 6, eyeY, 2, 1, a.eyeColor);
      px(headX + 3, eyeY, 1, 1, "#ffffff");
      px(headX + 7, eyeY, 1, 1, "#ffffff");
    }

    // 腮紅（女性角色柔和修飾）
    if (a.gender === "female") {
      px(headX + 1, eyeY + 2, 2, 1, "#ff9999");
      px(headX + 6, eyeY + 2, 2, 1, "#ff9999");
    }

    // 6. 髮型 (Hair Style)
    const hCol = a.hairColor;
    // 髮色暗面陰影
    const hShadow = "#151515";

    if (a.hairStyle === 1) {
      // 俐落短髮 (Classic Adventurer Short)
      px(headX - 1, headY - 2, 11, 4, hCol);
      px(headX - 2, headY, 3, 6, hCol);
      px(headX + 8, headY, 3, 6, hCol);
      // 劉海碎髮
      px(headX + 1, headY + 2, 2, 2, hCol);
      px(headX + 4, headY + 1, 2, 2, hCol);
      px(headX + 7, headY + 2, 2, 1, hCol);
    } else if (a.hairStyle === 2) {
      // 浪人長髮 / 馬尾 (Ronin Ponytail)
      px(headX - 1, headY - 2, 11, 4, hCol);
      px(headX - 2, headY, 3, 8, hCol);
      px(headX + 8, headY, 3, 8, hCol);
      // 馬尾垂於後方
      px(headX - 4, headY + 2, 3, 9, hCol);
      px(headX - 5, headY + 8, 3, 7, hCol);
      // 頭頂髮束
      px(ox - 3, headY - 4, 3, 3, hCol);
    } else if (a.hairStyle === 3) {
      // 熱血刺蝟頭 (Spiky Anime Hair)
      px(headX - 1, headY - 2, 11, 3, hCol);
      px(headX - 3, headY - 3, 3, 4, hCol);
      px(headX + 1, headY - 5, 3, 5, hCol);
      px(headX + 5, headY - 5, 3, 5, hCol);
      px(headX + 8, headY - 3, 3, 4, hCol);
      px(headX - 1, headY + 2, 2, 2, hCol);
      px(headX + 3, headY + 2, 3, 1, hCol);
    } else {
      // 飄逸長髮 / 雙馬尾 (Twin-tails / Long Flow)
      px(headX - 1, headY - 2, 11, 4, hCol);
      px(headX - 2, headY, 3, 6, hCol);
      px(headX + 8, headY, 3, 6, hCol);
      // 兩側長髮辮
      px(headX - 4, headY + 3, 3, 13, hCol);
      px(headX + 9, headY + 3, 3, 13, hCol);
      px(headX - 3, headY + 14, 2, 4, hCol);
      px(headX + 9, headY + 14, 2, 4, hCol);
      // 齊劉海
      px(headX + 1, headY + 2, 7, 1, hCol);
    }

    // 7. 手臂與武器 (Arms & Weapons)
    const armY = bodyY + 1;
    if (pose === "attack") {
      // 出招斬擊姿勢
      // 左手防護
      px(ox - 7, armY + 2, 3, 5, skinObj.hex);
      // 右手持武器向前揮動
      px(ox + 5, armY, 6, 3, skinObj.hex);

      // 武器繪製
      if (classObj.weapon === "sword") {
        // 銀色巨劍揮砍
        px(ox + 10, armY - 7, 3, 14, "#ecf0f1");
        px(ox + 11, armY - 8, 1, 16, "#ffffff");
        px(ox + 8, armY + 1, 5, 2, "#f1c40f"); // 劍格
        px(ox + 7, armY + 2, 2, 3, "#7f8c8d"); // 劍柄
      } else if (classObj.weapon === "tome") {
        // 學者魔導書
        px(ox + 8, armY - 3, 6, 7, "#8e44ad");
        px(ox + 9, armY - 2, 4, 5, "#ecf0f1");
      } else if (classObj.weapon === "spear") {
        // 商人長槍
        px(ox + 8, armY - 9, 2, 18, "#7f8c8d");
        px(ox + 7, armY - 11, 4, 3, "#ecf0f1");
      } else {
        // 舞者雙刃/扇子
        px(ox + 9, armY - 4, 5, 5, "#e74c3c");
        px(ox + 10, armY - 3, 3, 3, "#f1c40f");
      }
    } else if (pose === "victory") {
      // 勝利高舉武器
      px(ox - 6, armY, 3, 6, skinObj.hex);
      px(ox + 4, armY - 4, 3, 7, skinObj.hex);

      // 武器朝天
      if (classObj.weapon === "sword") {
        px(ox + 5, armY - 15, 2, 12, "#ecf0f1");
        px(ox + 3, armY - 5, 5, 2, "#f1c40f");
      }
    } else {
      // 站立姿態
      px(ox - 6, armY, 3, 7, skinObj.hex);
      px(ox + 4, armY, 3, 7, skinObj.hex);

      // 佩戴在腰間或背後的武器
      if (classObj.weapon === "sword") {
        px(ox - 7, armY + 1, 2, 11, "#bdc3c7");
        px(ox - 8, armY + 1, 4, 2, "#f1c40f");
      } else if (classObj.weapon === "tome") {
        px(ox + 5, armY + 2, 4, 6, "#8e44ad");
      } else if (classObj.weapon === "spear") {
        px(ox - 7, armY - 4, 2, 16, "#7f8c8d");
      }
    }

    // 8. 受擊白閃
    if (flashWhite) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.fillRect(0, 0, width, height);
    }
  }
};

window.AvatarManager = AvatarManager;

/**
 * handwriting.js - 五十音與漢字九宮格筆順手寫板 (9-Square Handwriting Board)
 * Touch/Mouse Drawing + Guide Shadow + Stroke Center Alignment Scorer
 */

const HandwritingBoard = {
  canvas: null,
  ctx: null,
  isDrawing: false,
  strokes: [], // 歷史筆畫集合 [[{x, y}, ...], ...]
  currentStroke: [],
  targetChar: "あ",
  showGuide: true,
  onCompleteCallback: null,

  init(canvasId = "handwritingCanvas") {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.bindEvents();
    this.drawBoard();
  },

  bindEvents() {
    if (!this.canvas) return;

    // 滑鼠事件
    this.canvas.addEventListener("mousedown", (e) => this.startDraw(e.offsetX, e.offsetY));
    this.canvas.addEventListener("mousemove", (e) => {
      if (this.isDrawing) this.addPoint(e.offsetX, e.offsetY);
    });
    window.addEventListener("mouseup", () => this.endDraw());

    // 觸控事件 (支援手機與平板觸控筆)
    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.startDraw(touch.clientX - rect.left, touch.clientY - rect.top);
      },
      { passive: false }
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (!this.isDrawing) return;
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.addPoint(touch.clientX - rect.left, touch.clientY - rect.top);
      },
      { passive: false }
    );

    this.canvas.addEventListener("touchend", () => this.endDraw());
  },

  setTarget(char, callback = null) {
    this.targetChar = char || "あ";
    this.onCompleteCallback = callback;
    this.clear();
  },

  clear() {
    this.strokes = [];
    this.currentStroke = [];
    this.drawBoard();
  },

  undo() {
    if (this.strokes.length > 0) {
      this.strokes.pop();
      this.drawBoard();
    }
  },

  toggleGuide() {
    this.showGuide = !this.showGuide;
    this.drawBoard();
  },

  startDraw(x, y) {
    this.isDrawing = true;
    this.currentStroke = [{ x, y }];
    this.drawBoard();
  },

  addPoint(x, y) {
    if (!this.isDrawing) return;
    this.currentStroke.push({ x, y });
    this.drawBoard();
  },

  endDraw() {
    if (this.isDrawing && this.currentStroke.length > 0) {
      this.strokes.push([...this.currentStroke]);
      this.currentStroke = [];
    }
    this.isDrawing = false;
    this.drawBoard();
  },

  /**
   * 繪製畫布（九宮格米字格輔助線 + 漢字/假名水印底字 + 使用者黑色毛筆筆跡）
   */
  drawBoard() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 清空背景（淡米色宣紙質感）
    ctx.fillStyle = "#faf8f2";
    ctx.fillRect(0, 0, w, h);

    // 1. 繪製九宮格／米字格輔助線
    ctx.save();
    ctx.strokeStyle = "rgba(192, 57, 43, 0.22)"; // 淡紅毛筆習字格
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // 水平三等分線
    ctx.beginPath();
    ctx.moveTo(0, h / 3); ctx.lineTo(w, h / 3);
    ctx.moveTo(0, (h / 3) * 2); ctx.lineTo(w, (h / 3) * 2);
    // 垂直三等分線
    ctx.moveTo(w / 3, 0); ctx.lineTo(w / 3, h);
    ctx.moveTo((w / 3) * 2, 0); ctx.lineTo((w / 3) * 2, h);
    // 斜對角米字線
    ctx.moveTo(0, 0); ctx.lineTo(w, h);
    ctx.moveTo(w, 0); ctx.lineTo(0, h);
    ctx.stroke();

    // 外邊框
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(192, 57, 43, 0.4)";
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.restore();

    // 2. 繪製水印目標底字 (Guide Watermark)
    if (this.showGuide && this.targetChar) {
      ctx.save();
      ctx.fillStyle = "rgba(160, 160, 160, 0.28)";
      ctx.font = `bold ${Math.round(h * 0.72)}px 'Noto Serif JP', 'Yu Mincho', serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.targetChar, w / 2, h / 2 + 6);
      ctx.restore();
    }

    // 3. 繪製已完成的所有筆畫
    ctx.save();
    ctx.strokeStyle = "#1a1a1a"; // 濃郁宣紙黑墨
    ctx.fillStyle = "#1a1a1a";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const allStrokes = [...this.strokes];
    if (this.currentStroke.length > 0) {
      allStrokes.push(this.currentStroke);
    }

    allStrokes.forEach((stroke) => {
      if (stroke.length === 0) return;
      if (stroke.length === 1) {
        // 單點
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });

    ctx.restore();
  },

  /**
   * 手寫評分分析（分析筆畫數、中心點偏移與筆墨覆蓋度）
   */
  evaluateWriting() {
    if (this.strokes.length === 0) {
      return {
        score: 0,
        comment: "尚未在手寫板上下筆，請臨摹字形揮毫寫寫看！",
        details: "未檢測到有效筆跡"
      };
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let totalPoints = 0;
    let sumX = 0, sumY = 0;

    this.strokes.forEach((stroke) => {
      stroke.forEach((pt) => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
        sumX += pt.x;
        sumY += pt.y;
        totalPoints++;
      });
    });

    const boxW = maxX - minX;
    const boxH = maxY - minY;
    const centerX = sumX / totalPoints;
    const centerY = sumY / totalPoints;

    // 偏離中心的距離
    const distFromCenter = Math.hypot(centerX - w / 2, centerY - h / 2);
    const centerScore = Math.max(0, 100 - (distFromCenter / (w * 0.25)) * 40);

    // 格局飽滿度 (應占據畫布 40% ~ 85% 區域)
    const ratioW = boxW / w;
    const ratioH = boxH / h;
    let sizeScore = 80;
    if (ratioW >= 0.4 && ratioW <= 0.85 && ratioH >= 0.4 && ratioH <= 0.85) {
      sizeScore = 95;
    } else if (ratioW < 0.3 || ratioH < 0.3) {
      sizeScore = 60; // 寫太小或縮在角落
    }

    const strokeCount = this.strokes.length;
    let finalScore = Math.round(centerScore * 0.5 + sizeScore * 0.5);
    finalScore = Math.min(100, Math.max(30, finalScore + Math.floor(Math.random() * 5)));

    let comment = "筆力穩健！結構平衡良好！";
    if (finalScore >= 90) {
      comment = "極為優異！骨架端正飽滿，中心重心拿捏得恰到好處！";
    } else if (finalScore >= 75) {
      comment = "寫得不錯！注意九宮格中央十字輔助線，字體會更顯立體大氣！";
    } else {
      comment = "再試一次！試著將字跡放大，填滿九宮格的核心區域喔！";
    }

    const res = {
      score: finalScore,
      strokes: strokeCount,
      targetChar: this.targetChar,
      comment
    };

    if (this.onCompleteCallback) {
      this.onCompleteCallback(res);
    }

    return res;
  },

  openModal(targetChar = "あ", callback = null) {
    let modal = document.getElementById("handwritingModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "handwritingModal";
      modal.className = "modal-overlay";
      modal.innerHTML = `
        <div class="modal-box" style="max-width:380px;text-align:center;">
          <div class="modal-header">
            <div style="font-size:1.15rem;font-weight:bold;color:var(--accent-gold);">
              🖌️ 九宮格臨摹手寫板
            </div>
            <button class="modal-close" id="closeHwModalBtn">✕</button>
          </div>

          <div style="font-size:0.9rem;color:var(--text-sub);margin:6px 0 10px;">
            請依照九宮格輔助線與筆順，寫下目標字：<strong id="hwTargetLabel" style="font-size:1.4rem;color:var(--accent-cyan);margin-left:6px;">あ</strong>
          </div>

          <div style="display:flex;justify-content:center;margin-bottom:12px;">
            <canvas id="handwritingCanvas" width="280" height="280" style="border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.3);touch-action:none;"></canvas>
          </div>

          <div style="display:flex;justify-content:center;gap:8px;margin-bottom:12px;">
            <button class="icon-btn" id="hwClearBtn">🗑️ 清空重寫</button>
            <button class="icon-btn" id="hwUndoBtn">↩️ 撤銷筆畫</button>
            <button class="icon-btn" id="hwGuideBtn">👁️ 切換陰影</button>
          </div>

          <div id="hwResultScoreBox" style="min-height:36px;font-size:0.92rem;color:var(--accent-gold);margin-bottom:10px;"></div>

          <div style="display:flex;justify-content:space-between;gap:12px;">
            <button class="btn-secondary" id="hwCancelBtn">關閉</button>
            <button class="btn-talk" id="hwSubmitBtn" style="flex:1;">✨ 提交筆跡評分！</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector("#closeHwModalBtn").onclick = () => modal.classList.remove("active");
      modal.querySelector("#hwCancelBtn").onclick = () => modal.classList.remove("active");
      modal.querySelector("#hwClearBtn").onclick = () => this.clear();
      modal.querySelector("#hwUndoBtn").onclick = () => this.undo();
      modal.querySelector("#hwGuideBtn").onclick = () => this.toggleGuide();

      modal.querySelector("#hwSubmitBtn").onclick = () => {
        const res = this.evaluateWriting();
        const scoreBox = modal.querySelector("#hwResultScoreBox");
        if (scoreBox) {
          scoreBox.innerHTML = `<strong>評分：${res.score} 分</strong><br><span style="font-size:0.85rem;color:var(--text-main);">${res.comment}</span>`;
        }
        if (res.score >= 70 && callback) {
          setTimeout(() => {
            modal.classList.remove("active");
            callback(res);
          }, 1000);
        }
      };
    }

    this.init("handwritingCanvas");
    this.setTarget(targetChar, callback);

    const lbl = modal.querySelector("#hwTargetLabel");
    if (lbl) lbl.textContent = targetChar;
    const sBox = modal.querySelector("#hwResultScoreBox");
    if (sBox) sBox.innerHTML = "";

    modal.classList.add("active");
  }
};

window.HandwritingBoard = HandwritingBoard;

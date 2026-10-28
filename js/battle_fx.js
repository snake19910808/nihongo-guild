/**
 * battle_fx.js - 《歧路旅人》戰鬥打擊特效與 Web Audio 音效合成引擎
 * Octopath Traveler Styled Combat FX & Pure Web Audio Synthesizer
 */

const BattleFX = {
  audioCtx: null,
  canvas: null,
  ctx: null,
  particles: [],
  damageNumbers: [],
  animFrameId: null,

  init(canvasId = "battleFxCanvas") {
    this.canvas = document.getElementById(canvasId);
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d");
      this.resizeCanvas();
      window.addEventListener("resize", () => this.resizeCanvas());
      this.startLoop();
    }
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth || 600;
      this.canvas.height = parent.clientHeight || 320;
    }
  },

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  },

  // ================= 🔊 Web Audio 純音效合成器 =================
  sound: {
    playSlash() {
      try {
        const ctx = BattleFX.getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } catch (e) {
        // Audio policy ignore
      }
    },

    playShieldHit() {
      try {
        const ctx = BattleFX.getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (e) {}
    },

    playBreak() {
      try {
        const ctx = BattleFX.getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // 碎玻璃清脆爆裂音 + 金屬震撼共鳴 (Glass Shatter & Chime)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(2400, now);
        osc1.frequency.exponentialRampToValueAtTime(280, now + 0.35);

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1760, now); // A6
        osc2.frequency.exponentialRampToValueAtTime(880, now + 0.45);

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
      } catch (e) {}
    },

    playCritical() {
      try {
        const ctx = BattleFX.getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } catch (e) {}
    },

    playVictory() {
      try {
        const ctx = BattleFX.getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        // 勝利小號琶音 (C5, E5, G5, C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteStart = now + idx * 0.12;

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, noteStart);

          gain.gain.setValueAtTime(0, noteStart);
          gain.gain.linearRampToValueAtTime(0.35, noteStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteStart);
          osc.stop(noteStart + 0.35);
        });
      } catch (e) {}
    },

    playWrong() {
      try {
        const ctx = BattleFX.getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.25);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } catch (e) {}
    }
  },

  // ================= 💥 畫布視覺特效 (Canvas FX) =================
  spawnSlash(x, y, color = "#f39c12", isCritical = false) {
    this.sound.playSlash();
    if (isCritical) {
      setTimeout(() => this.sound.playCritical(), 80);
    }

    // 斬擊弧光光刃
    this.particles.push({
      type: "slash",
      x,
      y,
      radius: isCritical ? 65 : 45,
      angle: -0.4,
      arc: Math.PI * 0.9,
      color: isCritical ? "#ff4757" : color,
      lineWidth: isCritical ? 6 : 4,
      alpha: 1.0,
      decay: 0.06
    });

    // 噴發火花粒子
    const sparkCount = isCritical ? 26 : 14;
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isCritical ? 9 : 6) + 2;
      this.particles.push({
        type: "spark",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color: isCritical ? "#ffa502" : color,
        alpha: 1.0,
        decay: Math.random() * 0.04 + 0.03
      });
    }

    // 螢幕震動
    this.triggerScreenShake(isCritical ? 10 : 5);
  },

  spawnDamageText(x, y, amount, isCritical = false, isBreak = false) {
    this.damageNumbers.push({
      x: x + (Math.random() * 20 - 10),
      y: y + (Math.random() * 10 - 5),
      vy: -3.5,
      amount,
      isCritical,
      isBreak,
      scale: isCritical ? 1.4 : 1.0,
      alpha: 1.0,
      decay: 0.025
    });
  },

  spawnBreakBanner(x, y) {
    this.sound.playBreak();
    this.triggerScreenShake(14);

    // 金色碎盾粒子大噴發
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      this.particles.push({
        type: "spark",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 4 + 3,
        color: "#f1c40f",
        alpha: 1.0,
        decay: Math.random() * 0.03 + 0.02
      });
    }

    // BREAK 文字特效
    this.particles.push({
      type: "breakBanner",
      x,
      y: y - 20,
      alpha: 1.0,
      scale: 0.5,
      maxScale: 1.3,
      decay: 0.018
    });
  },

  triggerScreenShake(intensity = 6) {
    const stage = document.querySelector(".battle-stage") || document.getElementById("tab-battle");
    if (!stage) return;
    stage.classList.remove("screen-shake");
    // 強制重繪觸發動畫
    void stage.offsetWidth;
    stage.style.setProperty("--shake-intensity", `${intensity}px`);
    stage.classList.add("screen-shake");
    setTimeout(() => {
      stage.classList.remove("screen-shake");
    }, 400);
  },

  startLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    const loop = () => {
      this.updateAndRender();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  },

  updateAndRender() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. 更新並繪製粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === "spark") {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // 輕微重力
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      } else if (p.type === "slash") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.lineWidth;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, p.angle, p.angle + p.arc);
        ctx.stroke();
      } else if (p.type === "breakBanner") {
        if (p.scale < p.maxScale) p.scale += 0.08;
        ctx.translate(p.x, p.y);
        ctx.scale(p.scale, p.scale);
        ctx.shadowColor = "#f1c40f";
        ctx.shadowBlur = 16;
        ctx.font = "900 28px 'Cinzel', 'Noto Sans TC', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("⚡ BREAK!", 0, 0);
        ctx.strokeStyle = "#e67e22";
        ctx.lineWidth = 2;
        ctx.strokeText("⚡ BREAK!", 0, 0);
      }

      ctx.restore();
    }

    // 2. 更新並繪製傷害數字 (Octopath Floating Numbers)
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.y += d.vy;
      d.vy += 0.15; // 重力浮動
      d.alpha -= d.decay;

      if (d.alpha <= 0) {
        this.damageNumbers.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, d.alpha);
      ctx.translate(d.x, d.y);
      ctx.scale(d.scale, d.scale);

      if (d.isCritical || d.isBreak) {
        // 暴擊 / 破防金紅色超大文字
        ctx.shadowColor = "#ff4757";
        ctx.shadowBlur = 12;
        ctx.font = "900 24px 'Impact', 'Noto Sans TC', sans-serif";
        ctx.fillStyle = "#ffd32a";
        ctx.textAlign = "center";
        ctx.fillText(`${d.amount}`, 0, 0);

        // 小副標
        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = "#ff4757";
        ctx.fillText(d.isBreak ? "BREAK HIT!" : "CRITICAL!", 0, -18);
      } else {
        // 一般傷害白黃色字體
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;
        ctx.font = "900 20px 'Impact', 'Noto Sans TC', sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(`${d.amount}`, 0, 0);
      }

      ctx.restore();
    }
  }
};

window.BattleFX = BattleFX;

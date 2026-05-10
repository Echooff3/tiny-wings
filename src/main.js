(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/definitions.ts
  var GAME = {
    // Physics
    gravity: 2200,
    // px/s^2
    diveGravity: 3400,
    // extra pull when diving
    maxFallSpeed: 1800,
    forwardSpeed: 420,
    // base horizontal speed
    maxForwardSpeed: 900,
    groundFriction: 0.88,
    // while sliding on ground
    slideBoost: 950,
    // added per perfect slide
    airDrag: 0.9995,
    // Hills generation
    hillSegmentWidth: 12,
    // pixel step for smooth curve
    hillVisibleAhead: 2200,
    // Bird
    birdRadius: 18,
    birdStartY: 200,
    // Perfect slide detection
    perfectSlideAngleThreshold: 0.35,
    // radians - alignment needed on takeoff
    perfectMinAirTime: 0.35,
    // Fever
    feverMax: 100,
    feverGainPerfect: 22,
    feverGainCoin: 3,
    feverDrainPerSec: 14,
    // Powerups
    coinValue: 10,
    starValue: 50
  };
  var COLORS = {
    skyTop: ["#0b1638", "#1a2a6c", "#3b1e5e", "#ff6b3d"],
    // deep night -> sunset
    skyBottom: ["#2c3a7a", "#5a3a9a", "#ff8d5a", "#ffd36b"],
    hillPalettes: [
      { a: "#2ecc71", b: "#27ae60", stripe: "#f1c40f" },
      // green
      { a: "#3498db", b: "#2980b9", stripe: "#ecf0f1" },
      // blue
      { a: "#e67e22", b: "#d35400", stripe: "#fff3b0" },
      // orange
      { a: "#9b59b6", b: "#8e44ad", stripe: "#ffd1ff" },
      // purple
      { a: "#e74c3c", b: "#c0392b", stripe: "#fef0d5" },
      // red
      { a: "#1abc9c", b: "#16a085", stripe: "#f6fff5" }
      // teal
    ]
  };

  // src/utils.ts
  var clamp = (v, min, max) => v < min ? min : v > max ? max : v;
  var lerp = (a, b, t) => a + (b - a) * t;
  function hashNoise(i, seed = 1337) {
    let x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function smoothNoise(x, seed = 1337) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    const a = hashNoise(i, seed);
    const b = hashNoise(i + 1, seed);
    return a * (1 - u) + b * u;
  }
  function fbm(x, seed = 1337) {
    let v = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < 4; i++) {
      v += amp * smoothNoise(x * freq, seed + i * 91);
      amp *= 0.5;
      freq *= 2.1;
    }
    return v;
  }

  // src/entities.ts
  function terrainHeight(x, baseY) {
    const s1 = Math.sin(x * 6e-3) * 120;
    const s2 = Math.sin(x * 0.013 + 1.2) * 70;
    const s3 = Math.sin(x * 0.028 + 2.7) * 35;
    const noise = (fbm(x * 2e-3, 77) - 0.5) * 60;
    return baseY + s1 + s2 + s3 + noise;
  }
  function terrainSlope(x, baseY) {
    const dx = 2;
    return (terrainHeight(x + dx, baseY) - terrainHeight(x - dx, baseY)) / (2 * dx);
  }
  var Bird = class {
    constructor() {
      __publicField(this, "x", 200);
      __publicField(this, "y", 200);
      __publicField(this, "vx", 420);
      __publicField(this, "vy", 0);
      __publicField(this, "radius", 18);
      __publicField(this, "angle", 0);
      __publicField(this, "onGround", false);
      __publicField(this, "diving", false);
      __publicField(this, "trail", []);
      __publicField(this, "slideStartX", null);
      __publicField(this, "slideDistance", 0);
      __publicField(this, "lastAirborneTime", 0);
      __publicField(this, "perfectChainTimer", 0);
    }
    reset(x, y) {
      this.x = x;
      this.y = y;
      this.vx = 420;
      this.vy = 0;
      this.angle = 0;
      this.onGround = false;
      this.diving = false;
      this.trail = [];
      this.slideStartX = null;
      this.slideDistance = 0;
      this.lastAirborneTime = 0;
      this.perfectChainTimer = 0;
    }
  };
  function generatePickupsInRange(fromX, toX, _baseY, existing, heightFn) {
    const step = 70;
    const startSlot = Math.ceil(fromX / step);
    const endSlot = Math.floor(toX / step);
    for (let s = startSlot; s <= endSlot; s++) {
      const x = s * step;
      const n = hashNoise(s, 4242);
      if (n < 0.55) continue;
      let kind = "coin";
      let yOffset = -50;
      if (n > 0.985) {
        kind = "shield";
        yOffset = -100;
      } else if (n > 0.96) {
        kind = "feather";
        yOffset = -100;
      } else if (n > 0.93) {
        kind = "chili";
        yOffset = -85;
      } else if (n > 0.88) {
        kind = "star";
        yOffset = -75;
      }
      const gy = heightFn(x);
      existing.push({
        x,
        y: gy + yOffset,
        kind,
        collected: false,
        bob: hashNoise(s, 99) * Math.PI * 2
      });
    }
  }
  function generateEnemiesInRange(fromX, toX, existing, heightFn, minX = 2200) {
    const step = 260;
    const startSlot = Math.ceil(Math.max(fromX, minX) / step);
    const endSlot = Math.floor(toX / step);
    for (let s = startSlot; s <= endSlot; s++) {
      const x = s * step + hashNoise(s, 12) * 80;
      const n = hashNoise(s, 7171);
      let spawnThreshold = 0.55;
      if (x < 6e3) spawnThreshold = 0.88;
      else if (x < 16e3) spawnThreshold = 0.72;
      if (n < spawnThreshold) continue;
      let kind;
      const k = hashNoise(s, 333);
      if (k < 0.3) kind = "hedgehog";
      else if (k < 0.55) kind = "bat";
      else if (k < 0.8) kind = "crow";
      else kind = "owl";
      const gy = heightFn(x);
      let y = gy - 90 - hashNoise(s, 44) * 80;
      if (kind === "hedgehog") y = gy - 18;
      existing.push({
        x,
        y,
        baseY: y,
        kind,
        t: hashNoise(s, 5) * 10,
        defeated: false,
        vx: 0,
        vy: 0
      });
    }
  }
  function spawnDust(arr, x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      arr.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 80,
        vy: -40 - Math.random() * 60,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 6 + Math.random() * 6,
        color: "",
        kind: "puff"
      });
    }
  }
  function spawnSparks(arr, x, y, color, count = 14) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 120 + Math.random() * 240;
      arr.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 80,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: 3 + Math.random() * 4,
        color,
        kind: "spark"
      });
    }
  }
  function spawnFeathers(arr, x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 140;
      arr.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 120,
        life: 1.2 + Math.random() * 0.5,
        maxLife: 1.7,
        size: 0.6 + Math.random() * 0.4,
        color: "",
        kind: "feather",
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 4
      });
    }
  }
  function spawnScorePopup(arr, x, y, text) {
    arr.push({
      x,
      y,
      vx: 0,
      vy: -80,
      life: 1,
      maxLife: 1,
      size: 1,
      color: "",
      kind: "score",
      text
    });
  }
  function spawnTrail(arr, x, y) {
    arr.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: -20 - Math.random() * 20,
      life: 0.45,
      maxLife: 0.45,
      size: 5 + Math.random() * 3,
      color: "",
      kind: "dust"
    });
  }

  // src/sprites.ts
  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
  }
  function ellipse(ctx, x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.closePath();
  }
  function stickerStroke(ctx) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  function drawBird(ctx, cx, cy, scale, pose, fever, t) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    const bodyTop = fever ? "#ff7a3a" : "#2f7fd6";
    const bodyMid = fever ? "#ffa35a" : "#4da3ee";
    const belly = "#ffffff";
    ctx.save();
    const backFlap = pose === 2 ? Math.sin(t * 22) * 0.5 : pose === 1 ? -0.4 : 0.2;
    ctx.translate(-6, -4);
    ctx.rotate(-0.3 + backFlap);
    const wg = ctx.createLinearGradient(-20, -10, 10, 15);
    wg.addColorStop(0, fever ? "#ffc97a" : "#8ac7ff");
    wg.addColorStop(1, fever ? "#ff7a3a" : "#2f7fd6");
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-25, -14, -32, -4);
    ctx.quadraticCurveTo(-22, 10, -4, 8);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.restore();
    const bodyGrad = ctx.createLinearGradient(0, -18, 0, 20);
    bodyGrad.addColorStop(0, bodyTop);
    bodyGrad.addColorStop(1, bodyMid);
    ctx.fillStyle = bodyGrad;
    ellipse(ctx, 0, 0, 22, 18);
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(2, 6, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.quadraticCurveTo(0, 4, 14, -2);
    ctx.quadraticCurveTo(14, 3, 10, 6);
    ctx.quadraticCurveTo(0, 10, -10, 6);
    ctx.quadraticCurveTo(-14, 3, -14, -2);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-22, 6 + Math.sin(t * 6) * 2);
    ctx.lineTo(-20, 12 + Math.sin(t * 6) * 2);
    ctx.lineTo(-10, 6);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = bodyGrad;
    circle(ctx, 14, -10, 14);
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "rgba(255,140,120,0.65)";
    circle(ctx, 20, -4, 4);
    ctx.fill();
    ctx.fillStyle = "#fff";
    circle(ctx, 17, -12, 5);
    ctx.fill();
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#1a1a2e";
    circle(ctx, 19, -12, 2.6);
    ctx.fill();
    ctx.fillStyle = "#fff";
    circle(ctx, 20, -13, 0.9);
    ctx.fill();
    ctx.fillStyle = "#ffb01f";
    ctx.beginPath();
    ctx.moveTo(24, -10);
    ctx.lineTo(34, -8);
    ctx.lineTo(24, -5);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.beginPath();
    ctx.moveTo(24, -7);
    ctx.lineTo(32, -8);
    ctx.strokeStyle = "#c47b00";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.save();
    const frontFlap = pose === 2 ? Math.sin(t * 22 + Math.PI) * 0.6 : pose === 1 ? 0.8 : -0.1 + Math.sin(t * 4) * 0.08;
    ctx.translate(-2, -2);
    ctx.rotate(frontFlap);
    const fg = ctx.createLinearGradient(-10, -20, 10, 10);
    fg.addColorStop(0, fever ? "#fff0c2" : "#bfe2ff");
    fg.addColorStop(1, fever ? "#ff9340" : "#3a8fdc");
    ctx.fillStyle = fg;
    ctx.beginPath();
    if (pose === 1) {
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(-14, -2, -18, 10);
      ctx.quadraticCurveTo(-4, 6, 4, 0);
    } else {
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(-8, -22, -24, -18);
      ctx.quadraticCurveTo(-14, -2, -6, 4);
    }
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.strokeStyle = "rgba(26,26,46,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (pose !== 1) {
      ctx.moveTo(-4, -6);
      ctx.lineTo(-16, -14);
      ctx.moveTo(-2, -2);
      ctx.lineTo(-18, -8);
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#ffb01f";
    ctx.beginPath();
    ctx.moveTo(-4, 16);
    ctx.lineTo(-8, 20);
    ctx.lineTo(2, 18);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    if (fever) {
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + i * 2.1;
        const rx = Math.cos(a) * 28;
        const ry = Math.sin(a) * 20;
        ctx.fillStyle = "rgba(255,220,120,0.9)";
        circle(ctx, rx, ry, 2 + Math.sin(a * 2) * 1);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawEnemy(ctx, kind, cx, cy, scale, t) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    if (kind === "bat") drawBat(ctx, t);
    else if (kind === "hedgehog") drawHedgehog(ctx, t);
    else if (kind === "owl") drawOwl(ctx, t);
    else drawCrow(ctx, t);
    ctx.restore();
  }
  function drawBat(ctx, t) {
    const flap = Math.sin(t * 10) * 0.5;
    const wg = ctx.createLinearGradient(-25, -5, 25, 10);
    wg.addColorStop(0, "#8a2b4a");
    wg.addColorStop(1, "#c0396a");
    ctx.fillStyle = wg;
    ctx.save();
    ctx.translate(-10, 0);
    ctx.rotate(-flap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-18, -10, -24, 0);
    ctx.lineTo(-18, 4);
    ctx.lineTo(-20, 10);
    ctx.lineTo(-12, 6);
    ctx.lineTo(-8, 12);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.restore();
    ctx.save();
    ctx.translate(10, 0);
    ctx.rotate(flap);
    ctx.scale(-1, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-18, -10, -24, 0);
    ctx.lineTo(-18, 4);
    ctx.lineTo(-20, 10);
    ctx.lineTo(-12, 6);
    ctx.lineTo(-8, 12);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.restore();
    const bg = ctx.createRadialGradient(0, -2, 2, 0, 0, 16);
    bg.addColorStop(0, "#ff6b5e");
    bg.addColorStop(1, "#c0392b");
    ctx.fillStyle = bg;
    ellipse(ctx, 0, 2, 12, 11);
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-9, -16);
    ctx.lineTo(-2, -10);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.beginPath();
    ctx.moveTo(6, -8);
    ctx.lineTo(9, -16);
    ctx.lineTo(2, -10);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#ffdd55";
    ellipse(ctx, -4, -1, 2.5, 3);
    ctx.fill();
    ellipse(ctx, 4, -1, 2.5, 3);
    ctx.fill();
    ctx.fillStyle = "#1a1a2e";
    circle(ctx, -4, 0, 1.2);
    ctx.fill();
    circle(ctx, 4, 0, 1.2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(-3, 6);
    ctx.lineTo(-1, 10);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 6);
    ctx.lineTo(1, 10);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
  }
  function drawHedgehog(ctx, t) {
    ctx.fillStyle = "#2b6b2f";
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2;
      const r = 14;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      const sx = Math.cos(a) * (r + 8);
      const sy = Math.sin(a) * (r + 8);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a + 0.2) * 2, y + Math.sin(a + 0.2) * 2);
      ctx.lineTo(sx, sy);
      ctx.lineTo(x + Math.cos(a - 0.2) * 2, y + Math.sin(a - 0.2) * 2);
      ctx.closePath();
      ctx.fill();
    }
    const bg = ctx.createRadialGradient(-3, -3, 2, 0, 0, 16);
    bg.addColorStop(0, "#9ed36a");
    bg.addColorStop(1, "#4a8a3f");
    ctx.fillStyle = bg;
    circle(ctx, 0, 2, 14);
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#cfe8a8";
    ellipse(ctx, 0, 4, 10, 8);
    ctx.fill();
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -1);
    ctx.lineTo(-3, 2);
    ctx.moveTo(7, -1);
    ctx.lineTo(3, 2);
    ctx.stroke();
    ctx.fillStyle = "#1a1a2e";
    circle(ctx, -4, 3, 1.4);
    ctx.fill();
    circle(ctx, 4, 3, 1.4);
    ctx.fill();
    ctx.fillStyle = "#1a1a2e";
    circle(ctx, 0, 6, 1.6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,140,120,0.6)";
    circle(ctx, -7, 7, 2);
    ctx.fill();
    circle(ctx, 7, 7, 2);
    ctx.fill();
  }
  function drawOwl(ctx, t) {
    const flap = Math.sin(t * 6) * 0.2;
    ctx.fillStyle = "#8e6bb3";
    ctx.save();
    ctx.translate(-12, 2);
    ctx.rotate(-flap);
    ellipse(ctx, 0, 0, 10, 14);
    ctx.fill();
    stickerStroke(ctx);
    ctx.restore();
    ctx.save();
    ctx.translate(12, 2);
    ctx.rotate(flap);
    ellipse(ctx, 0, 0, 10, 14);
    ctx.fill();
    stickerStroke(ctx);
    ctx.restore();
    const bg = ctx.createLinearGradient(0, -14, 0, 16);
    bg.addColorStop(0, "#c9a6e8");
    bg.addColorStop(1, "#8e6bb3");
    ctx.fillStyle = bg;
    ellipse(ctx, 0, 2, 14, 16);
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#ead4f5";
    ellipse(ctx, 0, 6, 9, 10);
    ctx.fill();
    ctx.fillStyle = "#fff";
    circle(ctx, -5, -3, 5);
    ctx.fill();
    stickerStroke(ctx);
    circle(ctx, 5, -3, 5);
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#1a1a2e";
    circle(ctx, -5, -3, 2);
    ctx.fill();
    circle(ctx, 5, -3, 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-1, -3);
    ctx.lineTo(1, -3);
    ctx.stroke();
    ctx.fillStyle = "#ffb01f";
    ctx.beginPath();
    ctx.moveTo(-2, 2);
    ctx.lineTo(2, 2);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#8e6bb3";
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(-12, -18);
    ctx.lineTo(-6, -12);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.beginPath();
    ctx.moveTo(10, -10);
    ctx.lineTo(12, -18);
    ctx.lineTo(6, -12);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
  }
  function drawCrow(ctx, t) {
    const flap = Math.sin(t * 12) * 0.5;
    ctx.fillStyle = "#1a1a1a";
    ctx.save();
    ctx.translate(-8, 0);
    ctx.rotate(-flap - 0.3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-18, -10, -22, 4);
    ctx.quadraticCurveTo(-10, 6, 0, 4);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.restore();
    ctx.save();
    ctx.translate(8, 0);
    ctx.rotate(flap + 0.3);
    ctx.scale(-1, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-18, -10, -22, 4);
    ctx.quadraticCurveTo(-10, 6, 0, 4);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.restore();
    ctx.fillStyle = "#2a2a2a";
    ellipse(ctx, 0, 2, 12, 13);
    ctx.fill();
    stickerStroke(ctx);
    circle(ctx, 0, -8, 9);
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.moveTo(-9, -12);
    ctx.quadraticCurveTo(0, -16, 9, -12);
    ctx.lineTo(10, -8);
    ctx.quadraticCurveTo(0, -10, -10, -8);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.beginPath();
    ctx.moveTo(8, -10);
    ctx.lineTo(14, -6);
    ctx.lineTo(12, -2);
    ctx.lineTo(6, -6);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#fff";
    circle(ctx, 2, -7, 3);
    ctx.fill();
    ctx.fillStyle = "#1a1a2e";
    circle(ctx, 3, -7, 1.6);
    ctx.fill();
    ctx.fillStyle = "#ffb01f";
    ctx.beginPath();
    ctx.moveTo(7, -6);
    ctx.lineTo(14, -4);
    ctx.lineTo(7, -2);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#e6e6e6";
    circle(ctx, -3, 4, 3);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    circle(ctx, -4, 3.5, 0.6);
    ctx.fill();
    circle(ctx, -2, 3.5, 0.6);
    ctx.fill();
  }
  function drawPowerup(ctx, kind, cx, cy, scale, t) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    let glow = "rgba(255,220,120,0.4)";
    if (kind === "chili") glow = "rgba(255,120,80,0.5)";
    else if (kind === "feather") glow = "rgba(160,220,255,0.5)";
    else if (kind === "shield") glow = "rgba(200,160,255,0.5)";
    else if (kind === "coin") glow = "rgba(255,210,100,0.5)";
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    g.addColorStop(0, glow);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    circle(ctx, 0, 0, 22);
    ctx.fill();
    const bob = Math.sin(t * 3) * 1.5;
    ctx.translate(0, bob);
    ctx.rotate(Math.sin(t * 2) * 0.08);
    if (kind === "star") drawStar(ctx, t);
    else if (kind === "chili") drawChili(ctx, t);
    else if (kind === "feather") drawFeather(ctx);
    else if (kind === "shield") drawShield(ctx, t);
    else if (kind === "coin") drawCoin(ctx, t);
    ctx.restore();
  }
  function drawStar(ctx, t) {
    ctx.fillStyle = "#ffd84a";
    starPath(ctx, 0, 0, 5, 14, 6);
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#6dd4ff";
    starPath(ctx, 0, 0, 5, 7, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    circle(ctx, -4, -4, 1.3);
    ctx.fill();
    ctx.globalAlpha = 0.7 + Math.sin(t * 6) * 0.3;
    circle(ctx, 6, 6, 1);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  function starPath(ctx, cx, cy, points, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = i / (points * 2) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  function drawChili(ctx, t) {
    const f1 = "#ffcc33", f2 = "#ff6b1a", f3 = "#d9381e";
    ctx.save();
    ctx.translate(-4, -12);
    const flick = Math.sin(t * 10) * 0.1;
    ctx.rotate(flick);
    ctx.fillStyle = f3;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(-8, 0, -2, -12);
    ctx.quadraticCurveTo(2, -4, 8, -10);
    ctx.quadraticCurveTo(6, 0, 10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = f2;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(-5, -2, 0, -8);
    ctx.quadraticCurveTo(3, -2, 7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = f1;
    ctx.beginPath();
    ctx.moveTo(1, 4);
    ctx.quadraticCurveTo(-1, 0, 2, -4);
    ctx.quadraticCurveTo(4, 0, 5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const cg = ctx.createLinearGradient(-4, 0, 8, 12);
    cg.addColorStop(0, "#ff5a4a");
    cg.addColorStop(1, "#b81e17");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.quadraticCurveTo(10, 0, 8, 12);
    ctx.quadraticCurveTo(4, 16, 0, 14);
    ctx.quadraticCurveTo(-6, 10, -4, -4);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(-1, 0);
    ctx.quadraticCurveTo(2, 4, 4, 10);
    ctx.quadraticCurveTo(1, 8, -2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3fa33f";
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(-6, -10);
    ctx.lineTo(0, -8);
    ctx.lineTo(-2, -4);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
  }
  function drawFeather(ctx) {
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-2, 12);
    ctx.quadraticCurveTo(0, 0, 4, -12);
    ctx.stroke();
    const g = ctx.createLinearGradient(-10, 0, 10, 0);
    g.addColorStop(0, "#b7e4ff");
    g.addColorStop(0.5, "#7fc4ff");
    g.addColorStop(1, "#3a8fdc");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(4, -12);
    ctx.quadraticCurveTo(14, -6, 8, 8);
    ctx.quadraticCurveTo(2, 10, -1, 6);
    ctx.quadraticCurveTo(-6, -4, 4, -12);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.strokeStyle = "rgba(26,26,46,0.5)";
    ctx.lineWidth = 0.8;
    for (let i = -10; i <= 6; i += 2) {
      ctx.beginPath();
      ctx.moveTo(2 + i * 0.1, i);
      ctx.lineTo(8 - Math.abs(i) * 0.2, i);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    circle(ctx, -4, -8, 1.2);
    ctx.fill();
    circle(ctx, 10, 0, 1);
    ctx.fill();
  }
  function drawShield(ctx, t) {
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.quadraticCurveTo(12, -12, 12, -4);
    ctx.quadraticCurveTo(12, 10, 0, 16);
    ctx.quadraticCurveTo(-12, 10, -12, -4);
    ctx.quadraticCurveTo(-12, -12, 0, -14);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    const bands = ["#ff5a5a", "#ffa63a", "#ffe14a", "#6de36d", "#5ec4ff", "#a87aff"];
    const bw = 32 / bands.length;
    for (let i = 0; i < bands.length; i++) {
      ctx.fillStyle = bands[i];
      ctx.fillRect(-16, -16 + i * bw, 32, bw);
    }
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(-8, -12);
    ctx.lineTo(-4, -12);
    ctx.lineTo(-12, 12);
    ctx.lineTo(-16, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.quadraticCurveTo(12, -12, 12, -4);
    ctx.quadraticCurveTo(12, 10, 0, 16);
    ctx.quadraticCurveTo(-12, 10, -12, -4);
    ctx.quadraticCurveTo(-12, -12, 0, -14);
    ctx.closePath();
    stickerStroke(ctx);
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.7 + Math.sin(t * 5) * 0.3;
    circle(ctx, -6, -8, 1.2);
    ctx.fill();
    circle(ctx, 6, 4, 1);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  function drawCoin(ctx, t) {
    ctx.fillStyle = "#e9f3ff";
    ctx.save();
    ctx.translate(-14, -2);
    ctx.rotate(-0.3 + Math.sin(t * 8) * 0.2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-10, -4, -14, 2);
    ctx.quadraticCurveTo(-8, 4, 0, 3);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.restore();
    ctx.save();
    ctx.translate(14, -2);
    ctx.rotate(0.3 - Math.sin(t * 8) * 0.2);
    ctx.scale(-1, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-10, -4, -14, 2);
    ctx.quadraticCurveTo(-8, 4, 0, 3);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.restore();
    const wobble = Math.abs(Math.cos(t * 4));
    ctx.save();
    ctx.scale(wobble * 0.3 + 0.7, 1);
    const cg = ctx.createRadialGradient(-3, -3, 2, 0, 0, 12);
    cg.addColorStop(0, "#fff1a8");
    cg.addColorStop(1, "#e2a11a");
    ctx.fillStyle = cg;
    circle(ctx, 0, 0, 11);
    ctx.fill();
    stickerStroke(ctx);
    ctx.fillStyle = "#fff6c2";
    starPath(ctx, 0, 0, 5, 6, 2.5);
    ctx.fill();
    ctx.fillStyle = "#e2a11a";
    starPath(ctx, 0, 0, 5, 4.5, 1.8);
    ctx.fill();
    ctx.restore();
  }
  function drawPuff(ctx, cx, cy, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#d8c9a8";
    circle(ctx, cx, cy, size);
    ctx.fill();
    ctx.fillStyle = "#b8a582";
    circle(ctx, cx - size * 0.4, cy + size * 0.2, size * 0.6);
    ctx.fill();
    ctx.fillStyle = "#f0e4c8";
    circle(ctx, cx + size * 0.3, cy - size * 0.3, size * 0.5);
    ctx.fill();
    ctx.restore();
  }
  function drawFeatherParticle(ctx, cx, cy, rot, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(0.6, 0.6);
    drawFeather(ctx);
    ctx.restore();
  }
  function drawScorePopup(ctx, cx, cy, text, alpha, scale) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.font = "bold 24px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#1a1a2e";
    ctx.strokeText(text, 0, 0);
    const g = ctx.createLinearGradient(0, -12, 0, 12);
    g.addColorStop(0, "#ffe14a");
    g.addColorStop(1, "#ff9f1a");
    ctx.fillStyle = g;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  function drawAngelWings(ctx, cx, cy, scale, t) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    const flap = Math.sin(t * 8) * 0.2;
    ctx.save();
    ctx.translate(-8, 0);
    ctx.rotate(-flap);
    const g1 = ctx.createLinearGradient(-20, 0, 0, 0);
    g1.addColorStop(0, "#ffffff");
    g1.addColorStop(1, "#bfe2ff");
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-14, -10, -22, -4);
    ctx.quadraticCurveTo(-18, 4, -8, 8);
    ctx.quadraticCurveTo(-4, 4, 0, 0);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.restore();
    ctx.save();
    ctx.translate(8, 0);
    ctx.rotate(flap);
    ctx.scale(-1, 1);
    const g2 = ctx.createLinearGradient(-20, 0, 0, 0);
    g2.addColorStop(0, "#ffffff");
    g2.addColorStop(1, "#bfe2ff");
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-14, -10, -22, -4);
    ctx.quadraticCurveTo(-18, 4, -8, 8);
    ctx.quadraticCurveTo(-4, 4, 0, 0);
    ctx.closePath();
    ctx.fill();
    stickerStroke(ctx);
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.8;
    circle(ctx, -18, -8, 1.2);
    ctx.fill();
    circle(ctx, 18, -8, 1.2);
    ctx.fill();
    ctx.restore();
  }

  // src/ui.ts
  var UI = class {
    constructor() {
      __publicField(this, "scoreEl", document.getElementById("score"));
      __publicField(this, "livesEl", document.getElementById("lives"));
      __publicField(this, "comboEl", document.getElementById("combo"));
      __publicField(this, "feverEl", document.getElementById("fever"));
      __publicField(this, "menuEl", document.getElementById("menu"));
      __publicField(this, "gameoverEl", document.getElementById("gameover"));
      __publicField(this, "startBtn", document.getElementById("startBtn"));
      __publicField(this, "restartBtn", document.getElementById("restartBtn"));
      __publicField(this, "bestScoreEl", document.getElementById("bestScore"));
      __publicField(this, "finalScoreEl", document.getElementById("finalScore"));
      __publicField(this, "finalBestEl", document.getElementById("finalBest"));
      __publicField(this, "finalPerfectsEl", document.getElementById("finalPerfects"));
    }
    setScore(meters) {
      this.scoreEl.textContent = `${meters} m`;
    }
    setLives(n, pulse = false) {
      const hearts = "\u2764\uFE0F".repeat(Math.max(0, n));
      const empty = "\u{1F5A4}".repeat(Math.max(0, 3 - n));
      this.livesEl.textContent = hearts + empty;
      if (pulse) {
        this.livesEl.classList.remove("pulse");
        void this.livesEl.offsetWidth;
        this.livesEl.classList.add("pulse");
      }
    }
    setCombo(n) {
      if (n <= 1) {
        this.comboEl.textContent = "";
        this.comboEl.classList.remove("active");
      } else {
        this.comboEl.textContent = `\u2728 Perfect x${n}`;
        this.comboEl.classList.add("active");
      }
    }
    setFever(pct) {
      if (pct <= 0) {
        this.feverEl.textContent = "";
        this.feverEl.classList.remove("active");
        return;
      }
      if (pct >= 100) {
        this.feverEl.textContent = `\u{1F525} FEVER!`;
        this.feverEl.classList.add("active");
      } else {
        this.feverEl.textContent = `\u{1F525} ${Math.floor(pct)}%`;
        this.feverEl.classList.remove("active");
      }
    }
    showMenu(best) {
      this.menuEl.classList.remove("hidden");
      this.gameoverEl.classList.add("hidden");
      this.bestScoreEl.textContent = String(best);
    }
    hideMenus() {
      this.menuEl.classList.add("hidden");
      this.gameoverEl.classList.add("hidden");
    }
    showGameOver(score, best, perfects) {
      this.gameoverEl.classList.remove("hidden");
      this.finalScoreEl.textContent = String(score);
      this.finalBestEl.textContent = String(best);
      this.finalPerfectsEl.textContent = String(perfects);
    }
  };

  // src/libs/persistence.ts
  var persistence = {
    setItem(key, value) {
      return window.persistentStorage.setItem(key, value);
    },
    getItem(key) {
      return window.persistentStorage.getItem(key);
    },
    removeItem(key) {
      return window.persistentStorage.removeItem(key);
    },
    clear() {
      return window.persistentStorage.clear();
    }
  };

  // src/game.ts
  var MAX_LIVES = 3;
  var STUN_INVULN_TIME = 3;
  var STUN_SLOW_TIME = 0.6;
  var Game = class {
    constructor(canvas) {
      __publicField(this, "canvas");
      __publicField(this, "ctx");
      __publicField(this, "ui", new UI());
      __publicField(this, "w", 0);
      __publicField(this, "h", 0);
      __publicField(this, "dpr", 1);
      __publicField(this, "state", "menu");
      __publicField(this, "time", 0);
      __publicField(this, "lastFrame", 0);
      __publicField(this, "camX", 0);
      __publicField(this, "camY", 0);
      __publicField(this, "shake", 0);
      __publicField(this, "bird", new Bird());
      __publicField(this, "pickups", []);
      __publicField(this, "enemies", []);
      __publicField(this, "particles", []);
      __publicField(this, "pickupsGeneratedUpTo", 0);
      __publicField(this, "enemiesGeneratedUpTo", 0);
      __publicField(this, "diveHeld", false);
      __publicField(this, "meters", 0);
      __publicField(this, "best", 0);
      __publicField(this, "combo", 0);
      __publicField(this, "fever", 0);
      __publicField(this, "perfects", 0);
      __publicField(this, "coinsCollected", 0);
      __publicField(this, "lives", MAX_LIVES);
      __publicField(this, "invulnTime", 0);
      // post-hit invulnerability
      __publicField(this, "stunTime", 0);
      // short stun control-loss
      __publicField(this, "hitFlash", 0);
      __publicField(this, "shieldTime", 0);
      __publicField(this, "glideTime", 0);
      __publicField(this, "speedBoostTime", 0);
      __publicField(this, "dayProgress", 0);
      __publicField(this, "baseGroundY", 0);
      __publicField(this, "_stallTime", 0);
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.resize();
      window.addEventListener("resize", () => this.resize());
      this.bindInput();
      this.bindButtons();
      this.loadBest();
    }
    async loadBest() {
      try {
        const v = await persistence.getItem("tw_best");
        if (v) this.best = parseInt(v, 10) || 0;
      } catch {
      }
      this.ui.showMenu(this.best);
      this.lastFrame = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }
    async saveBest() {
      try {
        await persistence.setItem("tw_best", String(this.best));
      } catch {
      }
    }
    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.w = w;
      this.h = h;
      this.canvas.width = Math.floor(w * this.dpr);
      this.canvas.height = Math.floor(h * this.dpr);
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.baseGroundY = h * 0.65;
    }
    bindInput() {
      const down = (e) => {
        if (this.state === "playing") {
          this.diveHeld = true;
          this.bird.diving = true;
        }
        e.preventDefault();
      };
      const up = () => {
        this.diveHeld = false;
        this.bird.diving = false;
      };
      window.addEventListener("keydown", (e) => {
        if (e.code === "Space") down(e);
      });
      window.addEventListener("keyup", (e) => {
        if (e.code === "Space") up();
      });
      this.canvas.addEventListener("mousedown", down);
      window.addEventListener("mouseup", up);
      this.canvas.addEventListener("touchstart", down, { passive: false });
      window.addEventListener("touchend", up);
      window.addEventListener("touchcancel", up);
    }
    bindButtons() {
      this.ui.startBtn.addEventListener("click", () => this.start());
      this.ui.restartBtn.addEventListener("click", () => this.start());
    }
    start() {
      this.state = "playing";
      this.ui.hideMenus();
      this.time = 0;
      this.meters = 0;
      this.combo = 0;
      this.fever = 0;
      this.perfects = 0;
      this.coinsCollected = 0;
      this.shieldTime = 0;
      this.glideTime = 0;
      this.speedBoostTime = 0;
      this.hitFlash = 0;
      this.lives = MAX_LIVES;
      this.invulnTime = 1.5;
      this.stunTime = 0;
      this.dayProgress = 0;
      this.pickups = [];
      this.enemies = [];
      this.particles = [];
      this.pickupsGeneratedUpTo = 0;
      this.enemiesGeneratedUpTo = 0;
      this.camX = 0;
      this.camY = 0;
      this.shake = 0;
      this._stallTime = 0;
      this.bird.reset(200, this.baseGroundY - 150);
      this.ui.setCombo(0);
      this.ui.setFever(0);
      this.ui.setScore(0);
      this.ui.setLives(this.lives);
    }
    loop(t) {
      const dt = Math.min(0.05, (t - this.lastFrame) / 1e3);
      this.lastFrame = t;
      this.time += dt;
      if (this.state === "playing") {
        this.update(dt);
      } else {
        this.camX += 40 * dt;
      }
      this.render();
      requestAnimationFrame((ts) => this.loop(ts));
    }
    heightAt(x) {
      return terrainHeight(x, this.baseGroundY);
    }
    slopeAt(x) {
      return terrainSlope(x, this.baseGroundY);
    }
    update(dt) {
      const b = this.bird;
      if (this.fever > 0) {
        this.fever -= GAME.feverDrainPerSec * dt;
        if (this.fever < 0) this.fever = 0;
      }
      const feverOn = this.fever >= GAME.feverMax;
      if (this.shieldTime > 0) this.shieldTime -= dt;
      if (this.glideTime > 0) this.glideTime -= dt;
      if (this.speedBoostTime > 0) this.speedBoostTime -= dt;
      if (this.hitFlash > 0) this.hitFlash -= dt;
      if (this.invulnTime > 0) this.invulnTime -= dt;
      if (this.stunTime > 0) this.stunTime -= dt;
      b.perfectChainTimer -= dt;
      if (b.perfectChainTimer <= 0 && this.combo > 0) {
        this.combo = 0;
        this.ui.setCombo(0);
      }
      let g = b.diving ? GAME.diveGravity : GAME.gravity;
      if (this.glideTime > 0 && !b.onGround) g *= 0.45;
      b.vy += g * dt;
      if (b.vy > GAME.maxFallSpeed) b.vy = GAME.maxFallSpeed;
      const gy = this.heightAt(b.x);
      const slope = this.slopeAt(b.x);
      const slopeAngle = Math.atan(slope);
      const wasAirborne = !b.onGround;
      if (b.y + b.radius >= gy) {
        const landed = wasAirborne;
        b.y = gy - b.radius;
        if (landed) {
          const velAngle = Math.atan2(b.vy, b.vx);
          const angleDiff = Math.abs(velAngle - slopeAngle);
          const descending = slope > 0.12 && b.vy > 0;
          const perfect = descending && angleDiff < GAME.perfectSlideAngleThreshold && b.lastAirborneTime > GAME.perfectMinAirTime && this.stunTime <= 0;
          if (perfect) {
            this.registerPerfect();
          } else {
            spawnDust(this.particles, b.x, b.y + b.radius, 4);
          }
          b.lastAirborneTime = 0;
        }
        b.onGround = true;
        if (b.diving && slope > 0) {
          const boost = slope * 400 * dt * 4;
          b.vx += boost;
        }
        const gravAlong = g * Math.sin(slopeAngle) * dt;
        b.vx += gravAlong;
        const friction = slope > 0 ? 0.998 : 0.992;
        b.vx *= friction;
        b.vy = Math.tan(slopeAngle) * b.vx;
        if (Math.abs(b.vx) > 300 && Math.random() < 0.5) {
          spawnTrail(this.particles, b.x - 10, b.y + b.radius * 0.6);
        }
      } else {
        b.onGround = false;
        b.lastAirborneTime += dt;
        b.vx *= GAME.airDrag;
      }
      if (this.speedBoostTime > 0) {
        b.vx = Math.min(b.vx + 400 * dt, GAME.maxForwardSpeed * 1.5);
      }
      const maxSpeed = feverOn ? GAME.maxForwardSpeed * 1.25 : GAME.maxForwardSpeed;
      const hardCap = this.speedBoostTime > 0 ? maxSpeed * 1.3 : maxSpeed;
      if (b.vx > hardCap) b.vx = hardCap;
      if (b.vx < 150) b.vx = 150;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const targetAngle = Math.atan2(b.vy, b.vx);
      b.angle = lerp(b.angle, targetAngle, this.stunTime > 0 ? 0.05 : 0.2);
      b.trail.push({ x: b.x, y: b.y, life: 0.5 });
      if (b.trail.length > 24) b.trail.shift();
      for (const tr of b.trail) tr.life -= dt;
      b.trail = b.trail.filter((t) => t.life > 0);
      this.meters = Math.floor(b.x / 40);
      this.ui.setScore(this.meters);
      this.dayProgress = b.x / 2e4 % COLORS.skyTop.length;
      const aheadX = b.x + GAME.hillVisibleAhead;
      if (aheadX > this.pickupsGeneratedUpTo) {
        generatePickupsInRange(
          this.pickupsGeneratedUpTo,
          aheadX,
          this.baseGroundY,
          this.pickups,
          (x) => this.heightAt(x)
        );
        this.pickupsGeneratedUpTo = aheadX;
      }
      if (aheadX > this.enemiesGeneratedUpTo) {
        generateEnemiesInRange(
          this.enemiesGeneratedUpTo,
          aheadX,
          this.enemies,
          (x) => this.heightAt(x)
        );
        this.enemiesGeneratedUpTo = aheadX;
      }
      for (const e of this.enemies) {
        if (e.defeated) {
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.vy += 1200 * dt;
          continue;
        }
        e.t += dt;
        if (e.kind === "bat") {
          e.y = e.baseY + Math.sin(e.t * 3) * 20;
        } else if (e.kind === "crow") {
          e.y = e.baseY + Math.sin(e.t * 2) * 30;
          e.x -= 30 * dt;
        } else if (e.kind === "owl") {
          e.y = e.baseY + Math.sin(e.t * 1.5) * 12;
        }
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist < b.radius + 18) {
          this.handleEnemyHit(e);
        }
      }
      this.enemies = this.enemies.filter((e) => e.x > b.x - 600 && (!e.defeated || e.y < this.baseGroundY + 400));
      for (const p of this.pickups) {
        if (p.collected) continue;
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        if (dx * dx + dy * dy < (b.radius + 20) ** 2) {
          this.collectPickup(p);
        }
      }
      this.pickups = this.pickups.filter(
        (p) => !p.collected && p.x > b.x - 400
      );
      for (const pt of this.particles) {
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if (pt.kind === "feather") {
          pt.vy += 120 * dt;
          pt.vx *= 0.98;
          pt.vx += Math.sin(pt.life * 8) * 8 * dt;
          if (pt.rot !== void 0 && pt.rotSpeed !== void 0) pt.rot += pt.rotSpeed * dt;
        } else if (pt.kind === "score") {
          pt.vy *= 0.96;
        } else {
          pt.vy += 600 * dt;
          pt.vx *= 0.98;
        }
      }
      this.particles = this.particles.filter((p) => p.life > 0);
      const targetCamX = b.x - this.w * 0.3;
      const targetCamY = b.y - this.h * 0.45;
      this.camX = lerp(this.camX, targetCamX, 0.1);
      this.camY = lerp(this.camY, targetCamY, 0.06);
      this.shake *= 0.9;
      if (b.onGround && b.vx < 190 && slope <= 0.02) {
        this._stallTime += dt;
        if (this._stallTime > 1.6) {
          this.endRun();
        }
      } else {
        this._stallTime = 0;
      }
    }
    isInvulnerable() {
      return this.invulnTime > 0 || this.shieldTime > 0 || this.fever >= GAME.feverMax;
    }
    handleEnemyHit(e) {
      const b = this.bird;
      const diving = b.vy > 150 && b.y < e.y - 4;
      if (diving || this.speedBoostTime > 0 || this.fever >= GAME.feverMax) {
        e.defeated = true;
        e.vx = (Math.random() - 0.5) * 100;
        e.vy = -300;
        b.vy = -420;
        this.fever = clamp(this.fever + 15, 0, GAME.feverMax);
        this.ui.setFever(this.fever);
        spawnFeathers(this.particles, e.x, e.y, 10);
        spawnSparks(this.particles, e.x, e.y, "#ffd84a", 12);
        spawnScorePopup(this.particles, e.x, e.y - 20, "+200");
        this.shake = 10;
        return;
      }
      if (this.invulnTime > 0) return;
      if (this.shieldTime > 0) {
        this.shieldTime = 0;
        e.defeated = true;
        e.vx = -200;
        e.vy = -200;
        spawnSparks(this.particles, b.x, b.y, "#a87aff", 18);
        this.hitFlash = 0.3;
        this.shake = 12;
        this.invulnTime = 1;
        return;
      }
      this.takeHit(e);
    }
    takeHit(e) {
      const b = this.bird;
      this.lives -= 1;
      this.ui.setLives(Math.max(0, this.lives), true);
      this.hitFlash = 0.45;
      this.shake = 20;
      spawnFeathers(this.particles, b.x, b.y, 14);
      spawnSparks(this.particles, b.x, b.y, "#ff5a6a", 12);
      spawnScorePopup(this.particles, b.x, b.y - 20, this.lives > 0 ? "OUCH!" : "K.O.");
      e.defeated = true;
      e.vx = 120;
      e.vy = -280;
      this.combo = 0;
      this.ui.setCombo(0);
      if (this.lives <= 0) {
        this.endRun();
        return;
      }
      b.vy = -520;
      b.vx = Math.max(260, b.vx * 0.6);
      this.invulnTime = STUN_INVULN_TIME;
      this.stunTime = STUN_SLOW_TIME;
    }
    registerPerfect() {
      const b = this.bird;
      this.combo += 1;
      this.perfects += 1;
      b.perfectChainTimer = 4;
      const boost = GAME.slideBoost + this.combo * 60;
      const slope = this.slopeAt(b.x);
      const angle = Math.atan(slope);
      b.vx += Math.cos(angle) * boost * 0.02;
      b.vy -= 180 + this.combo * 30;
      this.fever = clamp(this.fever + GAME.feverGainPerfect, 0, GAME.feverMax);
      this.ui.setCombo(this.combo);
      this.ui.setFever(this.fever);
      this.shake = 8;
      spawnSparks(this.particles, b.x, b.y + b.radius, "#ffd84a", 20);
      spawnScorePopup(this.particles, b.x, b.y - 10, `PERFECT x${this.combo}`);
    }
    collectPickup(p) {
      p.collected = true;
      const b = this.bird;
      if (p.kind === "coin") {
        this.coinsCollected += 1;
        this.fever = clamp(this.fever + GAME.feverGainCoin, 0, GAME.feverMax);
        this.ui.setFever(this.fever);
        spawnSparks(this.particles, p.x, p.y, "#ffd84a", 8);
        spawnScorePopup(this.particles, p.x, p.y - 10, "+100");
      } else if (p.kind === "star") {
        this.fever = clamp(this.fever + GAME.feverGainPerfect, 0, GAME.feverMax);
        b.vx += 160;
        b.vy -= 100;
        this.ui.setFever(this.fever);
        spawnSparks(this.particles, p.x, p.y, "#6dd4ff", 16);
        spawnScorePopup(this.particles, p.x, p.y - 10, "BOOST!");
      } else if (p.kind === "shield") {
        this.shieldTime = 8;
        spawnSparks(this.particles, p.x, p.y, "#a87aff", 14);
        spawnScorePopup(this.particles, p.x, p.y - 10, "SHIELD");
      } else if (p.kind === "feather") {
        this.glideTime = 6;
        spawnFeathers(this.particles, p.x, p.y, 8);
        spawnScorePopup(this.particles, p.x, p.y - 10, "GLIDE");
      } else if (p.kind === "chili") {
        this.speedBoostTime = 4;
        spawnSparks(this.particles, p.x, p.y, "#ff6b1a", 16);
        spawnScorePopup(this.particles, p.x, p.y - 10, "SPEED!");
      }
    }
    endRun() {
      if (this.state === "gameover") return;
      this.state = "gameover";
      spawnFeathers(this.particles, this.bird.x, this.bird.y, 14);
      if (this.meters > this.best) {
        this.best = this.meters;
        this.saveBest();
      }
      this.ui.showGameOver(this.meters, this.best, this.perfects);
    }
    // ---------------- RENDER ----------------
    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      this.drawSky();
      const sx = (Math.random() - 0.5) * this.shake;
      const sy = (Math.random() - 0.5) * this.shake;
      ctx.save();
      ctx.translate(sx, sy);
      this.drawParallax();
      this.drawTerrain();
      this.drawPickups();
      this.drawEnemies();
      this.drawParticles();
      this.drawBird();
      ctx.restore();
      if (this.fever >= GAME.feverMax) {
        const g = ctx.createRadialGradient(
          this.w / 2,
          this.h / 2,
          100,
          this.w / 2,
          this.h / 2,
          Math.max(this.w, this.h) * 0.7
        );
        g.addColorStop(0, "rgba(255,120,60,0)");
        g.addColorStop(1, "rgba(255,60,60,0.25)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.w, this.h);
      }
      if (this.hitFlash > 0) {
        ctx.fillStyle = `rgba(255,80,80,${this.hitFlash * 0.6})`;
        ctx.fillRect(0, 0, this.w, this.h);
      }
      if (this.state === "playing" && this.invulnTime > 0 && this.shieldTime <= 0 && this.fever < GAME.feverMax) {
        const pulse = 0.15 + Math.sin(this.time * 14) * 0.08;
        const g = ctx.createRadialGradient(
          this.w / 2,
          this.h / 2,
          this.h * 0.3,
          this.w / 2,
          this.h / 2,
          this.h * 0.75
        );
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(1, `rgba(255,220,160,${pulse})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.w, this.h);
      }
      const timers = [];
      if (this.shieldTime > 0) timers.push({ emoji: "\u{1F6E1}\uFE0F", t: this.shieldTime, max: 8, color: "#a87aff" });
      if (this.glideTime > 0) timers.push({ emoji: "\u{1FAB6}", t: this.glideTime, max: 6, color: "#7fc4ff" });
      if (this.speedBoostTime > 0) timers.push({ emoji: "\u{1F336}\uFE0F", t: this.speedBoostTime, max: 4, color: "#ff6b1a" });
      if (this.invulnTime > 0 && this.shieldTime <= 0 && this.fever < GAME.feverMax) {
        timers.push({ emoji: "\u2728", t: this.invulnTime, max: STUN_INVULN_TIME, color: "#ffd98a" });
      }
      if (timers.length > 0) {
        let y = this.h - 30;
        ctx.font = "bold 18px Fredoka, sans-serif";
        ctx.textAlign = "left";
        for (const t of timers) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          const w = 120;
          ctx.fillRect(16, y - 22, w, 30);
          ctx.fillStyle = t.color;
          ctx.fillRect(16, y - 22, w * Math.min(1, t.t / t.max), 30);
          ctx.fillStyle = "#fff";
          ctx.fillText(`${t.emoji} ${t.t.toFixed(1)}s`, 24, y - 2);
          y -= 38;
        }
      }
    }
    drawSky() {
      const ctx = this.ctx;
      const palettes = COLORS.skyTop.length;
      const p = this.dayProgress;
      const i0 = Math.floor(p) % palettes;
      const i1 = (i0 + 1) % palettes;
      const t = p - Math.floor(p);
      const top = lerpColor(COLORS.skyTop[i0], COLORS.skyTop[i1], t);
      const bot = lerpColor(COLORS.skyBottom[i0], COLORS.skyBottom[i1], t);
      const grad = ctx.createLinearGradient(0, 0, 0, this.h);
      grad.addColorStop(0, top);
      grad.addColorStop(1, bot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.w, this.h);
      const sunX = this.w * 0.78;
      const sunY = this.h * 0.28;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 160);
      sunGrad.addColorStop(0, "rgba(255,240,180,0.95)");
      sunGrad.addColorStop(0.4, "rgba(255,180,90,0.35)");
      sunGrad.addColorStop(1, "rgba(255,100,80,0)");
      ctx.fillStyle = sunGrad;
      ctx.fillRect(sunX - 180, sunY - 180, 360, 360);
      ctx.beginPath();
      ctx.arc(sunX, sunY, 48, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,250,220,0.95)";
      ctx.fill();
    }
    drawParallax() {
      const ctx = this.ctx;
      this.drawParallaxLayer(0.15, this.h * 0.55, 80, "rgba(40,55,120,0.55)");
      this.drawParallaxLayer(0.3, this.h * 0.62, 60, "rgba(60,50,130,0.65)");
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (let i = 0; i < 6; i++) {
        const cx = ((i * 420 - this.camX * 0.2) % (this.w + 400) + this.w + 400) % (this.w + 400) - 200;
        const cy = 80 + i % 3 * 40;
        this.drawCloud(cx, cy, 1 + i % 2 * 0.4);
      }
    }
    drawCloud(x, y, s) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
      ctx.arc(x + 24 * s, y + 4, 18 * s, 0, Math.PI * 2);
      ctx.arc(x - 22 * s, y + 6, 16 * s, 0, Math.PI * 2);
      ctx.arc(x + 8 * s, y - 10, 16 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    drawParallaxLayer(parallax, baseY, amp, color) {
      const ctx = this.ctx;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, this.h);
      const step = 20;
      for (let sx = 0; sx <= this.w + step; sx += step) {
        const wx = (sx + this.camX * parallax) * 0.6;
        const y = baseY + Math.sin(wx * 8e-3) * amp + Math.sin(wx * 3e-3 + 1.3) * amp * 0.6;
        ctx.lineTo(sx, y);
      }
      ctx.lineTo(this.w, this.h);
      ctx.closePath();
      ctx.fill();
    }
    drawTerrain() {
      const ctx = this.ctx;
      const startX = this.camX - 40;
      const endX = this.camX + this.w + 40;
      const regionW = 3e3;
      ctx.beginPath();
      ctx.moveTo(this.toScreenX(startX), this.h + 10);
      const step = GAME.hillSegmentWidth;
      for (let wx = startX; wx <= endX; wx += step) {
        const wy = this.heightAt(wx);
        ctx.lineTo(this.toScreenX(wx), this.toScreenY(wy));
      }
      ctx.lineTo(this.toScreenX(endX), this.h + 10);
      ctx.closePath();
      const region = Math.floor(this.bird.x / regionW) % COLORS.hillPalettes.length;
      const nextRegion = (region + 1) % COLORS.hillPalettes.length;
      const tReg = this.bird.x % regionW / regionW;
      const palA = COLORS.hillPalettes[region];
      const palB = COLORS.hillPalettes[nextRegion];
      const colA = lerpColor(palA.a, palB.a, tReg);
      const colB = lerpColor(palA.b, palB.b, tReg);
      const stripe = lerpColor(palA.stripe, palB.stripe, tReg);
      const grad = ctx.createLinearGradient(0, this.toScreenY(this.baseGroundY - 200), 0, this.h);
      grad.addColorStop(0, colA);
      grad.addColorStop(1, colB);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = stripe;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 3;
      const stripeSpacing = 14;
      const offset = this.camX * 0.5 % stripeSpacing;
      ctx.beginPath();
      for (let sx = -this.h; sx < this.w + this.h; sx += stripeSpacing) {
        const x0 = sx - offset;
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0 + this.h, this.h);
      }
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      for (let wx = startX; wx <= endX; wx += step) {
        const wy = this.heightAt(wx);
        const sx = this.toScreenX(wx);
        const sy = this.toScreenY(wy);
        if (wx === startX) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    drawPickups() {
      const ctx = this.ctx;
      for (const p of this.pickups) {
        if (p.collected) continue;
        const sx = this.toScreenX(p.x);
        if (sx < -60 || sx > this.w + 60) continue;
        const sy = this.toScreenY(p.y);
        drawPowerup(ctx, p.kind, sx, sy, 1, this.time + p.bob);
      }
    }
    drawEnemies() {
      const ctx = this.ctx;
      for (const e of this.enemies) {
        const sx = this.toScreenX(e.x);
        if (sx < -60 || sx > this.w + 60) continue;
        const sy = this.toScreenY(e.y);
        ctx.save();
        if (e.defeated) {
          ctx.globalAlpha = 0.8;
          ctx.rotate(this.time * 6);
        }
        drawEnemy(ctx, e.kind, sx, sy, 1.2, e.t);
        ctx.restore();
      }
    }
    drawParticles() {
      const ctx = this.ctx;
      for (const p of this.particles) {
        const a = clamp(p.life / p.maxLife, 0, 1);
        const sx = this.toScreenX(p.x);
        const sy = this.toScreenY(p.y);
        if (p.kind === "feather") {
          drawFeatherParticle(ctx, sx, sy, p.rot || 0, a);
        } else if (p.kind === "puff" || p.kind === "dust") {
          drawPuff(ctx, sx, sy, p.size, a * 0.8);
        } else if (p.kind === "score") {
          drawScorePopup(ctx, sx, sy, p.text || "", a, 1 + (1 - a) * 0.3);
        } else {
          ctx.save();
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(sx, sy, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
    drawBird() {
      const ctx = this.ctx;
      const b = this.bird;
      const sx = this.toScreenX(b.x);
      const sy = this.toScreenY(b.y);
      for (let i = 0; i < b.trail.length; i++) {
        const t = b.trail[i];
        const a = i / b.trail.length * 0.4;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = this.fever >= GAME.feverMax ? "#ff7a3a" : "#ffffff";
        ctx.beginPath();
        ctx.arc(this.toScreenX(t.x), this.toScreenY(t.y), 5 * (i / b.trail.length), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (this.glideTime > 0) {
        drawAngelWings(ctx, sx, sy, 1.2, this.time);
      }
      if (this.speedBoostTime > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,150,60,0.7)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        for (let i = 0; i < 5; i++) {
          const yy = sy - 15 + i * 7;
          const off = (this.time * 400 + i * 30) % 60;
          ctx.globalAlpha = 0.4 + Math.random() * 0.3;
          ctx.beginPath();
          ctx.moveTo(sx - 20 - off, yy);
          ctx.lineTo(sx - 60 - off, yy);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (this.shieldTime > 0) {
        ctx.save();
        const pulse = 1 + Math.sin(this.time * 8) * 0.08;
        const grad = ctx.createRadialGradient(sx, sy, 10, sx, sy, 36 * pulse);
        grad.addColorStop(0, "rgba(168,122,255,0)");
        grad.addColorStop(0.7, "rgba(168,122,255,0.2)");
        grad.addColorStop(1, "rgba(168,122,255,0.7)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, 36 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(200,160,255,0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      if (this.invulnTime > 0 && this.shieldTime <= 0 && this.fever < GAME.feverMax) {
        ctx.save();
        const pulse = 1 + Math.sin(this.time * 10) * 0.1;
        const fade = Math.min(1, this.invulnTime / 0.5);
        const grad = ctx.createRadialGradient(sx, sy, 8, sx, sy, 34 * pulse);
        grad.addColorStop(0, "rgba(255,240,160,0)");
        grad.addColorStop(0.7, `rgba(255,220,120,${0.15 * fade})`);
        grad.addColorStop(1, `rgba(255,200,80,${0.55 * fade})`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, 34 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,230,140,${0.7 * fade})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const a = this.time * 4 + i * 2.1;
          const r = 30 + Math.sin(a * 1.5) * 3;
          const px = sx + Math.cos(a) * r;
          const py = sy + Math.sin(a) * r;
          ctx.fillStyle = `rgba(255,245,190,${0.9 * fade})`;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      const blinking = this.invulnTime > 0 && this.shieldTime <= 0 && this.fever < GAME.feverMax;
      let birdAlpha = 1;
      if (blinking) {
        birdAlpha = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(this.time * 26));
      }
      ctx.save();
      ctx.globalAlpha = birdAlpha;
      ctx.translate(sx, sy);
      ctx.rotate(b.angle * 0.8);
      if (this.stunTime > 0) {
        ctx.rotate(Math.sin(this.time * 30) * 0.15);
      }
      const pose = b.diving ? 1 : b.onGround ? 0 : 2;
      const scale = b.diving ? 1.05 : 1;
      drawBird(ctx, 0, 0, scale, pose, this.fever >= GAME.feverMax, this.time);
      ctx.restore();
      if (this.stunTime > 0) {
        ctx.save();
        for (let i = 0; i < 3; i++) {
          const a = this.time * 6 + i * (Math.PI * 2 / 3);
          const sxx = sx + Math.cos(a) * 16;
          const syy = sy - 24 + Math.sin(a) * 4;
          ctx.fillStyle = "#ffe14a";
          ctx.font = "bold 16px Fredoka, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("\u2726", sxx, syy);
        }
        ctx.restore();
      }
    }
    toScreenX(wx) {
      return wx - this.camX;
    }
    toScreenY(wy) {
      return wy - this.camY;
    }
  };
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const n = parseInt(full, 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function lerpColor(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
    const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
    const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }

  // src/main.ts
  function main() {
    const canvas = document.getElementById("game");
    if (!canvas) return;
    new Game(canvas);
  }
  main();
})();

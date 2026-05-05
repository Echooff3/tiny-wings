
// Procedural sprite drawing inspired by the provided sprite sheet.
// Since we cannot embed image files, these functions render detailed
// cartoon-style graphics directly on the canvas, matching the sheet's
// visual language (bold outlines, vibrant palette, sticker-like shapes).

type Ctx = CanvasRenderingContext2D;

// ---------- Utility ----------
function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.closePath();
}

function stickerStroke(ctx: Ctx): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

// ---------- BIRD ----------
// pose: 0 = gliding (wings up), 1 = diving (wings back/folded), 2 = flapping
export function drawBird(
  ctx: Ctx,
  cx: number,
  cy: number,
  scale: number,
  pose: 0 | 1 | 2,
  fever: boolean,
  t: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Body colors
  const bodyTop = fever ? "#ff7a3a" : "#2f7fd6";
  const bodyMid = fever ? "#ffa35a" : "#4da3ee";
  const belly = "#ffffff";

  // ---- Back wing (behind body) ----
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

  // ---- Body ----
  const bodyGrad = ctx.createLinearGradient(0, -18, 0, 20);
  bodyGrad.addColorStop(0, bodyTop);
  bodyGrad.addColorStop(1, bodyMid);
  ctx.fillStyle = bodyGrad;
  ellipse(ctx, 0, 0, 22, 18);
  ctx.fill();
  stickerStroke(ctx);

  // White belly patch
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(2, 6, 13, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Red scarf (like the sprite sheet)
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
  // Scarf tail
  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-22, 6 + Math.sin(t * 6) * 2);
  ctx.lineTo(-20, 12 + Math.sin(t * 6) * 2);
  ctx.lineTo(-10, 6);
  ctx.closePath();
  ctx.fill();
  stickerStroke(ctx);

  // ---- Head ----
  ctx.fillStyle = bodyGrad;
  circle(ctx, 14, -10, 14);
  ctx.fill();
  stickerStroke(ctx);

  // Cheek blush
  ctx.fillStyle = "rgba(255,140,120,0.65)";
  circle(ctx, 20, -4, 4);
  ctx.fill();

  // Eye white
  ctx.fillStyle = "#fff";
  circle(ctx, 17, -12, 5);
  ctx.fill();
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pupil (looks forward)
  ctx.fillStyle = "#1a1a2e";
  circle(ctx, 19, -12, 2.6);
  ctx.fill();
  ctx.fillStyle = "#fff";
  circle(ctx, 20, -13, 0.9);
  ctx.fill();

  // Beak
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

  // ---- Front wing (over body) ----
  ctx.save();
  const frontFlap = pose === 2 ? Math.sin(t * 22 + Math.PI) * 0.6
                  : pose === 1 ? 0.8
                  : -0.1 + Math.sin(t * 4) * 0.08;
  ctx.translate(-2, -2);
  ctx.rotate(frontFlap);
  const fg = ctx.createLinearGradient(-10, -20, 10, 10);
  fg.addColorStop(0, fever ? "#fff0c2" : "#bfe2ff");
  fg.addColorStop(1, fever ? "#ff9340" : "#3a8fdc");
  ctx.fillStyle = fg;
  ctx.beginPath();
  if (pose === 1) {
    // Folded/back wing for dive
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(-14, -2, -18, 10);
    ctx.quadraticCurveTo(-4, 6, 4, 0);
  } else {
    // Extended wing
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(-8, -22, -24, -18);
    ctx.quadraticCurveTo(-14, -2, -6, 4);
  }
  ctx.closePath();
  ctx.fill();
  stickerStroke(ctx);

  // Wing feather lines
  ctx.strokeStyle = "rgba(26,26,46,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (pose !== 1) {
    ctx.moveTo(-4, -6); ctx.lineTo(-16, -14);
    ctx.moveTo(-2, -2); ctx.lineTo(-18, -8);
  }
  ctx.stroke();
  ctx.restore();

  // ---- Feet (tucked) ----
  ctx.fillStyle = "#ffb01f";
  ctx.beginPath();
  ctx.moveTo(-4, 16);
  ctx.lineTo(-8, 20);
  ctx.lineTo(2, 18);
  ctx.closePath();
  ctx.fill();
  stickerStroke(ctx);

  // Fever sparkles
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

// ---------- ENEMIES ----------
export type EnemyKind = "bat" | "hedgehog" | "owl" | "crow";

export function drawEnemy(
  ctx: Ctx,
  kind: EnemyKind,
  cx: number,
  cy: number,
  scale: number,
  t: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (kind === "bat") drawBat(ctx, t);
  else if (kind === "hedgehog") drawHedgehog(ctx, t);
  else if (kind === "owl") drawOwl(ctx, t);
  else drawCrow(ctx, t);

  ctx.restore();
}

function drawBat(ctx: Ctx, t: number): void {
  const flap = Math.sin(t * 10) * 0.5;
  // Wings
  const wg = ctx.createLinearGradient(-25, -5, 25, 10);
  wg.addColorStop(0, "#8a2b4a");
  wg.addColorStop(1, "#c0396a");
  ctx.fillStyle = wg;
  // Left wing
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
  ctx.fill(); stickerStroke(ctx);
  ctx.restore();
  // Right wing
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
  ctx.fill(); stickerStroke(ctx);
  ctx.restore();

  // Body
  const bg = ctx.createRadialGradient(0, -2, 2, 0, 0, 16);
  bg.addColorStop(0, "#ff6b5e");
  bg.addColorStop(1, "#c0392b");
  ctx.fillStyle = bg;
  ellipse(ctx, 0, 2, 12, 11);
  ctx.fill(); stickerStroke(ctx);

  // Ears
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.moveTo(-6, -8); ctx.lineTo(-9, -16); ctx.lineTo(-2, -10); ctx.closePath();
  ctx.fill(); stickerStroke(ctx);
  ctx.beginPath();
  ctx.moveTo(6, -8); ctx.lineTo(9, -16); ctx.lineTo(2, -10); ctx.closePath();
  ctx.fill(); stickerStroke(ctx);

  // Eyes
  ctx.fillStyle = "#ffdd55";
  ellipse(ctx, -4, -1, 2.5, 3);
  ctx.fill();
  ellipse(ctx, 4, -1, 2.5, 3);
  ctx.fill();
  ctx.fillStyle = "#1a1a2e";
  circle(ctx, -4, 0, 1.2); ctx.fill();
  circle(ctx, 4, 0, 1.2); ctx.fill();

  // Fangs
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(-3, 6); ctx.lineTo(-1, 10); ctx.lineTo(0, 6); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(3, 6); ctx.lineTo(1, 10); ctx.lineTo(0, 6); ctx.closePath();
  ctx.fill();
}

function drawHedgehog(ctx: Ctx, t: number): void {
  // Spikes (back layer)
  ctx.fillStyle = "#2b6b2f";
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
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
  // Body
  const bg = ctx.createRadialGradient(-3, -3, 2, 0, 0, 16);
  bg.addColorStop(0, "#9ed36a");
  bg.addColorStop(1, "#4a8a3f");
  ctx.fillStyle = bg;
  circle(ctx, 0, 2, 14);
  ctx.fill(); stickerStroke(ctx);

  // Face
  ctx.fillStyle = "#cfe8a8";
  ellipse(ctx, 0, 4, 10, 8);
  ctx.fill();

  // Angry eyes
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, -1); ctx.lineTo(-3, 2);
  ctx.moveTo(7, -1); ctx.lineTo(3, 2);
  ctx.stroke();
  // Pupils
  ctx.fillStyle = "#1a1a2e";
  circle(ctx, -4, 3, 1.4); ctx.fill();
  circle(ctx, 4, 3, 1.4); ctx.fill();

  // Nose
  ctx.fillStyle = "#1a1a2e";
  circle(ctx, 0, 6, 1.6);
  ctx.fill();

  // Blush
  ctx.fillStyle = "rgba(255,140,120,0.6)";
  circle(ctx, -7, 7, 2);
  ctx.fill();
  circle(ctx, 7, 7, 2);
  ctx.fill();

  void t;
}

function drawOwl(ctx: Ctx, t: number): void {
  const flap = Math.sin(t * 6) * 0.2;
  // Wings
  ctx.fillStyle = "#8e6bb3";
  ctx.save();
  ctx.translate(-12, 2);
  ctx.rotate(-flap);
  ellipse(ctx, 0, 0, 10, 14);
  ctx.fill(); stickerStroke(ctx);
  ctx.restore();
  ctx.save();
  ctx.translate(12, 2);
  ctx.rotate(flap);
  ellipse(ctx, 0, 0, 10, 14);
  ctx.fill(); stickerStroke(ctx);
  ctx.restore();

  // Body
  const bg = ctx.createLinearGradient(0, -14, 0, 16);
  bg.addColorStop(0, "#c9a6e8");
  bg.addColorStop(1, "#8e6bb3");
  ctx.fillStyle = bg;
  ellipse(ctx, 0, 2, 14, 16);
  ctx.fill(); stickerStroke(ctx);

  // Belly
  ctx.fillStyle = "#ead4f5";
  ellipse(ctx, 0, 6, 9, 10);
  ctx.fill();

  // Eyes (big glasses)
  ctx.fillStyle = "#fff";
  circle(ctx, -5, -3, 5); ctx.fill(); stickerStroke(ctx);
  circle(ctx, 5, -3, 5); ctx.fill(); stickerStroke(ctx);
  ctx.fillStyle = "#1a1a2e";
  circle(ctx, -5, -3, 2); ctx.fill();
  circle(ctx, 5, -3, 2); ctx.fill();
  // Glasses bridge
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-1, -3); ctx.lineTo(1, -3);
  ctx.stroke();

  // Beak
  ctx.fillStyle = "#ffb01f";
  ctx.beginPath();
  ctx.moveTo(-2, 2); ctx.lineTo(2, 2); ctx.lineTo(0, 7); ctx.closePath();
  ctx.fill(); stickerStroke(ctx);

  // Ear tufts
  ctx.fillStyle = "#8e6bb3";
  ctx.beginPath();
  ctx.moveTo(-10, -10); ctx.lineTo(-12, -18); ctx.lineTo(-6, -12); ctx.closePath();
  ctx.fill(); stickerStroke(ctx);
  ctx.beginPath();
  ctx.moveTo(10, -10); ctx.lineTo(12, -18); ctx.lineTo(6, -12); ctx.closePath();
  ctx.fill(); stickerStroke(ctx);
}

function drawCrow(ctx: Ctx, t: number): void {
  const flap = Math.sin(t * 12) * 0.5;
  // Wings
  ctx.fillStyle = "#1a1a1a";
  ctx.save();
  ctx.translate(-8, 0);
  ctx.rotate(-flap - 0.3);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-18, -10, -22, 4);
  ctx.quadraticCurveTo(-10, 6, 0, 4);
  ctx.closePath();
  ctx.fill(); stickerStroke(ctx);
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
  ctx.fill(); stickerStroke(ctx);
  ctx.restore();

  // Body
  ctx.fillStyle = "#2a2a2a";
  ellipse(ctx, 0, 2, 12, 13);
  ctx.fill(); stickerStroke(ctx);

  // Head
  circle(ctx, 0, -8, 9);
  ctx.fill(); stickerStroke(ctx);

  // Red bandana
  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.moveTo(-9, -12);
  ctx.quadraticCurveTo(0, -16, 9, -12);
  ctx.lineTo(10, -8);
  ctx.quadraticCurveTo(0, -10, -10, -8);
  ctx.closePath();
  ctx.fill(); stickerStroke(ctx);
  // Bandana knot
  ctx.beginPath();
  ctx.moveTo(8, -10);
  ctx.lineTo(14, -6);
  ctx.lineTo(12, -2);
  ctx.lineTo(6, -6);
  ctx.closePath();
  ctx.fill(); stickerStroke(ctx);

  // Eye
  ctx.fillStyle = "#fff";
  circle(ctx, 2, -7, 3); ctx.fill();
  ctx.fillStyle = "#1a1a2e";
  circle(ctx, 3, -7, 1.6); ctx.fill();

  // Beak
  ctx.fillStyle = "#ffb01f";
  ctx.beginPath();
  ctx.moveTo(7, -6); ctx.lineTo(14, -4); ctx.lineTo(7, -2); ctx.closePath();
  ctx.fill(); stickerStroke(ctx);

  // Skull patch
  ctx.fillStyle = "#e6e6e6";
  circle(ctx, -3, 4, 3); ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  circle(ctx, -4, 3.5, 0.6); ctx.fill();
  circle(ctx, -2, 3.5, 0.6); ctx.fill();
}

// ---------- POWER-UPS ----------
export type PowerupKind = "star" | "chili" | "feather" | "shield" | "coin";

export function drawPowerup(
  ctx: Ctx,
  kind: PowerupKind,
  cx: number,
  cy: number,
  scale: number,
  t: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Soft glow
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

function drawStar(ctx: Ctx, t: number): void {
  // Gold star
  ctx.fillStyle = "#ffd84a";
  starPath(ctx, 0, 0, 5, 14, 6);
  ctx.fill(); stickerStroke(ctx);
  // Inner cyan star
  ctx.fillStyle = "#6dd4ff";
  starPath(ctx, 0, 0, 5, 7, 3);
  ctx.fill();
  // Sparkle
  ctx.fillStyle = "#fff";
  circle(ctx, -4, -4, 1.3); ctx.fill();
  ctx.globalAlpha = 0.7 + Math.sin(t * 6) * 0.3;
  circle(ctx, 6, 6, 1); ctx.fill();
  ctx.globalAlpha = 1;
}

function starPath(ctx: Ctx, cx: number, cy: number, points: number, outer: number, inner: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawChili(ctx: Ctx, t: number): void {
  // Flame behind
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

  // Chili body
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
  ctx.fill(); stickerStroke(ctx);

  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(-1, 0);
  ctx.quadraticCurveTo(2, 4, 4, 10);
  ctx.quadraticCurveTo(1, 8, -2, 2);
  ctx.closePath();
  ctx.fill();

  // Stem
  ctx.fillStyle = "#3fa33f";
  ctx.beginPath();
  ctx.moveTo(-4, -4);
  ctx.lineTo(-6, -10);
  ctx.lineTo(0, -8);
  ctx.lineTo(-2, -4);
  ctx.closePath();
  ctx.fill(); stickerStroke(ctx);
}

function drawFeather(ctx: Ctx): void {
  // Quill
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2, 12);
  ctx.quadraticCurveTo(0, 0, 4, -12);
  ctx.stroke();

  // Vane
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
  ctx.fill(); stickerStroke(ctx);

  // Barbs
  ctx.strokeStyle = "rgba(26,26,46,0.5)";
  ctx.lineWidth = 0.8;
  for (let i = -10; i <= 6; i += 2) {
    ctx.beginPath();
    ctx.moveTo(2 + i * 0.1, i);
    ctx.lineTo(8 - Math.abs(i) * 0.2, i);
    ctx.stroke();
  }

  // Sparkle
  ctx.fillStyle = "#fff";
  circle(ctx, -4, -8, 1.2); ctx.fill();
  circle(ctx, 10, 0, 1); ctx.fill();
}

function drawShield(ctx: Ctx, t: number): void {
  // Shield shape
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.quadraticCurveTo(12, -12, 12, -4);
  ctx.quadraticCurveTo(12, 10, 0, 16);
  ctx.quadraticCurveTo(-12, 10, -12, -4);
  ctx.quadraticCurveTo(-12, -12, 0, -14);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  // Rainbow bands
  const bands = ["#ff5a5a", "#ffa63a", "#ffe14a", "#6de36d", "#5ec4ff", "#a87aff"];
  const bw = 32 / bands.length;
  for (let i = 0; i < bands.length; i++) {
    ctx.fillStyle = bands[i];
    ctx.fillRect(-16, -16 + i * bw, 32, bw);
  }
  // Shine
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(-8, -12);
  ctx.lineTo(-4, -12);
  ctx.lineTo(-12, 12);
  ctx.lineTo(-16, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Outline
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.quadraticCurveTo(12, -12, 12, -4);
  ctx.quadraticCurveTo(12, 10, 0, 16);
  ctx.quadraticCurveTo(-12, 10, -12, -4);
  ctx.quadraticCurveTo(-12, -12, 0, -14);
  ctx.closePath();
  stickerStroke(ctx);

  // Sparkles
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.7 + Math.sin(t * 5) * 0.3;
  circle(ctx, -6, -8, 1.2); ctx.fill();
  circle(ctx, 6, 4, 1); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCoin(ctx: Ctx, t: number): void {
  // Wings
  ctx.fillStyle = "#e9f3ff";
  ctx.save();
  ctx.translate(-14, -2);
  ctx.rotate(-0.3 + Math.sin(t * 8) * 0.2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-10, -4, -14, 2);
  ctx.quadraticCurveTo(-8, 4, 0, 3);
  ctx.closePath();
  ctx.fill(); stickerStroke(ctx);
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
  ctx.fill(); stickerStroke(ctx);
  ctx.restore();

  // Coin (slight wobble)
  const wobble = Math.abs(Math.cos(t * 4));
  ctx.save();
  ctx.scale(wobble * 0.3 + 0.7, 1);
  const cg = ctx.createRadialGradient(-3, -3, 2, 0, 0, 12);
  cg.addColorStop(0, "#fff1a8");
  cg.addColorStop(1, "#e2a11a");
  ctx.fillStyle = cg;
  circle(ctx, 0, 0, 11);
  ctx.fill(); stickerStroke(ctx);
  // Inner star
  ctx.fillStyle = "#fff6c2";
  starPath(ctx, 0, 0, 5, 6, 2.5);
  ctx.fill();
  ctx.fillStyle = "#e2a11a";
  starPath(ctx, 0, 0, 5, 4.5, 1.8);
  ctx.fill();
  ctx.restore();
}

// ---------- EFFECTS ----------
export function drawPuff(
  ctx: Ctx,
  cx: number, cy: number,
  size: number, alpha: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#d8c9a8";
  circle(ctx, cx, cy, size); ctx.fill();
  ctx.fillStyle = "#b8a582";
  circle(ctx, cx - size * 0.4, cy + size * 0.2, size * 0.6); ctx.fill();
  ctx.fillStyle = "#f0e4c8";
  circle(ctx, cx + size * 0.3, cy - size * 0.3, size * 0.5); ctx.fill();
  ctx.restore();
}

export function drawFeatherParticle(
  ctx: Ctx,
  cx: number, cy: number,
  rot: number, alpha: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(0.6, 0.6);
  drawFeather(ctx);
  ctx.restore();
}

export function drawScorePopup(
  ctx: Ctx,
  cx: number, cy: number,
  text: string, alpha: number, scale: number
): void {
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

export function drawAngelWings(
  ctx: Ctx,
  cx: number, cy: number,
  scale: number, t: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const flap = Math.sin(t * 8) * 0.2;

  // Left wing
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
  ctx.fill(); stickerStroke(ctx);
  ctx.restore();

  // Right wing
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
  ctx.fill(); stickerStroke(ctx);
  ctx.restore();

  // Sparkles
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.8;
  circle(ctx, -18, -8, 1.2); ctx.fill();
  circle(ctx, 18, -8, 1.2); ctx.fill();
  ctx.restore();
}



import { GAME, COLORS } from "./definitions";
import { clamp, lerp } from "./utils";
import {
  Bird,
  Pickup,
  Enemy,
  Particle,
  terrainHeight,
  terrainSlope,
  generatePickupsInRange,
  generateEnemiesInRange,
  spawnDust,
  spawnSparks,
  spawnFeathers,
  spawnScorePopup,
  spawnTrail,
} from "./entities";
import {
  drawBird,
  drawEnemy,
  drawPowerup,
  drawPuff,
  drawFeatherParticle,
  drawScorePopup,
  drawAngelWings,
} from "./sprites";
import { UI } from "./ui";
import { persistence } from "./libs/persistence";

type State = "menu" | "playing" | "gameover";

const MAX_LIVES = 3;
const STUN_INVULN_TIME = 3.0;    // seconds of post-hit invulnerability
const STUN_SLOW_TIME = 0.6;      // short stun where bird is slowed/flashing

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ui = new UI();

  w = 0;
  h = 0;
  dpr = 1;

  state: State = "menu";
  time = 0;
  lastFrame = 0;

  camX = 0;
  camY = 0;
  shake = 0;

  bird = new Bird();
  pickups: Pickup[] = [];
  enemies: Enemy[] = [];
  particles: Particle[] = [];
  pickupsGeneratedUpTo = 0;
  enemiesGeneratedUpTo = 0;

  diveHeld = false;

  meters = 0;
  best = 0;
  combo = 0;
  fever = 0;
  perfects = 0;
  coinsCollected = 0;

  lives = MAX_LIVES;
  invulnTime = 0;     // post-hit invulnerability
  stunTime = 0;       // short stun control-loss
  hitFlash = 0;

  shieldTime = 0;
  glideTime = 0;
  speedBoostTime = 0;

  dayProgress = 0;
  baseGroundY = 0;
  _stallTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.bindInput();
    this.bindButtons();
    this.loadBest();
  }

  async loadBest(): Promise<void> {
    try {
      const v = await persistence.getItem("tw_best");
      if (v) this.best = parseInt(v, 10) || 0;
    } catch {}
    this.ui.showMenu(this.best);
    this.lastFrame = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  async saveBest(): Promise<void> {
    try { await persistence.setItem("tw_best", String(this.best)); } catch {}
  }

  resize(): void {
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

  bindInput(): void {
    const down = (e: Event) => {
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

  bindButtons(): void {
    this.ui.startBtn.addEventListener("click", () => this.start());
    this.ui.restartBtn.addEventListener("click", () => this.start());
  }

  start(): void {
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
    this.invulnTime = 1.5; // brief start-of-run safety
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

  loop(t: number): void {
    const dt = Math.min(0.05, (t - this.lastFrame) / 1000);
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

  heightAt(x: number): number {
    return terrainHeight(x, this.baseGroundY);
  }

  slopeAt(x: number): number {
    return terrainSlope(x, this.baseGroundY);
  }

  update(dt: number): void {
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
        const perfect = descending &&
          angleDiff < GAME.perfectSlideAngleThreshold &&
          b.lastAirborneTime > GAME.perfectMinAirTime &&
          this.stunTime <= 0;

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
    this.dayProgress = (b.x / 20000) % COLORS.skyTop.length;

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
      (p) => !(p.collected) && p.x > b.x - 400
    );

    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.kind === "feather") {
        pt.vy += 120 * dt;
        pt.vx *= 0.98;
        pt.vx += Math.sin(pt.life * 8) * 8 * dt;
        if (pt.rot !== undefined && pt.rotSpeed !== undefined) pt.rot += pt.rotSpeed * dt;
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

  isInvulnerable(): boolean {
    return this.invulnTime > 0 || this.shieldTime > 0 || this.fever >= GAME.feverMax;
  }

  handleEnemyHit(e: Enemy): void {
    const b = this.bird;
    // Dive-stomp defeats enemies
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

    // Already invulnerable (post-hit or shield) — ignore damage
    if (this.invulnTime > 0) return;

    if (this.shieldTime > 0) {
      this.shieldTime = 0;
      e.defeated = true;
      e.vx = -200;
      e.vy = -200;
      spawnSparks(this.particles, b.x, b.y, "#a87aff", 18);
      this.hitFlash = 0.3;
      this.shake = 12;
      this.invulnTime = 1.0;
      return;
    }

    // Take a life
    this.takeHit(e);
  }

  takeHit(e: Enemy): void {
    const b = this.bird;
    this.lives -= 1;
    this.ui.setLives(Math.max(0, this.lives), true);
    this.hitFlash = 0.45;
    this.shake = 20;
    spawnFeathers(this.particles, b.x, b.y, 14);
    spawnSparks(this.particles, b.x, b.y, "#ff5a6a", 12);
    spawnScorePopup(this.particles, b.x, b.y - 20, this.lives > 0 ? "OUCH!" : "K.O.");

    // Knock the enemy away so we don't re-collide immediately
    e.defeated = true;
    e.vx = 120;
    e.vy = -280;

    // Break combo
    this.combo = 0;
    this.ui.setCombo(0);

    if (this.lives <= 0) {
      this.endRun();
      return;
    }

    // Bounce up & grant invulnerability
    b.vy = -520;
    b.vx = Math.max(260, b.vx * 0.6);
    this.invulnTime = STUN_INVULN_TIME;
    this.stunTime = STUN_SLOW_TIME;
  }

  registerPerfect(): void {
    const b = this.bird;
    this.combo += 1;
    this.perfects += 1;
    b.perfectChainTimer = 4.0;

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

  collectPickup(p: Pickup): void {
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

  endRun(): void {
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

  render(): void {
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
        this.w / 2, this.h / 2, 100,
        this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.7
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

    // Post-hit invuln vignette
    if (this.state === "playing" && this.invulnTime > 0 && this.shieldTime <= 0 && this.fever < GAME.feverMax) {
      const pulse = 0.15 + Math.sin(this.time * 14) * 0.08;
      const g = ctx.createRadialGradient(
        this.w / 2, this.h / 2, this.h * 0.3,
        this.w / 2, this.h / 2, this.h * 0.75
      );
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, `rgba(255,220,160,${pulse})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    const timers: { emoji: string; t: number; max: number; color: string }[] = [];
    if (this.shieldTime > 0) timers.push({ emoji: "🛡️", t: this.shieldTime, max: 8, color: "#a87aff" });
    if (this.glideTime > 0) timers.push({ emoji: "🪶", t: this.glideTime, max: 6, color: "#7fc4ff" });
    if (this.speedBoostTime > 0) timers.push({ emoji: "🌶️", t: this.speedBoostTime, max: 4, color: "#ff6b1a" });
    if (this.invulnTime > 0 && this.shieldTime <= 0 && this.fever < GAME.feverMax) {
      timers.push({ emoji: "✨", t: this.invulnTime, max: STUN_INVULN_TIME, color: "#ffd98a" });
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

  drawSky(): void {
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

  drawParallax(): void {
    const ctx = this.ctx;
    this.drawParallaxLayer(0.15, this.h * 0.55, 80, "rgba(40,55,120,0.55)");
    this.drawParallaxLayer(0.3, this.h * 0.62, 60, "rgba(60,50,130,0.65)");
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 420 - this.camX * 0.2) % (this.w + 400) + this.w + 400) % (this.w + 400) - 200;
      const cy = 80 + (i % 3) * 40;
      this.drawCloud(cx, cy, 1 + (i % 2) * 0.4);
    }
  }

  drawCloud(x: number, y: number, s: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 24 * s, y + 4, 18 * s, 0, Math.PI * 2);
    ctx.arc(x - 22 * s, y + 6, 16 * s, 0, Math.PI * 2);
    ctx.arc(x + 8 * s, y - 10, 16 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  drawParallaxLayer(parallax: number, baseY: number, amp: number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, this.h);
    const step = 20;
    for (let sx = 0; sx <= this.w + step; sx += step) {
      const wx = (sx + this.camX * parallax) * 0.6;
      const y = baseY + Math.sin(wx * 0.008) * amp + Math.sin(wx * 0.003 + 1.3) * amp * 0.6;
      ctx.lineTo(sx, y);
    }
    ctx.lineTo(this.w, this.h);
    ctx.closePath();
    ctx.fill();
  }

  drawTerrain(): void {
    const ctx = this.ctx;
    const startX = this.camX - 40;
    const endX = this.camX + this.w + 40;
    const regionW = 3000;

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
    const tReg = ((this.bird.x % regionW) / regionW);
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
    const offset = (this.camX * 0.5) % stripeSpacing;
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

  drawPickups(): void {
    const ctx = this.ctx;
    for (const p of this.pickups) {
      if (p.collected) continue;
      const sx = this.toScreenX(p.x);
      if (sx < -60 || sx > this.w + 60) continue;
      const sy = this.toScreenY(p.y);
      drawPowerup(ctx, p.kind, sx, sy, 1.0, this.time + p.bob);
    }
  }

  drawEnemies(): void {
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

  drawParticles(): void {
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

  drawBird(): void {
    const ctx = this.ctx;
    const b = this.bird;
    const sx = this.toScreenX(b.x);
    const sy = this.toScreenY(b.y);

    // Motion trail
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      const a = (i / b.trail.length) * 0.4;
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

    // Post-hit invuln bubble (golden)
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

      // Sparkles
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

    // Blinking during invuln
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
    const pose: 0 | 1 | 2 = b.diving ? 1 : (b.onGround ? 0 : 2);
    const scale = b.diving ? 1.05 : 1.0;
    drawBird(ctx, 0, 0, scale, pose, this.fever >= GAME.feverMax, this.time);
    ctx.restore();

    // Stun stars above head
    if (this.stunTime > 0) {
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const a = this.time * 6 + i * ((Math.PI * 2) / 3);
        const sxx = sx + Math.cos(a) * 16;
        const syy = sy - 24 + Math.sin(a) * 4;
        ctx.fillStyle = "#ffe14a";
        ctx.font = "bold 16px Fredoka, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("✦", sxx, syy);
      }
      ctx.restore();
    }
  }

  toScreenX(wx: number): number {
    return wx - this.camX;
  }
  toScreenY(wy: number): number {
    return wy - this.camY;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}


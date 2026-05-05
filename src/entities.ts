

import { fbm, hashNoise } from "./utils";
import type { EnemyKind, PowerupKind } from "./sprites";

// ---------- Terrain ----------
export function terrainHeight(x: number, baseY: number): number {
  const s1 = Math.sin(x * 0.006) * 120;
  const s2 = Math.sin(x * 0.013 + 1.2) * 70;
  const s3 = Math.sin(x * 0.028 + 2.7) * 35;
  const noise = (fbm(x * 0.002, 77) - 0.5) * 60;
  return baseY + s1 + s2 + s3 + noise;
}

export function terrainSlope(x: number, baseY: number): number {
  const dx = 2;
  return (terrainHeight(x + dx, baseY) - terrainHeight(x - dx, baseY)) / (2 * dx);
}

// ---------- Bird ----------
export class Bird {
  x = 200;
  y = 200;
  vx = 420;
  vy = 0;
  radius = 18;
  angle = 0;
  onGround = false;
  diving = false;
  trail: { x: number; y: number; life: number }[] = [];

  slideStartX: number | null = null;
  slideDistance = 0;
  lastAirborneTime = 0;
  perfectChainTimer = 0;

  reset(x: number, y: number): void {
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
}

// ---------- Pickups ----------
export interface Pickup {
  x: number;
  y: number;
  kind: PowerupKind;
  collected: boolean;
  bob: number;
}

export function generatePickupsInRange(
  fromX: number,
  toX: number,
  _baseY: number,
  existing: Pickup[],
  heightFn: (x: number) => number
): void {
  const step = 70;
  const startSlot = Math.ceil(fromX / step);
  const endSlot = Math.floor(toX / step);

  for (let s = startSlot; s <= endSlot; s++) {
    const x = s * step;
    const n = hashNoise(s, 4242);
    if (n < 0.55) continue;

    let kind: PowerupKind = "coin";
    let yOffset = -50;
    if (n > 0.985) { kind = "shield"; yOffset = -100; }
    else if (n > 0.96) { kind = "feather"; yOffset = -100; }
    else if (n > 0.93) { kind = "chili"; yOffset = -85; }
    else if (n > 0.88) { kind = "star"; yOffset = -75; }

    const gy = heightFn(x);
    existing.push({
      x,
      y: gy + yOffset,
      kind,
      collected: false,
      bob: hashNoise(s, 99) * Math.PI * 2,
    });
  }
}

// ---------- Enemies ----------
export interface Enemy {
  x: number;
  y: number;
  baseY: number;
  kind: EnemyKind;
  t: number; // per-enemy phase
  defeated: boolean;
  vx: number;
  vy: number;
}

export function generateEnemiesInRange(
  fromX: number,
  toX: number,
  existing: Enemy[],
  heightFn: (x: number) => number,
  minX = 2200  // Safe zone - no enemies for the first ~55 meters
): void {
  const step = 260;
  const startSlot = Math.ceil(Math.max(fromX, minX) / step);
  const endSlot = Math.floor(toX / step);

  for (let s = startSlot; s <= endSlot; s++) {
    const x = s * step + hashNoise(s, 12) * 80;
    const n = hashNoise(s, 7171);

    // Gradual difficulty ramp-up based on distance
    // Early game (0-150m): rare enemies
    // Mid game (150-400m): moderate
    // Late game (400m+): full density
    let spawnThreshold = 0.55;
    if (x < 6000) spawnThreshold = 0.88;       // very sparse first stage
    else if (x < 16000) spawnThreshold = 0.72; // ramping up
    // else default 0.55

    if (n < spawnThreshold) continue;

    let kind: EnemyKind;
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
      vy: 0,
    });
  }
}

// ---------- Particles ----------
export type ParticleKind = "dust" | "feather" | "spark" | "puff" | "score";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: ParticleKind;
  rot?: number;
  rotSpeed?: number;
  text?: string;
}

export function spawnDust(arr: Particle[], x: number, y: number, count = 6): void {
  for (let i = 0; i < count; i++) {
    arr.push({
      x, y,
      vx: (Math.random() - 0.5) * 80,
      vy: -40 - Math.random() * 60,
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.8,
      size: 6 + Math.random() * 6,
      color: "",
      kind: "puff",
    });
  }
}

export function spawnSparks(arr: Particle[], x: number, y: number, color: string, count = 14): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 120 + Math.random() * 240;
    arr.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 80,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
      size: 3 + Math.random() * 4,
      color,
      kind: "spark",
    });
  }
}

export function spawnFeathers(arr: Particle[], x: number, y: number, count = 8): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 140;
    arr.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 120,
      life: 1.2 + Math.random() * 0.5,
      maxLife: 1.7,
      size: 0.6 + Math.random() * 0.4,
      color: "",
      kind: "feather",
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 4,
    });
  }
}

export function spawnScorePopup(arr: Particle[], x: number, y: number, text: string): void {
  arr.push({
    x, y,
    vx: 0,
    vy: -80,
    life: 1.0,
    maxLife: 1.0,
    size: 1,
    color: "",
    kind: "score",
    text,
  });
}

export function spawnTrail(arr: Particle[], x: number, y: number): void {
  arr.push({
    x, y,
    vx: (Math.random() - 0.5) * 20,
    vy: -20 - Math.random() * 20,
    life: 0.45,
    maxLife: 0.45,
    size: 5 + Math.random() * 3,
    color: "",
    kind: "dust",
  });
}


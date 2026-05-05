
export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const rand = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

// Deterministic pseudo-random based on index (for stable terrain)
export function hashNoise(i: number, seed = 1337): number {
  let x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Smooth 1D noise for terrain
export function smoothNoise(x: number, seed = 1337): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hashNoise(i, seed);
  const b = hashNoise(i + 1, seed);
  return a * (1 - u) + b * u;
}

// Layered fractal noise
export function fbm(x: number, seed = 1337): number {
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

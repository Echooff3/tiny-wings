
export const GAME = {
  // Physics
  gravity: 2200,           // px/s^2
  diveGravity: 3400,       // extra pull when diving
  maxFallSpeed: 1800,
  forwardSpeed: 420,       // base horizontal speed
  maxForwardSpeed: 900,
  groundFriction: 0.88,    // while sliding on ground
  slideBoost: 950,         // added per perfect slide
  airDrag: 0.9995,

  // Hills generation
  hillSegmentWidth: 12,    // pixel step for smooth curve
  hillVisibleAhead: 2200,

  // Bird
  birdRadius: 18,
  birdStartY: 200,

  // Perfect slide detection
  perfectSlideAngleThreshold: 0.35, // radians - alignment needed on takeoff
  perfectMinAirTime: 0.35,

  // Fever
  feverMax: 100,
  feverGainPerfect: 22,
  feverGainCoin: 3,
  feverDrainPerSec: 14,

  // Powerups
  coinValue: 10,
  starValue: 50,
};

export const COLORS = {
  skyTop:    ["#0b1638", "#1a2a6c", "#3b1e5e", "#ff6b3d"], // deep night -> sunset
  skyBottom: ["#2c3a7a", "#5a3a9a", "#ff8d5a", "#ffd36b"],
  hillPalettes: [
    { a: "#2ecc71", b: "#27ae60", stripe: "#f1c40f" }, // green
    { a: "#3498db", b: "#2980b9", stripe: "#ecf0f1" }, // blue
    { a: "#e67e22", b: "#d35400", stripe: "#fff3b0" }, // orange
    { a: "#9b59b6", b: "#8e44ad", stripe: "#ffd1ff" }, // purple
    { a: "#e74c3c", b: "#c0392b", stripe: "#fef0d5" }, // red
    { a: "#1abc9c", b: "#16a085", stripe: "#f6fff5" }, // teal
  ],
};

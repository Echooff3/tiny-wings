

export class UI {
  scoreEl = document.getElementById("score") as HTMLDivElement;
  livesEl = document.getElementById("lives") as HTMLDivElement;
  comboEl = document.getElementById("combo") as HTMLDivElement;
  feverEl = document.getElementById("fever") as HTMLDivElement;
  menuEl = document.getElementById("menu") as HTMLDivElement;
  gameoverEl = document.getElementById("gameover") as HTMLDivElement;
  startBtn = document.getElementById("startBtn") as HTMLButtonElement;
  restartBtn = document.getElementById("restartBtn") as HTMLButtonElement;
  bestScoreEl = document.getElementById("bestScore") as HTMLSpanElement;
  finalScoreEl = document.getElementById("finalScore") as HTMLSpanElement;
  finalBestEl = document.getElementById("finalBest") as HTMLSpanElement;
  finalPerfectsEl = document.getElementById("finalPerfects") as HTMLSpanElement;

  setScore(meters: number): void {
    this.scoreEl.textContent = `${meters} m`;
  }

  setLives(n: number, pulse = false): void {
    const hearts = "❤️".repeat(Math.max(0, n));
    const empty = "🖤".repeat(Math.max(0, 3 - n));
    this.livesEl.textContent = hearts + empty;
    if (pulse) {
      this.livesEl.classList.remove("pulse");
      // Force reflow to restart animation
      void this.livesEl.offsetWidth;
      this.livesEl.classList.add("pulse");
    }
  }

  setCombo(n: number): void {
    if (n <= 1) {
      this.comboEl.textContent = "";
      this.comboEl.classList.remove("active");
    } else {
      this.comboEl.textContent = `✨ Perfect x${n}`;
      this.comboEl.classList.add("active");
    }
  }

  setFever(pct: number): void {
    if (pct <= 0) {
      this.feverEl.textContent = "";
      this.feverEl.classList.remove("active");
      return;
    }
    if (pct >= 100) {
      this.feverEl.textContent = `🔥 FEVER!`;
      this.feverEl.classList.add("active");
    } else {
      this.feverEl.textContent = `🔥 ${Math.floor(pct)}%`;
      this.feverEl.classList.remove("active");
    }
  }

  showMenu(best: number): void {
    this.menuEl.classList.remove("hidden");
    this.gameoverEl.classList.add("hidden");
    this.bestScoreEl.textContent = String(best);
  }

  hideMenus(): void {
    this.menuEl.classList.add("hidden");
    this.gameoverEl.classList.add("hidden");
  }

  showGameOver(score: number, best: number, perfects: number): void {
    this.gameoverEl.classList.remove("hidden");
    this.finalScoreEl.textContent = String(score);
    this.finalBestEl.textContent = String(best);
    this.finalPerfectsEl.textContent = String(perfects);
  }
}


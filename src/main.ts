
import { Game } from "./game";

function main(): void {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  if (!canvas) return;
  new Game(canvas);
}

main();

// ตรรกะล้วนเกี่ยวกับผู้เล่นและลำดับตา (ไม่ผูกกับหน้าจอ)

import { DEFAULT_PLAYER_COUNT } from "../data/constants.js";

// รายชื่อผู้เล่นเริ่มต้นในหน้า Setup: Player 1 … Player N (N = DEFAULT_PLAYER_COUNT)
export function createDefaultSetupPlayers() {
  return Array.from({ length: DEFAULT_PLAYER_COUNT }, (_, index) => ({
    id: index + 1,
    name: `Player ${index + 1}`,
  }));
}

// ผู้เล่นคนถัดไปตามทิศวน (step = 1 วนขวา, step = -1 วนซ้าย) วนกลับเมื่อสุดรายชื่อ
export function getNextIndex(currentIndex, playerCount, step) {
  return (currentIndex + step + playerCount) % playerCount;
}

// ลำดับผู้เล่นทั้งหมดของหนึ่งรอบ เริ่มจากผู้เล่นคนแรก (firstIndex) ตามทิศวน
export function getTurnOrder(firstIndex, playerCount, step) {
  return Array.from(
    { length: playerCount },
    (_, k) => (firstIndex + step * k + playerCount) % playerCount,
  );
}

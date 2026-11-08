// R2 — พฤติกรรมของ The Hole
// กติกา (OWNER ตัดสิน H1–H5, D4, D5):
//   Robo ก้าวเข้า Hole ที่ใช้งานได้ (ทั้ง "ผ่าน" และ "ลงพอดี") → หยุดเดินทันที ก้าวที่เหลือยกเลิก
//   ปลายทาง = Hole อื่นที่ไม่ชำรุด
//     0 จุด → กลับ Starting Point (ไม่นับ Crash คงทิศ) และ Hole ที่ก้าวเข้าชำรุดด้วย (H6, OWNER ตัดสิน)
//     1 จุด → วาร์ปอัตโนมัติ คงทิศ Hole ปลายทางชำรุด
//     2 จุดขึ้นไป → ให้ผู้เล่นเลือกปลายทาง (movement.js คืน pendingWarp แล้วเรียก completeHoleWarp ต่อ)
//   Hole ที่ชำรุดไม่ทำงาน (Robo เดินผ่าน/หยุดได้เหมือนช่องปกติ)

import { isDamaged } from "../damage.js";

// The Hole ปลายทางที่วาร์ปไปได้เมื่อก้าวเข้า Hole ที่มี uid = entryUid
// ต้องเป็น Hole ด้วยกัน, ไม่ใช่ตัวที่ก้าวเข้า และต้องไม่ชำรุด เรียงตามลำดับที่วางบนกระดาน
export function getHoleDestinations(placed, entryUid) {
  return placed.filter(
    (item) =>
      item.typeId === "hole" && item.uid !== entryUid && !isDamaged(item),
  );
}

export const holeBehavior = {
  // เรียกหลัง Robo ก้าวเข้าช่องที่มี Hole แล้ว (ไม่ว่าผ่านหรือลงพอดี)
  // ctx = { obstacle: Hole ที่ก้าวเข้า, obstacles: รายการ Obstacle ทั้งกระดาน }
  onEnter({ obstacle, obstacles }) {
    if (isDamaged(obstacle)) return null;

    const destinations = getHoleDestinations(obstacles, obstacle.uid);

    if (destinations.length === 0) {
      return { kind: "return-to-start", damageUid: obstacle.uid };
    }

    if (destinations.length === 1) {
      const target = destinations[0];
      return {
        kind: "warp",
        row: target.row,
        col: target.col,
        warp: {
          entryUid: obstacle.uid,
          fromRow: obstacle.row,
          fromCol: obstacle.col,
          toUid: target.uid,
          toRow: target.row,
          toCol: target.col,
        },
        damageUid: target.uid,
      };
    }

    return {
      kind: "choose-warp",
      pendingWarp: {
        entryUid: obstacle.uid,
        row: obstacle.row,
        col: obstacle.col,
        destinations: destinations.map((item) => ({
          uid: item.uid,
          row: item.row,
          col: item.col,
        })),
      },
    };
  },
};
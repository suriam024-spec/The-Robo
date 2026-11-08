// ทางเข้าเดิมของระบบ Obstacle (R2: ไฟล์อื่นยัง import จากที่นี่ได้เหมือนเดิม ไม่ต้องแก้ import)
//
// ตรรกะจริงถูกแยกไปไฟล์ย่อย:
//   typesData.js — รายชื่อ 14 ชนิด และระยะชำรุด
//   placement.js — การแจกและวาง
//   damage.js    — ระบบชำรุด
//   types/       — พฤติกรรมของแต่ละชนิด (wall.js, hole.js, ทะเบียนใน index.js)

export {
  OBSTACLE_TYPES,
  getObstacleType,
  getDamageDuration,
} from "./typesData.js";

export {
  getObstaclesPerPlayer,
  drawRandomObstacleType,
  dealObstacles,
  getObstacleAt,
  canPlaceObstacle,
  placeObstacle,
} from "./placement.js";

export { isDamaged, damageObstacle, tickDamage } from "./damage.js";

export { getHoleDestinations } from "./types/hole.js";

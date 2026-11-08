// R2 — ข้อมูลชนิด Obstacle (ข้อมูลล้วน ไม่มีตรรกะการเดิน)
// ย้ายมาจาก obstacles.js โดยไม่เปลี่ยนค่า

// Obstacle 14 ชนิดตาม GDD v0.2 หัวข้อ 17
// short = ตัวย่อที่แสดงบนกระดาน
export const OBSTACLE_TYPES = [
  { id: "wall", label: "The Wall", short: "WALL" },
  { id: "oil", label: "The Oil", short: "OIL" },
  { id: "scrap", label: "The Scrap", short: "SCRAP" },
  { id: "hole", label: "The Hole", short: "HOLE" },
  { id: "magnet", label: "The Magnet", short: "MAGNET" },
  { id: "destroyer", label: "The Destroyer", short: "DESTR" },
  { id: "spring", label: "The Spring", short: "SPRING" },
  { id: "booster", label: "The Booster", short: "BOOST" },
  { id: "booster-plus", label: "The Booster+", short: "BOOST+" },
  { id: "shuffler", label: "The Shuffler", short: "SHUF" },
  { id: "reset", label: "The Reset", short: "RESET" },
  { id: "blue-screen", label: "The Blue Screen", short: "BLUE" },
  { id: "protect", label: "The Protect", short: "PROT" },
  { id: "support", label: "The Support", short: "SUPP" },
];

// ระยะเวลาชำรุดของ Obstacle แต่ละชนิด หน่วย "Turn" = รอบเกมครบทุกคน 1 รอบ (OWNER ตัดสิน)
// ใส่เฉพาะชนิดที่ทำใน M3.3 ตาม GDD v0.2 หัวข้อ 17 ชนิดอื่นจะเพิ่มตอนทำของมัน (ค่าเริ่มต้น 0)
// - Wall: ไม่มีระบบชำรุด
// - Hole: GDD v0.2 ไม่มีชำรุด แต่ OWNER อนุมัติให้ Hole ปลายทางชำรุด 1 Turn (บันทึกใน GDD v0.3)
const DAMAGE_DURATIONS = {
  oil: 1,
  scrap: 1,
  hole: 1,
  magnet: 1,
  destroyer: 3,
  spring: 2,
};

export function getObstacleType(typeId) {
  return OBSTACLE_TYPES.find((type) => type.id === typeId) ?? null;
}

// จำนวน Turn ที่ชนิดนี้ต้องชำรุดเมื่อถูกทำให้ชำรุด (0 = ไม่มีระบบชำรุดหรือยังไม่กำหนด)
export function getDamageDuration(typeId) {
  return DAMAGE_DURATIONS[typeId] ?? 0;
}

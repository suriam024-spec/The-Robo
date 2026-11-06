// ค่าคงที่ของเกม The Robo (ข้อมูลล้วน ไม่มีตรรกะ)

export const BOARD_SIZES = [9, 11, 13];
export const DEFAULT_BOARD_SIZE = 9;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const DEFAULT_PLAYER_COUNT = 4;
export const MAX_NAME_LENGTH = 16;

export const CRASH_LIMIT = 3; // M3: แสดงผลอย่างเดียว ยังไม่มีผลต่อการจบเกม

// ทิศที่ Robo หันได้ (id ตรงกับ FACINGS ใน movement.js)
export const DIRECTIONS = [
  { id: "UP", label: "ขึ้น", arrow: "↑" },
  { id: "RIGHT", label: "ขวา", arrow: "→" },
  { id: "DOWN", label: "ลง", arrow: "↓" },
  { id: "LEFT", label: "ซ้าย", arrow: "←" },
];

// ทิศทางการวนของเกม: วนขวา = ไล่ตามรายชื่อ, วนซ้าย = ไล่ย้อนรายชื่อ
export const TURN_DIRECTIONS = [
  {
    id: "RIGHT",
    label: "วนขวา",
    arrow: "↻",
    hint: "ไล่ตามรายชื่อ 1 → 2 → 3 → …",
    step: 1,
  },
  {
    id: "LEFT",
    label: "วนซ้าย",
    arrow: "↺",
    hint: "ไล่ย้อนรายชื่อ … → 3 → 2 → 1",
    step: -1,
  },
];

// ตัวย่อสั้นมาก ใช้แทนชื่อบนกระดานเมื่อช่องเล็กจนอ่านชื่อเต็มไม่ได้ (เช่น 13x13 บนมือถือ)
export const OBSTACLE_MARKS = {
  wall: "W",
  oil: "O",
  scrap: "Sc",
  hole: "H",
  magnet: "M",
  destroyer: "D",
  spring: "Sp",
  booster: "B",
  "booster-plus": "B+",
  shuffler: "Sh",
  reset: "R",
  "blue-screen": "Bs",
  protect: "P",
  support: "Su",
};

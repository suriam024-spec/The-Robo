// M3.2 — ตรรกะการแจกและวาง Obstacle ตอน Setup (ฟังก์ชันคำนวณล้วน ไม่ผูกกับหน้าจอ)
// M3.3 — เพิ่มระบบชำรุด (Damaged) พื้นฐาน และตัวช่วยของ The Hole
//
// พิกัดใช้ row/col เริ่มนับจาก 0 เหมือน movement.js
// ใน 3.2 Obstacle มีแค่ "ตำแหน่ง" ยังไม่มีผลต่อ Robo (ผลของแต่ละชนิดทำใน 3.3)

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

// จำนวน Obstacle ต่อคนตาม GDD v0.2 หัวข้อ 7 Step 2 (กระดาน 9x9)
const BASE_OBSTACLES_PER_PLAYER = { 2: 3, 3: 2, 4: 2, 5: 1, 6: 1 };

// โบนัสตามขนาดกระดาน (OWNER อนุมัติ): 9x9 = +0, 11x11 = +1, 13x13 = +2 ต่อคน
const BOARD_SIZE_BONUS = { 9: 0, 11: 1, 13: 2 };

// ระยะเวลาชำรุดของ Obstacle แต่ละชนิด หน่วย "Turn" = รอบเกมครบทุกคน 1 รอบ (OWNER ตัดสิน)
// ใส่เฉพาะชนิดที่ทำใน 3.3 ตาม GDD v0.2 หัวข้อ 17 ชนิดอื่นจะเพิ่มตอนทำของมัน (ค่าเริ่มต้น 0)
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

// จำนวน Obstacle ที่ผู้เล่นแต่ละคนได้รับ
export function getObstaclesPerPlayer(playerCount, boardSize) {
  const base = BASE_OBSTACLES_PER_PLAYER[playerCount];
  const bonus = BOARD_SIZE_BONUS[boardSize];
  if (base === undefined) {
    throw new Error(`Unsupported player count: ${playerCount}`);
  }
  if (bonus === undefined) {
    throw new Error(`Unsupported board size: ${boardSize}`);
  }
  return base + bonus;
}

// สุ่มชนิด Obstacle 1 ใบ (ทุกชนิดโอกาสเท่ากัน ซ้ำกันได้)
// randomFn คืนค่า 0 <= x < 1 (ใส่ฟังก์ชันของตัวเองได้เพื่อทดสอบ)
export function drawRandomObstacleType(randomFn = Math.random) {
  const index = Math.min(
    OBSTACLE_TYPES.length - 1,
    Math.floor(randomFn() * OBSTACLE_TYPES.length),
  );
  return OBSTACLE_TYPES[index].id;
}

// แจก Obstacle ให้ผู้เล่นทุกคน คืนค่าเป็นอาร์เรย์ของ "มือ" เรียงตามลำดับผู้เล่น
// แต่ละมือ = อาร์เรย์ของ { uid, typeId } (uid ไม่ซ้ำกันในเกม ใช้เป็น key และอ้างอิงใบที่เลือก)
export function dealObstacles(playerCount, boardSize, randomFn = Math.random) {
  const perPlayer = getObstaclesPerPlayer(playerCount, boardSize);
  return Array.from({ length: playerCount }, (_, playerIndex) =>
    Array.from({ length: perPlayer }, (_, k) => ({
      uid: `p${playerIndex}-o${k}`,
      typeId: drawRandomObstacleType(randomFn),
    })),
  );
}

// ช่อง Starting Point หรือ Locked Zone (3x3 รอบช่องกลาง) ห้ามวาง Obstacle
function getRestrictedKind(row, col, boardSize) {
  const center = (boardSize - 1) / 2;
  if (row === center && col === center) return "START";
  if (Math.abs(row - center) <= 1 && Math.abs(col - center) <= 1)
    return "LOCKED_ZONE";
  return null;
}

export function getObstacleAt(placed, row, col) {
  return placed.find((item) => item.row === row && item.col === col) ?? null;
}

// ตรวจว่าวางที่ช่องนี้ได้หรือไม่ ตามข้อห้ามใน GDD:
// ห้ามวางบน Starting Point / Locked Zone / ทับ Obstacle อื่น
// คืนค่า { ok: true } หรือ { ok: false, reason, message }
export function canPlaceObstacle(row, col, boardSize, placed) {
  if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
    return {
      ok: false,
      reason: "OUT_OF_BOARD",
      message: "ช่องนี้อยู่นอกกระดาน",
    };
  }

  const restricted = getRestrictedKind(row, col, boardSize);
  if (restricted === "START") {
    return { ok: false, reason: "START", message: "ห้ามวางบน Starting Point" };
  }
  if (restricted === "LOCKED_ZONE") {
    return {
      ok: false,
      reason: "LOCKED_ZONE",
      message: "ห้ามวางใน Locked Zone",
    };
  }

  if (getObstacleAt(placed, row, col)) {
    return {
      ok: false,
      reason: "OCCUPIED",
      message: "ช่องนี้มี Obstacle อยู่แล้ว",
    };
  }

  return { ok: true };
}

// วาง Obstacle 1 ใบ คืนค่า { ok: true, placed: อาร์เรย์ใหม่ } หรือ { ok: false, reason, message }
// ไม่แก้ค่า placed เดิม
// obstacle = { uid, typeId } จากมือผู้เล่น, ownerIndex = ลำดับผู้เล่นที่วาง
export function placeObstacle(
  placed,
  obstacle,
  row,
  col,
  boardSize,
  ownerIndex,
) {
  if (!getObstacleType(obstacle.typeId)) {
    return {
      ok: false,
      reason: "UNKNOWN_TYPE",
      message: "ไม่รู้จักชนิด Obstacle นี้",
    };
  }

  const check = canPlaceObstacle(row, col, boardSize, placed);
  if (!check.ok) return check;

  return {
    ok: true,
    placed: [
      ...placed,
      {
        uid: obstacle.uid,
        typeId: obstacle.typeId,
        row,
        col,
        ownerIndex,
        damagedTurns: 0,
      },
    ],
  };
}

/* ---------- M3.3: ระบบชำรุด (Damaged) ---------- */

// Obstacle ใบนี้กำลังชำรุดอยู่หรือไม่ (damagedTurns = จำนวน Turn ที่เหลือ)
export function isDamaged(obstacle) {
  return (obstacle?.damagedTurns ?? 0) > 0;
}

// ทำให้ Obstacle ที่มี uid นี้ชำรุด turns Turn คืนอาร์เรย์ใหม่ (ไม่แก้ค่าเดิม)
// ถ้าชำรุดอยู่แล้ว จะใช้ค่าที่เหลือมากกว่า (ไม่ลดระยะที่เหลือ)
export function damageObstacle(placed, uid, turns) {
  const duration = Math.max(0, Math.floor(turns));
  return placed.map((item) =>
    item.uid === uid
      ? { ...item, damagedTurns: Math.max(item.damagedTurns ?? 0, duration) }
      : item,
  );
}

// เรียกเมื่อจบรอบเกม 1 รอบ: ลดตัวนับของทุกใบที่ชำรุดลง 1 ใบที่ครบแล้วกลับสู่สภาพปกติ
export function tickDamage(placed) {
  return placed.map((item) =>
    isDamaged(item) ? { ...item, damagedTurns: item.damagedTurns - 1 } : item,
  );
}

/* ---------- M3.3: ตัวช่วยของ The Hole ---------- */

// The Hole ปลายทางที่วาร์ปไปได้เมื่อก้าวเข้า Hole ที่มี uid = entryUid
// ต้องเป็น Hole ด้วยกัน, ไม่ใช่ตัวที่ก้าวเข้า และต้องไม่ชำรุด เรียงตามลำดับที่วางบนกระดาน
export function getHoleDestinations(placed, entryUid) {
  return placed.filter(
    (item) =>
      item.typeId === "hole" && item.uid !== entryUid && !isDamaged(item),
  );
}

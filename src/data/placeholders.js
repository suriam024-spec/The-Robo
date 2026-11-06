// ข้อมูลทดสอบชั่วคราว (Placeholder) ของการ์ด — ยังไม่มีระบบทำงานจริงของการ์ด
// ไฟล์นี้จะถูกแทนที่ด้วยระบบการ์ดจริงใน M4

const MOVEMENT_PLACEHOLDERS = [
  "Walk",
  "Walk+",
  "Walk++",
  "Turn Left",
  "Turn Left+",
  "Turn Right",
  "Turn Right+",
  "Turn Around",
];

const VIRUS_PLACEHOLDERS = [
  "ขาหัก",
  "แอนตี้ไวรัส",
  "กระโดด",
  "น็อตหลุด",
  "ย้อนรอย",
  "อัจฉริยะ!",
];

const MISSION_PLACEHOLDERS = [
  "หุ่นยนต์ตกแมพ 2 ครั้ง",
  "Oil Master",
  "Straight Line",
  "Wall Bumper",
  "Return Home",
  "Chaos",
];

function pickCycle(pool, start, count) {
  return Array.from(
    { length: count },
    (_, k) => pool[(start + k) % pool.length],
  );
}

// แจกการ์ดทดสอบให้ผู้เล่นลำดับที่ playerIndex (Movement 4 ใบ, Virus 2 ใบ, Secret Mission 1 ใบ)
export function dealPlaceholders(playerIndex) {
  return {
    movementCards: pickCycle(MOVEMENT_PLACEHOLDERS, playerIndex * 2, 4),
    virusCards: pickCycle(VIRUS_PLACEHOLDERS, playerIndex * 2, 2),
    mission: MISSION_PLACEHOLDERS[playerIndex % MISSION_PLACEHOLDERS.length],
  };
}

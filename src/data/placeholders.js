// ข้อมูลทดสอบชั่วคราว (Placeholder) ของ Virus Card และ Secret Mission — ยังไม่มีระบบทำงานจริง
// Movement Cards ใช้ระบบจริงแล้ว (M4.1: src/game/cards/) จึงตัดออกจากไฟล์นี้
// ส่วน Virus Cards จะถูกแทนที่ใน M4.2 และ Secret Mission ใน M6

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

// แจกการ์ดทดสอบให้ผู้เล่นลำดับที่ playerIndex (Virus 2 ใบ, Secret Mission 1 ใบ)
export function dealPlaceholders(playerIndex) {
  return {
    virusCards: pickCycle(VIRUS_PLACEHOLDERS, playerIndex * 2, 2),
    mission: MISSION_PLACEHOLDERS[playerIndex % MISSION_PLACEHOLDERS.length],
  };
}

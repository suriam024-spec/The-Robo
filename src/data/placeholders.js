// ข้อมูลทดสอบชั่วคราว (Placeholder) ของ Secret Mission — ยังไม่มีระบบทำงานจริง
// Movement Cards ใช้ระบบจริงแล้ว (M4.1: src/game/cards/movementCards.js)
// Virus Cards ใช้ระบบจริงแล้ว (M4.2: src/game/cards/virusCards.js) จึงตัดออกจากไฟล์นี้
// เหลือเฉพาะ Secret Mission ซึ่งจะถูกแทนที่ใน M6

const MISSION_PLACEHOLDERS = [
  "หุ่นยนต์ตกแมพ 2 ครั้ง",
  "Oil Master",
  "Straight Line",
  "Wall Bumper",
  "Return Home",
  "Chaos",
];

// แจกข้อมูลทดสอบให้ผู้เล่นลำดับที่ playerIndex (Secret Mission 1 ใบ)
export function dealPlaceholders(playerIndex) {
  return {
    mission: MISSION_PLACEHOLDERS[playerIndex % MISSION_PLACEHOLDERS.length],
  };
}

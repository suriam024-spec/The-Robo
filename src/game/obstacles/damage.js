// R2 — ระบบชำรุด (Damaged) ฟังก์ชันคำนวณล้วน
// ย้ายมาจาก obstacles.js โดยไม่เปลี่ยนพฤติกรรม

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

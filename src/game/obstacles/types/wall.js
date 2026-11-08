// R2 — พฤติกรรมของ The Wall
// กติกา (OWNER ตัดสิน W1/W2): Robo หยุดอยู่ช่องก่อนถึง Wall ก้าวที่เหลือยกเลิก ไม่นับ Crash ยังหันตามคำสั่ง
// Wall ไม่มีระบบชำรุด จึงขวางได้ตลอด

export const wallBehavior = {
  // เรียกก่อน Robo ก้าวเข้าช่องที่มี Wall → สั่งให้ขวาง
  onBeforeEnter() {
    return { kind: "block", blockedBy: "wall" };
  },
};

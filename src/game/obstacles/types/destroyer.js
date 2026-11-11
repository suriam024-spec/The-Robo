// พฤติกรรมของ The Destroyer
// กติกา (OWNER ตัดสิน D1–D4):
//   D1 Robo ก้าวเข้า Destroyer ที่ใช้งานได้ (ทั้ง "ผ่านกลางทาง" และ "เป็นก้าวสุดท้าย" ให้ผลเหมือนกัน)
//      → Robo พังทันที: หยุดเดิน ก้าวที่เหลือยกเลิก
//   D2 Crash +1 (นับร่วมกับตกแมพ) แล้ว Robo กลับ Starting Point โดยคงทิศที่หัน
//   D3 Destroyer ชำรุดทันทีที่ทำงาน 3 Turn (ตามค่าใน typesData.js)
//   D4 Destroyer ที่ชำรุดไม่ทำงาน และยืนบน Destroyer แล้วเดินออกไม่ทำงานซ้ำ (นับเฉพาะช่องที่ก้าวเข้าไปใหม่)
// ส่วนที่ผูกกับ Virus Card (Virus ถูกทำลายไปพร้อมกับ Robo) เลื่อนไปทำใน M4

import { isDamaged } from "../damage.js";

export const destroyerBehavior = {
  // เรียกหลัง Robo ก้าวเข้าช่องที่มี Destroyer แล้ว (ไม่ว่าผ่านหรือลงพอดี)
  onEnter({ obstacle }) {
    if (isDamaged(obstacle)) return null;
    return { kind: "destroy", damageUid: obstacle.uid };
  },
};

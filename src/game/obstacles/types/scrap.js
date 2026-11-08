// พฤติกรรมของ The Scrap
// กติกา (OWNER ตัดสิน S1–S3):
//   Robo ก้าวเข้า Scrap ที่ใช้งานได้ (ทั้ง "ผ่านกลางทาง" และ "เป็นก้าวสุดท้าย" ให้ผลเหมือนกัน)
//   → หยุดอยู่บนช่อง Scrap ก้าวที่เหลือยกเลิก ไม่นับ Crash ยังหันตามคำสั่ง
//   Scrap ชำรุดทันทีที่ทำงาน (1 Turn ตามค่าใน typesData.js)
//   Scrap ที่ชำรุดไม่ทำงาน (เดินผ่าน/หยุดได้เหมือนช่องปกติ)
//   นับเฉพาะช่องที่ก้าวเข้าไปใหม่ (ยืนบน Scrap อยู่แล้วเดินออก ไม่ทำให้ทำงานซ้ำ)

import { isDamaged } from "../damage.js";

export const scrapBehavior = {
  // เรียกหลัง Robo ก้าวเข้าช่องที่มี Scrap แล้ว (ไม่ว่าผ่านหรือลงพอดี)
  onEnter({ obstacle }) {
    if (isDamaged(obstacle)) return null;
    return { kind: "stop", damageUid: obstacle.uid };
  },
};

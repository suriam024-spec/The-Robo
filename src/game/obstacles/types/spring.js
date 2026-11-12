// พฤติกรรมของ The Spring
// กติกา (OWNER ตัดสิน S1–S5):
//   S1 Spring ทำงานเมื่อ Robo "หยุด/ลงพอดี" บนช่องนั้น (การเดินช่วงหนึ่งจบที่ช่องนั้น และ Robo ก้าวเข้าช่องนั้นในการเดินช่วงนี้)
//      เดินผ่านกลางทางไม่ทำงาน ถ้า Robo หยุดบน Spring เพราะก้าวต่อไปติด Wall ก็ทำงาน (ถือว่าสิ้นสุดการเดิน)
//   S2 ถอยหลัง 2 ช่อง ทิศตรงข้ามกับทิศที่ Robo กำลังเคลื่อนที่ (Robo ไม่หมุนตัว ทิศหันคงเดิม)
//   S3 Spring ชำรุดทันทีที่ทำงาน (2 Turn ตามค่าใน typesData.js)
//   S4 ถ้าการถอยไปจบ (ลงพอดี) บน Spring อีกอัน → อันนั้นดีด Robo กลับทิศตรงข้ามกับที่เข้ามา 1 ช่อง
//      Spring อันถัดไปในทอดเดียวกันลดระยะลงอีก 1 ต่อหนึ่งอัน (2, 1, 0 …) อันที่ระยะเหลือ 0 แค่ชำรุด ไม่ดีดต่อ (กันเด้งไปมา)
//   S5 ระหว่างถอย/ดีด ถ้าเจออุปสรรคอื่นให้ทำงานตามปกติ (ถ้ายังไม่ชำรุด) ตกแมพ = ตกแมพ (Crash +1)

import { isDamaged } from "../damage.js";

// ระยะถอยของ Spring อันแรก (หน่วย: ช่อง)
export const SPRING_RETREAT = 2;

export const springBehavior = {
  // เรียกเมื่อการเดินช่วงหนึ่งจบลงที่ช่องที่มี Spring
  // ctx.chainIndex = จำนวน Spring ที่ทำงานมาก่อนหน้าแล้วในทอดเดียวกัน (อันแรก = 0)
  onLand({ obstacle, chainIndex }) {
    if (isDamaged(obstacle)) return null;
    return {
      kind: "bounce",
      distance: Math.max(0, SPRING_RETREAT - chainIndex),
      damageUid: obstacle.uid,
    };
  },
};

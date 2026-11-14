// พฤติกรรมของ The Magnet
// กติกา (OWNER ตัดสิน M1–M3 และข้อกำหนดตอนอนุมัติ Technical Design):
//   · Aura = 8 ช่องรอบ Magnet (รวมแนวทแยง) = ช่องที่ห่างจาก Magnet 1 ช่องแบบ "ราชา" (Chebyshev)
//   · Magnet ไม่ทำงานระหว่างเดิน ทำงานครั้งเดียว "หลังการเดินและผลอื่นทั้งหมดจบแล้ว" (ขั้น settle)
//     โดยดูจากตำแหน่งสุดท้ายของ Robo เดินผ่าน Aura กลางทางแต่จบนอก Aura ไม่ดึง
//   · วนซ้ำตามลำดับนี้ (ใช้เฉพาะ Magnet ที่ไม่ชำรุด):
//       ก. Robo ยืนบนช่อง Magnet → Magnet นั้นทำงานก่อน: "cancel" (ไม่ดึง) แล้วชำรุด 1 Turn
//       ข. ไม่ได้ยืนบน Magnet → ดูว่า Aura ของ Magnet ใดครอบ Robo อยู่
//            · ไม่มี → จบ
//            · 1 อัน → ดึง Robo ไปลงบนช่อง Magnet นั้น ทิศคงเดิม "pull" Magnet ชำรุด
//            · 2 อันขึ้นไป → Robo อยู่กับที่ ทุกอันที่ครอบอยู่ "cancel" แล้วชำรุด (M1) จบ
//       ค. หลังดึง วนกลับไปข้อ ก. (M2: ดึงต่อเป็นทอดได้ Magnet ที่ชำรุดแล้วไม่ถูกนับ)
//   · การดึงคือการย้ายตรง ๆ ไม่ใช่การก้าวเดิน จึงไม่ทำให้ Obstacle อื่นทำงาน
//   · Robo ที่อยู่ Starting Point ไม่มี Aura ครอบ เพราะ Magnet วางใน Locked Zone ไม่ได้
//   · triggers: effect "pull" (ไว้นับ Magnet Master + Chaos) หรือ "cancel" (นับ Chaos อย่างเดียว) (M3)
//
// onSettle(ctx) — ctx = { robo, obstacles, boardSize } คืน null (ไม่มีอะไรเกิดขึ้น) หรือ
//   { robo, magnetEvents, damageUids, triggers }
//   magnetEvents = [{ uid, effect: "pull"|"cancel", reason: "aura"|"on-cell"|"tie",
//                     fromRow, fromCol, toRow, toCol }]   (cancel: toRow/toCol = null)

import { isDamaged } from "../damage.js";

// ช่อง (row, col) อยู่ใน Aura ของ Magnet นี้หรือไม่ (ห่าง 1 ช่องพอดี ไม่รวมช่องของ Magnet เอง)
export function isInMagnetAura(magnet, row, col) {
  return (
    Math.max(Math.abs(magnet.row - row), Math.abs(magnet.col - col)) === 1
  );
}

export const magnetBehavior = {
  onSettle({ robo, obstacles }) {
    let { row, col } = robo;
    const spent = new Set(); // Magnet ที่ทำงานแล้วในขั้นนี้
    const magnetEvents = [];
    const triggers = [];
    const damageUids = [];

    const cancel = (magnet, reason) => {
      spent.add(magnet.uid);
      damageUids.push(magnet.uid);
      triggers.push({ uid: magnet.uid, typeId: "magnet", effect: "cancel" });
      magnetEvents.push({
        uid: magnet.uid,
        effect: "cancel",
        reason,
        fromRow: row,
        fromCol: col,
        toRow: null,
        toCol: null,
      });
    };

    // ทุกรอบมี Magnet ทำงานเพิ่มอย่างน้อย 1 อัน จึงจบแน่นอน
    for (;;) {
      const usable = obstacles.filter(
        (item) =>
          item.typeId === "magnet" && !isDamaged(item) && !spent.has(item.uid),
      );

      const standingOn = usable.find(
        (item) => item.row === row && item.col === col,
      );
      if (standingOn) {
        cancel(standingOn, "on-cell");
        continue;
      }

      const covering = usable.filter((item) => isInMagnetAura(item, row, col));
      if (covering.length === 0) break;

      if (covering.length >= 2) {
        covering.forEach((item) => cancel(item, "tie"));
        break;
      }

      const [magnet] = covering;
      spent.add(magnet.uid);
      damageUids.push(magnet.uid);
      triggers.push({ uid: magnet.uid, typeId: "magnet", effect: "pull" });
      magnetEvents.push({
        uid: magnet.uid,
        effect: "pull",
        reason: "aura",
        fromRow: row,
        fromCol: col,
        toRow: magnet.row,
        toCol: magnet.col,
      });
      row = magnet.row;
      col = magnet.col;
    }

    if (magnetEvents.length === 0) return null;
    return {
      robo: { row, col, facing: robo.facing },
      magnetEvents,
      damageUids,
      triggers,
    };
  },
};
// ข้อความอธิบายสำหรับแสดงบนหน้าจอ (ฟังก์ชันล้วน ไม่ผูกกับ React)

import { DIRECTIONS } from "../data/constants.js";
import { getObstacleType } from "../game/obstacles/obstacles.js";

export function getDirectionInfo(facing) {
  return DIRECTIONS.find((item) => item.id === facing);
}

// อธิบายคำสั่งเคลื่อนที่เป็นภาษาไทย เช่น "หันซ้าย + เดิน 1 ช่อง"
export function describeCommand(command) {
  const turnText = {
    NONE: "",
    LEFT: "หันซ้าย",
    RIGHT: "หันขวา",
    AROUND: "กลับหลังหัน",
  }[command.turn];
  const stepText = command.steps > 0 ? `เดิน ${command.steps} ช่อง` : "";
  return [turnText, stepText].filter(Boolean).join(" + ");
}

// พิกัดแบบอ่านง่าย (นับจาก 1) เช่น "แถว 5 · คอลัมน์ 7"
export function describeCell(row, col) {
  return `แถว ${row + 1} · คอลัมน์ ${col + 1}`;
}

// สรุปผลการเคลื่อนที่ครั้งล่าสุดเป็นข้อความ
// ถ้ามี Oil ทำงานระหว่างทาง (extraSteps > 0) จะต่อท้ายว่าเดินเพิ่มกี่ช่อง และ Oil ชำรุดกี่อัน
// ถ้ามี Spring ทำงาน (bounces) จะต่อท้ายว่า Spring กี่อัน ถอย/ดีด Robo รวมกี่ช่อง และ Spring ชำรุดกี่อัน
// ถ้ามี Magnet ทำงาน (magnetEvents) จะต่อท้ายว่าดึง Robo จากไหนไปไหน / หักล้างกัน / Robo หยุดบนช่อง Magnet และ Magnet ชำรุดกี่อัน
export function describeLastMove(lastMove) {
  if (!lastMove) return "ยังไม่ได้สั่งเคลื่อนที่";
  const oilText =
    lastMove.extraSteps > 0
      ? ` · ก้าวเข้า Oil ทำให้เดินเพิ่ม ${lastMove.extraSteps} ช่อง (Oil ชำรุด ${lastMove.extraSteps} อัน)`
      : "";
  const springCount = lastMove.bounces?.length ?? 0;
  const springText =
    springCount > 0
      ? ` · Spring ทำงาน ${springCount} อัน ถอย/ดีด Robo รวม ${lastMove.retreatSteps} ช่อง (Spring ชำรุด ${springCount} อัน)`
      : "";
  return (
    describeOutcome(lastMove) +
    oilText +
    springText +
    describeMagnet(lastMove.magnetEvents)
  );
}

// ข้อความของ The Magnet (ขั้นหลังเดินจบ) ตามลำดับที่เกิดขึ้น
// event: { uid, effect: "pull" | "cancel", reason: "aura" | "on-cell" | "tie", fromRow, fromCol, toRow, toCol }
function describeMagnet(events) {
  if (!events || events.length === 0) return "";

  const parts = [];
  let index = 0;
  while (index < events.length) {
    const event = events[index];
    if (event.effect === "pull") {
      parts.push(
        `Magnet ดึง Robo จาก ${describeCell(event.fromRow, event.fromCol)} ไป ${describeCell(event.toRow, event.toCol)}`,
      );
      index += 1;
    } else if (event.reason === "tie") {
      let count = 0;
      while (index < events.length && events[index].reason === "tie") {
        count += 1;
        index += 1;
      }
      parts.push(
        `Robo อยู่ในระยะ Magnet ${count} อันพร้อมกัน จึงอยู่กับที่ที่ ${describeCell(event.fromRow, event.fromCol)}`,
      );
    } else {
      parts.push(
        `Robo อยู่บนช่อง Magnet ที่ ${describeCell(event.fromRow, event.fromCol)} Magnet ทำงานแต่ไม่ดึง`,
      );
      index += 1;
    }
  }

  return ` · ${parts.join(" · ")} (Magnet ชำรุด ${events.length} อัน)`;
}

// ข้อความตามผลที่ทำให้การเดินจบ (ไม่รวมส่วนของ Oil)
function describeOutcome(lastMove) {
  const facingText = getDirectionInfo(lastMove.facingAfterTurn).label;
  if (lastMove.crashed) {
    return `${lastMove.label}: เดินได้ ${lastMove.stepsTaken} ช่อง แล้วตกแมพ! Crash +1 · Robo กลับ Starting Point โดยหันไปทาง${facingText}`;
  }
  if (lastMove.destroyed) {
    const typeName = getObstacleType("destroyer")?.label ?? "Destroyer";
    return `${lastMove.label}: ก้าวเข้า ${typeName} · เดินได้ ${lastMove.stepsTaken} ช่อง แล้ว Robo พัง! Crash +1 · Robo กลับ Starting Point โดยหันไปทาง${facingText} · ${typeName} ชำรุด`;
  }
  if (lastMove.blocked) {
    return `${lastMove.label}: ชน Wall · เดินได้ ${lastMove.stepsTaken} ช่อง แล้วหยุด · หันไปทาง${facingText}`;
  }
  if (lastMove.returnedToStart) {
    return `${lastMove.label}: ก้าวเข้า Hole แต่ไม่มีปลายทางที่ใช้ได้ · Robo กลับ Starting Point (ไม่นับ Crash) · Hole ที่ก้าวเข้าชำรุด · หันไปทาง${facingText}`;
  }
  if (lastMove.stoppedBy) {
    const typeName =
      getObstacleType(lastMove.stoppedBy)?.label ?? lastMove.stoppedBy;
    return `${lastMove.label}: ก้าวเข้า ${typeName} · เดินได้ ${lastMove.stepsTaken} ช่อง แล้วหยุดบนช่องนั้น · ${typeName} ชำรุด · หันไปทาง${facingText}`;
  }
  if (lastMove.pendingWarp) {
    return `${lastMove.label}: ก้าวเข้า Hole · หยุดเดิน · เลือกปลายทางการวาร์ปด้านบน`;
  }
  if (lastMove.warp) {
    return `${lastMove.label}: ก้าวเข้า Hole แล้ววาร์ปจาก ${describeCell(lastMove.warp.fromRow, lastMove.warp.fromCol)} ไป ${describeCell(lastMove.warp.toRow, lastMove.warp.toCol)} · หยุดเดิน · Hole ปลายทางชำรุด · หันไปทาง${facingText}`;
  }
  if (lastMove.steps === 0) {
    return `${lastMove.label}: หันไปทาง${facingText}`;
  }
  return `${lastMove.label}: หันไปทาง${facingText} แล้วเดิน ${lastMove.stepsTaken} ช่อง`;
}

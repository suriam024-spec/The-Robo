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
export function describeLastMove(lastMove) {
  if (!lastMove) return "ยังไม่ได้สั่งเคลื่อนที่";
  const oilText =
    lastMove.extraSteps > 0
      ? ` · ก้าวเข้า Oil ทำให้เดินเพิ่ม ${lastMove.extraSteps} ช่อง (Oil ชำรุด ${lastMove.extraSteps} อัน)`
      : "";
  return describeOutcome(lastMove) + oilText;
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
    const typeName = getObstacleType(lastMove.stoppedBy)?.label ?? lastMove.stoppedBy;
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
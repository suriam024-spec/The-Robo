// M4.3 กลุ่ม 1 — Virus WITH "ปรับการเดิน": ขาหัก / ขาหัก+ / ย้อนรอย / กระโดด (ฟังก์ชันล้วน ไม่ผูกกับหน้าจอ)
//
// กติกา (OWNER ตัดสิน Q1–Q5 ของ M4.3 กลุ่ม 1):
//  Q1 "Movement ครั้งถัดไป" = Movement ใบถัดไปที่ถูกเล่นต่อจากตาของผู้ใช้ Virus (ไม่ว่าของใคร ข้ามรอบได้)
//     ผู้เล่นเล่น Movement ของตัวเองก่อน แล้ว Virus ค่อยทำงาน (Movement → Virus) ผลจึงไปติดกับ Movement ใบถัดไป ไม่ใช่ใบของตัวเอง
//     ถ้ามี Virus ค้างหลายใบ ผลของทุกใบรวมกันกับ Movement ใบนั้น แล้วหมดไป
//  Q2 ขาหัก ลดระยะเดินที่เขียนบนการ์ด 1 ช่อง / ขาหัก+ ลด 2 ช่อง ไม่ต่ำกว่า 0 เหลือ 0 ก็ไม่เดิน แต่ส่วนหันยังทำ
//     การ์ดที่ไม่มีการเดิน (Turn Left / Turn Right / Turn Around) ไม่มีผล
//     ลดเฉพาะระยะบนการ์ด ไม่กระทบก้าวเพิ่มจาก Oil / การถอยของ Spring / การดีด (ผลนั้นเกิดในลูปเดินเอง)
//  Q3 ย้อนรอย กลับด้านทีละส่วน: หันซ้าย ↔ หันขวา / เดินหน้า N ↔ ถอยหลัง N (ทิศหันคงเดิม) / Turn Around ไม่เปลี่ยน
//     ใช้สองใบ = กลับด้านสองครั้ง = เหมือนเดิม
//  Q4 กระโดด เดินแบบเว้นช่อง (ก้าวละ 2 ช่อง) ดูรายละเอียดที่ movement.js / การ์ดที่ไม่มีการเดินไม่มีผล
//
// คำสั่งเดิน = { id, label, turn, steps } (ดู MOVEMENT_COMMANDS) หลังปรับจะมีฟิลด์เพิ่ม reverse / jump (บูลีน)
// เมื่อระยะเดินเหลือ 0 ฟิลด์ reverse / jump จะเป็น false เสมอ (ไม่มีอะไรให้ถอย/กระโดด)

import { getVirusType } from "../cards/virusCards.js";

// Virus ของกลุ่มนี้ (id ตรงกับ virusCards.js)
export const MOVEMENT_MODIFIER_IDS = [
  "broken-leg",
  "broken-leg-plus",
  "backtrack",
  "jump",
];

export function isMovementModifier(typeId) {
  return MOVEMENT_MODIFIER_IDS.includes(typeId);
}

// ระยะที่ขาหักลด
const LEG_REDUCTION = { "broken-leg": 1, "broken-leg-plus": 2 };

// ผลตรงข้ามของการหัน
const MIRROR_TURN = {
  NONE: "NONE",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
  AROUND: "AROUND",
};

// ปรับคำสั่งเดินด้วย Virus 1 ใบ คืน { command, changed }
// changed = false เมื่อ Virus ใบนี้ไม่มีผลกับคำสั่งนี้ (เช่น ขาหักกับ Turn Left ที่ไม่มีการเดิน)
export function applyMovementModifier(command, typeId) {
  if (!isMovementModifier(typeId)) {
    throw new Error(`Not a movement modifier: ${typeId}`);
  }

  const steps = Math.max(0, Math.floor(command.steps));
  const reverse = command.reverse === true;

  if (typeId === "broken-leg" || typeId === "broken-leg-plus") {
    if (steps <= 0) return { command, changed: false };
    return {
      command: { ...command, steps: Math.max(0, steps - LEG_REDUCTION[typeId]) },
      changed: true,
    };
  }

  if (typeId === "backtrack") {
    const changed = command.turn === "LEFT" || command.turn === "RIGHT" || steps > 0;
    if (!changed) return { command, changed: false };
    return {
      command: {
        ...command,
        turn: MIRROR_TURN[command.turn],
        reverse: steps > 0 ? !reverse : reverse,
      },
      changed: true,
    };
  }

  // jump
  if (steps <= 0) return { command, changed: false };
  return { command: { ...command, jump: true }, changed: true };
}

// ปรับคำสั่งเดินด้วย Virus หลายใบตามลำดับที่ให้ (ผลเท่ากันไม่ว่าลำดับใด)
// virusTypeIds = รายการ id ของ Virus เช่น ["broken-leg", "backtrack"]
// คืน { command, applied: [{ typeId, label, changed }] } (command เป็นของใหม่ ไม่แก้ของเดิม)
export function applyVirusModifiers(command, virusTypeIds) {
  let current = {
    ...command,
    reverse: command.reverse === true,
    jump: command.jump === true,
  };
  const applied = [];

  for (const typeId of virusTypeIds) {
    const result = applyMovementModifier(current, typeId);
    current = result.command;
    applied.push({
      typeId,
      label: getVirusType(typeId)?.label ?? typeId,
      changed: result.changed,
    });
  }

  // ไม่มีก้าวให้ถอย/กระโดด → ล้างธง (ผลเท่ากันไม่ว่าลำดับของ Virus)
  if (Math.floor(current.steps) <= 0) {
    current = { ...current, reverse: false, jump: false };
  }
  return { command: current, applied };
}

// ---------------------------------------------------------------------------
// คิว Virus ที่รอผล (Q1): [{ uid, typeId, ownerIndex }] เรียงตามลำดับที่ใช้
// ---------------------------------------------------------------------------

// เล่น Movement 1 คำสั่งพร้อม (หรือไม่มี) Virus ที่แนบ
//  1) Virus ที่ค้างอยู่ในคิวทำงานกับ Movement นี้ (ปรับคำสั่ง) แล้วคิวว่าง
//  2) แล้ว Virus ที่แนบมา (ถ้ามี) เข้าคิวรอ Movement ใบถัดไป (Movement → Virus)
// attached = { uid, typeId } หรือ null (ต้องเป็น Virus ของกลุ่มนี้ ไม่เช่นนั้น throw)
// คืน { command, applied, pending }  command = คำสั่งที่ต้องเอาไปเดินจริง
export function playMovementWithVirus(pending, command, attached, ownerIndex) {
  if (attached && !isMovementModifier(attached.typeId)) {
    throw new Error(`Virus not supported yet: ${attached.typeId}`);
  }

  const { command: finalCommand, applied } = applyVirusModifiers(
    command,
    pending.map((item) => item.typeId),
  );
  const nextPending = attached
    ? [{ uid: attached.uid, typeId: attached.typeId, ownerIndex }]
    : [];

  return {
    command: finalCommand,
    applied: pending.map((item, index) => ({
      ...applied[index],
      uid: item.uid,
      ownerIndex: item.ownerIndex,
    })),
    pending: nextPending,
  };
}
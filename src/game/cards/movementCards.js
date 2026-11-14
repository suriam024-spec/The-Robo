// M4.1 — ข้อมูลและกติกาของ Movement Cards (ฟังก์ชันล้วน ไม่ผูกกับหน้าจอ)
//
// การ์ด Movement 10 ชนิดตาม GDD v0.2 หัวข้อ 19 ใช้ id เดียวกับ MOVEMENT_COMMANDS
// จึงเล่นการ์ดแล้วส่งเข้า applyMovementCommand ได้ตรง ๆ โดยไม่แก้ตรรกะการเดิน
//
// จำนวนการ์ดต่อชนิด: GDD กำหนดแค่ "Walk มี 10 ใบ" ที่เหลือเป็นค่าชั่วคราวจากข้อเสนอของ DEV
// (OWNER อนุมัติให้ใช้ไปก่อน และให้ปรับได้ในหน้าตั้งค่าบนเว็บ รอตัดสินจริงตอน Playtest M7)
// ทุกฟังก์ชันรับจำนวนต่อชนิดเป็นพารามิเตอร์ ไม่อ่านจากค่าคงที่ตรง ๆ

import { MOVEMENT_COMMANDS } from "../movement/movement.js";

// ผู้เล่นแต่ละคนได้มือ Movement 4 ใบ (GDD หัวข้อ 10) และเติมให้ครบ 4 เมื่อมือหมด (GDD หัวข้อ 26)
export const MOVEMENT_HAND_SIZE = 4;

// เพดานจำนวนต่อชนิดในหน้าตั้งค่า (กันพิมพ์ผิดเป็นเลขใหญ่เกินไป)
export const MAX_CARDS_PER_TYPE = 99;

// ชนิดการ์ดทั้งหมด เรียงตามตารางใน GDD
export const MOVEMENT_CARD_TYPES = MOVEMENT_COMMANDS.map((command) => ({
  id: command.id,
  label: command.label,
  turn: command.turn,
  steps: command.steps,
}));

// จำนวนเริ่มต้นต่อชนิด (รวม 40 ใบ) — Walk 10 ตาม GDD ส่วนที่เหลือเป็นค่าชั่วคราว
export const DEFAULT_MOVEMENT_COUNTS = {
  walk: 10,
  "walk-plus": 6,
  "walk-plus-plus": 4,
  "turn-left": 3,
  "turn-left-plus": 3,
  "turn-left-plus-plus": 2,
  "turn-right": 3,
  "turn-right-plus": 3,
  "turn-right-plus-plus": 2,
  "turn-around": 4,
};

// คำสั่งเดินของการ์ดใบนี้ (ส่งเข้า applyMovementCommand ได้ตรง ๆ) คืน null ถ้าไม่รู้จักชนิด
export function getCardCommand(card) {
  return (
    MOVEMENT_COMMANDS.find((command) => command.id === card.typeId) ?? null
  );
}

// จำนวนการ์ดรวมตามตารางจำนวน (นับเฉพาะชนิดที่รู้จัก)
export function countMovementTotal(counts) {
  return MOVEMENT_CARD_TYPES.reduce(
    (sum, type) =>
      sum + (Number.isInteger(counts?.[type.id]) ? counts[type.id] : 0),
    0,
  );
}

// ตรวจตารางจำนวนที่ตั้งจากหน้าเว็บ
// ต้องมีครบทุกชนิด ทุกค่าเป็นจำนวนเต็ม 0 ถึง MAX_CARDS_PER_TYPE และไม่มีชนิดแปลกปลอม และรวมอย่างน้อย 1 ใบ
// คืนค่า { ok: true, total } หรือ { ok: false, reason, message, typeId? }
export function validateMovementCounts(counts) {
  if (counts === null || typeof counts !== "object" || Array.isArray(counts)) {
    return {
      ok: false,
      reason: "NOT_OBJECT",
      message: "ตารางจำนวนการ์ดไม่ถูกต้อง",
    };
  }

  const knownIds = new Set(MOVEMENT_CARD_TYPES.map((type) => type.id));
  for (const key of Object.keys(counts)) {
    if (!knownIds.has(key)) {
      return {
        ok: false,
        reason: "UNKNOWN_TYPE",
        message: `ไม่รู้จักชนิดการ์ด ${key}`,
        typeId: key,
      };
    }
  }

  for (const type of MOVEMENT_CARD_TYPES) {
    const value = counts[type.id];
    if (!Number.isInteger(value)) {
      return {
        ok: false,
        reason: "NOT_INTEGER",
        message: `จำนวนของ ${type.label} ต้องเป็นจำนวนเต็ม`,
        typeId: type.id,
      };
    }
    if (value < 0 || value > MAX_CARDS_PER_TYPE) {
      return {
        ok: false,
        reason: "OUT_OF_RANGE",
        message: `จำนวนของ ${type.label} ต้องอยู่ระหว่าง 0 ถึง ${MAX_CARDS_PER_TYPE}`,
        typeId: type.id,
      };
    }
  }

  const total = countMovementTotal(counts);
  if (total < 1) {
    return { ok: false, reason: "EMPTY", message: "ต้องมีการ์ดอย่างน้อย 1 ใบ" };
  }
  return { ok: true, total };
}

// ตรวจว่าจำนวนการ์ดพอแจกมือเริ่มต้นให้ผู้เล่นทุกคนหรือไม่ (ผู้เล่น x 4 ใบ)
// คืนค่า { ok: true } หรือ { ok: false, reason: "NOT_ENOUGH_CARDS", message, needed, total }
export function canDealMovement(counts, playerCount) {
  const total = countMovementTotal(counts);
  const needed = playerCount * MOVEMENT_HAND_SIZE;
  if (total < needed) {
    return {
      ok: false,
      reason: "NOT_ENOUGH_CARDS",
      message: `การ์ดไม่พอแจก: ผู้เล่น ${playerCount} คนต้องใช้ ${needed} ใบ แต่ตั้งไว้ ${total} ใบ`,
      needed,
      total,
    };
  }
  return { ok: true };
}

// สร้างกอง Movement ตามจำนวนต่อชนิด (ยังไม่สับ) เรียงตามชนิดในตาราง
// การ์ดแต่ละใบ = { uid, typeId } uid ไม่ซ้ำกันในกอง เช่น "mv-walk-1", "mv-walk-2"
export function buildMovementDeck(counts) {
  return MOVEMENT_CARD_TYPES.flatMap((type) =>
    Array.from({ length: counts[type.id] ?? 0 }, (_, k) => ({
      uid: `mv-${type.id}-${k + 1}`,
      typeId: type.id,
    })),
  );
}

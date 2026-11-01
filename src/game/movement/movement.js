// M3.1 — ตรรกะการเคลื่อนที่ของ Robo (ฟังก์ชันคำนวณล้วน ไม่ผูกกับหน้าจอ)
// M3.3 — เพิ่มการตรวจ Obstacle ระหว่างเดิน (The Wall, The Hole)
//
// พิกัดใช้ row/col เริ่มนับจาก 0 (แถวบนสุด = 0, คอลัมน์ซ้ายสุด = 0)
// ทิศ: UP = แถวลดลง, DOWN = แถวเพิ่มขึ้น, LEFT = คอลัมน์ลดลง, RIGHT = คอลัมน์เพิ่มขึ้น

import { getHoleDestinations, isDamaged } from "../obstacles/obstacles.js";

// เรียงตามเข็มนาฬิกา: หันขวา = ไปตัวถัดไป, หันซ้าย = ย้อนกลับ
export const FACINGS = ["UP", "RIGHT", "DOWN", "LEFT"];

const FACING_DELTAS = {
  UP: { row: -1, col: 0 },
  RIGHT: { row: 0, col: 1 },
  DOWN: { row: 1, col: 0 },
  LEFT: { row: 0, col: -1 },
};

// คำสั่งเคลื่อนที่ตามตาราง Movement Cards ใน GDD v0.2 หัวข้อ 19
// turn: NONE | LEFT | RIGHT | AROUND   steps: จำนวนช่องที่เดิน (หันก่อน แล้วค่อยเดิน)
export const MOVEMENT_COMMANDS = [
  { id: "walk", label: "Walk", turn: "NONE", steps: 1 },
  { id: "walk-plus", label: "Walk+", turn: "NONE", steps: 2 },
  { id: "walk-plus-plus", label: "Walk++", turn: "NONE", steps: 3 },
  { id: "turn-left", label: "Turn Left", turn: "LEFT", steps: 0 },
  { id: "turn-left-plus", label: "Turn Left+", turn: "LEFT", steps: 1 },
  { id: "turn-left-plus-plus", label: "Turn Left++", turn: "LEFT", steps: 2 },
  { id: "turn-right", label: "Turn Right", turn: "RIGHT", steps: 0 },
  { id: "turn-right-plus", label: "Turn Right+", turn: "RIGHT", steps: 1 },
  {
    id: "turn-right-plus-plus",
    label: "Turn Right++",
    turn: "RIGHT",
    steps: 2,
  },
  { id: "turn-around", label: "Turn Around", turn: "AROUND", steps: 0 },
];

// ตำแหน่ง Starting Point = ช่องกลางกระดาน (boardSize ต้องเป็นเลขคี่)
export function getStartPosition(boardSize) {
  const center = (boardSize - 1) / 2;
  return { row: center, col: center };
}

// สร้าง Robo ใหม่ที่ Starting Point หันตามทิศที่กำหนด
export function createRobo(boardSize, facing) {
  const start = getStartPosition(boardSize);
  return { row: start.row, col: start.col, facing };
}

export function isInsideBoard(row, col, boardSize) {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

// คำนวณทิศใหม่หลังหัน (turn = NONE | LEFT | RIGHT | AROUND)
export function turnFacing(facing, turn) {
  const index = FACINGS.indexOf(facing);
  if (index === -1) {
    throw new Error(`Unknown facing: ${facing}`);
  }

  if (turn === "NONE") return facing;
  if (turn === "RIGHT") return FACINGS[(index + 1) % FACINGS.length];
  if (turn === "LEFT")
    return FACINGS[(index + FACINGS.length - 1) % FACINGS.length];
  if (turn === "AROUND") return FACINGS[(index + 2) % FACINGS.length];

  throw new Error(`Unknown turn: ${turn}`);
}

// ช่องนี้มี The Wall หรือไม่ (Wall ไม่มีระบบชำรุด จึงใช้งานได้ตลอด)
function isWallAt(obstacles, row, col) {
  return obstacles.some(
    (item) => item.typeId === "wall" && item.row === row && item.col === col,
  );
}

// The Hole ที่ "ใช้งานได้" ในช่องนี้ (Hole ที่ชำรุดไม่ทำงาน Robo เดินผ่าน/หยุดได้เหมือนช่องปกติ)
function getActiveHoleAt(obstacles, row, col) {
  return (
    obstacles.find(
      (item) =>
        item.typeId === "hole" &&
        item.row === row &&
        item.col === col &&
        !isDamaged(item),
    ) ?? null
  );
}

// ผลลัพธ์พื้นฐานของการเคลื่อนที่ (ฟิลด์ของ Obstacle ต่าง ๆ เริ่มที่ค่าว่าง)
function createResult(robo, facingAfterTurn, nextRobo, stepsTaken, extra = {}) {
  return {
    robo: nextRobo,
    crashed: false,
    blocked: false,
    blockedBy: null,
    stepsTaken,
    facingBefore: robo.facing,
    facingAfterTurn,
    warp: null, // วาร์ปสำเร็จแล้ว: { entryUid, fromRow, fromCol, toUid, toRow, toCol }
    pendingWarp: null, // ต้องให้ผู้เล่นเลือกปลายทางก่อน: { entryUid, row, col, destinations }
    returnedToStart: false, // Hole ไม่มีปลายทาง → กลับ Starting Point
    damageUid: null, // uid ของ Obstacle ที่ต้องถูกทำให้ชำรุดจากผลนี้ (ให้ผู้เรียกจัดการ)
    ...extra,
  };
}

// ทำตามคำสั่งหนึ่งคำสั่ง: หันก่อน แล้วเดินทีละช่องตามทิศที่หัน
//
// - ก้าวออกนอกกระดาน → หยุดทันที (ก้าวที่เหลือยกเลิก), ตกแมพ (crashed = true),
//   Robo กลับ Starting Point โดยคงทิศที่หันอยู่ ณ ตอนตก
// - ช่องถัดไปเป็น The Wall → หยุดอยู่ช่องก่อนถึง Wall (blocked = true), ไม่นับ Crash (W1/W2)
// - ก้าวเข้าช่องที่มี The Hole ที่ใช้งานได้ (ทั้ง "ผ่าน" และ "ลงพอดี") → หยุดเดินทันที
//   (ก้าวที่เหลือยกเลิก) แล้ว (OWNER ตัดสิน H1–H5, D4, D5):
//     · ปลายทางที่ใช้ได้ (Hole อื่นที่ไม่ชำรุด) 0 จุด → กลับ Starting Point, ไม่นับ Crash, คงทิศ
//     · 1 จุด → วาร์ปไปจุดนั้นอัตโนมัติ, คงทิศ, Hole ปลายทางชำรุด (damageUid)
//     · ตั้งแต่ 2 จุด → คืน pendingWarp ให้ผู้เล่นเลือก แล้วเรียก completeHoleWarp ต่อ
//       (ระหว่างรอ Robo อยู่บน Hole ที่ก้าวเข้า)
//   นับเฉพาะช่องที่ "ก้าวเข้าไปใหม่" เท่านั้น: Robo ที่ยืนอยู่บน Hole เดิมแล้วสั่งหัน/เดินออก
//   จะไม่ทำให้ Hole นั้นทำงาน และ Robo ที่วาร์ปมาถึงปลายทางจะไม่วาร์ปซ้ำ
//
// obstacles = รายการ Obstacle บนกระดาน ({ uid, typeId, row, col, damagedTurns, ... })
//
// คืนค่า: { robo, crashed, blocked, blockedBy, stepsTaken, facingBefore, facingAfterTurn,
//           warp, pendingWarp, returnedToStart, damageUid }
//   robo = สถานะ Robo ใหม่ (ไม่แก้ค่าของ robo เดิม)
//   stepsTaken = จำนวนก้าวที่เดินสำเร็จ (รวมก้าวที่เข้า Hole) ก่อนตกแมพ/ถูกขวาง/วาร์ป/ครบคำสั่ง
export function applyMovementCommand(robo, command, boardSize, obstacles = []) {
  const steps = Math.max(0, Math.floor(command.steps));
  const facingAfterTurn = turnFacing(robo.facing, command.turn);
  const delta = FACING_DELTAS[facingAfterTurn];

  let row = robo.row;
  let col = robo.col;
  let stepsTaken = 0;

  for (let step = 0; step < steps; step += 1) {
    const nextRow = row + delta.row;
    const nextCol = col + delta.col;

    if (!isInsideBoard(nextRow, nextCol, boardSize)) {
      const start = getStartPosition(boardSize);
      return createResult(
        robo,
        facingAfterTurn,
        { row: start.row, col: start.col, facing: facingAfterTurn },
        stepsTaken,
        { crashed: true },
      );
    }

    if (isWallAt(obstacles, nextRow, nextCol)) {
      return createResult(
        robo,
        facingAfterTurn,
        { row, col, facing: facingAfterTurn },
        stepsTaken,
        {
          blocked: true,
          blockedBy: "wall",
        },
      );
    }

    row = nextRow;
    col = nextCol;
    stepsTaken += 1;

    const hole = getActiveHoleAt(obstacles, row, col);
    if (hole) {
      const destinations = getHoleDestinations(obstacles, hole.uid);

      if (destinations.length === 0) {
        const start = getStartPosition(boardSize);
        return createResult(
          robo,
          facingAfterTurn,
          { row: start.row, col: start.col, facing: facingAfterTurn },
          stepsTaken,
          { returnedToStart: true },
        );
      }

      if (destinations.length === 1) {
        const target = destinations[0];
        return createResult(
          robo,
          facingAfterTurn,
          { row: target.row, col: target.col, facing: facingAfterTurn },
          stepsTaken,
          {
            warp: {
              entryUid: hole.uid,
              fromRow: hole.row,
              fromCol: hole.col,
              toUid: target.uid,
              toRow: target.row,
              toCol: target.col,
            },
            damageUid: target.uid,
          },
        );
      }

      return createResult(
        robo,
        facingAfterTurn,
        { row, col, facing: facingAfterTurn },
        stepsTaken,
        {
          pendingWarp: {
            entryUid: hole.uid,
            row: hole.row,
            col: hole.col,
            destinations: destinations.map((item) => ({
              uid: item.uid,
              row: item.row,
              col: item.col,
            })),
          },
        },
      );
    }
  }

  return createResult(
    robo,
    facingAfterTurn,
    { row, col, facing: facingAfterTurn },
    stepsTaken,
  );
}

// ทำการวาร์ปที่รอผู้เล่นเลือก (pendingWarp จาก applyMovementCommand)
// robo = Robo ที่ยืนอยู่บน Hole ที่ก้าวเข้า, destinationUid = uid ของ Hole ปลายทางที่เลือก
// คืนค่า { robo, warp, damageUid } โดย Robo คงทิศเดิม และ damageUid คือ Hole ปลายทางที่ต้องชำรุด
// ถ้าเลือกปลายทางที่ไม่อยู่ในรายการ จะ throw error
export function completeHoleWarp(robo, pendingWarp, destinationUid) {
  const target = pendingWarp.destinations.find(
    (item) => item.uid === destinationUid,
  );
  if (!target) {
    throw new Error(`Invalid Hole destination: ${destinationUid}`);
  }

  return {
    robo: { row: target.row, col: target.col, facing: robo.facing },
    warp: {
      entryUid: pendingWarp.entryUid,
      fromRow: pendingWarp.row,
      fromCol: pendingWarp.col,
      toUid: target.uid,
      toRow: target.row,
      toCol: target.col,
    },
    damageUid: target.uid,
  };
}

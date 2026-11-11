// M3.1 — ตรรกะการเคลื่อนที่ของ Robo (ฟังก์ชันคำนวณล้วน ไม่ผูกกับหน้าจอ)
// M3.3 — เพิ่มการตรวจ Obstacle ระหว่างเดิน (The Wall, The Hole, The Scrap, The Oil, The Destroyer)
// R2 — ลูปเดินไม่รู้จักชื่อชนิด Obstacle แล้ว: ถามทะเบียนใน obstacles/types/index.js แทน
//
// พิกัดใช้ row/col เริ่มนับจาก 0 (แถวบนสุด = 0, คอลัมน์ซ้ายสุด = 0)
// ทิศ: UP = แถวลดลง, DOWN = แถวเพิ่มขึ้น, LEFT = คอลัมน์ลดลง, RIGHT = คอลัมน์เพิ่มขึ้น

import { getObstacleAt } from "../obstacles/obstacles.js";
import { getObstacleBehavior } from "../obstacles/types/index.js";

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
    stoppedBy: null, // ชนิด Obstacle ที่ทำให้ Robo หยุดบนช่อง (เช่น "scrap")
    destroyed: false, // Robo พังจาก The Destroyer (ผู้เรียกนับ Crash +1 แยกจากตกแมพ: crashed)
    extraSteps: 0, // จำนวนก้าวที่ได้เพิ่มจาก The Oil
    damageUids: [], // uid ของ Obstacle ทั้งหมดที่ต้องถูกทำให้ชำรุดจากผลนี้ (ให้ผู้เรียกจัดการ)
    damageUid: null, // ตัวสุดท้ายของ damageUids (หรือ null) คงไว้ให้โค้ดเดิมใช้
    triggers: [], // Obstacle ที่ "ทำงาน" ระหว่างคำสั่งนี้: [{ uid, typeId, effect }] (ไว้นับ Secret Mission ใน M6)
    ...extra,
  };
}

// บันทึกว่า Obstacle ใบนี้ทำงานด้วยผลชนิดไหน (effect = kind ของผลมาตรฐาน)
function makeTrigger(obstacle, effect) {
  return { uid: obstacle.uid, typeId: obstacle.typeId, effect };
}

// ทำตามคำสั่งหนึ่งคำสั่ง: หันก่อน แล้วเดินทีละช่องตามทิศที่หัน
//
// - ก้าวออกนอกกระดาน → หยุดทันที (ก้าวที่เหลือยกเลิก), ตกแมพ (crashed = true),
//   Robo กลับ Starting Point โดยคงทิศที่หันอยู่ ณ ตอนตก
// - ช่องถัดไปเป็น The Wall → หยุดอยู่ช่องก่อนถึง Wall (blocked = true), ไม่นับ Crash (W1/W2)
// - ก้าวเข้าช่องที่มี The Hole ที่ใช้งานได้ (ทั้ง "ผ่าน" และ "ลงพอดี") → หยุดเดินทันที
//   (ก้าวที่เหลือยกเลิก) แล้ว (OWNER ตัดสิน H1–H5, H6, D4, D5):
//     · ปลายทางที่ใช้ได้ (Hole อื่นที่ไม่ชำรุด) 0 จุด → กลับ Starting Point, ไม่นับ Crash, คงทิศ,
//       Hole ที่ก้าวเข้าชำรุด (damageUid, กติกา H6)
//     · 1 จุด → วาร์ปไปจุดนั้นอัตโนมัติ, คงทิศ, Hole ปลายทางชำรุด (damageUid)
//     · ตั้งแต่ 2 จุด → คืน pendingWarp ให้ผู้เล่นเลือก แล้วเรียก completeHoleWarp ต่อ
//       (ระหว่างรอ Robo อยู่บน Hole ที่ก้าวเข้า)
// - ก้าวเข้าช่องที่มี The Scrap ที่ใช้งานได้ (ผ่านหรือลงพอดี) → หยุดบนช่อง Scrap (ก้าวที่เหลือยกเลิก),
//   ไม่นับ Crash, ยังหันตามคำสั่ง, Scrap ชำรุดทันที (damageUid) และ stoppedBy = "scrap" (OWNER ตัดสิน S1–S3)
// - ก้าวเข้าช่องที่มี The Oil ที่ใช้งานได้ (ผ่านหรือลงพอดี) → ไม่หยุด แต่เพิ่มจำนวนก้าวของคำสั่งนี้อีก 1 ก้าว
//   (extraSteps) Oil ชำรุดทันที ถ้าก้าวที่เพิ่มไปเจอ Oil อีกอันก็เพิ่มอีก และก้าวที่เพิ่มมาเป็นก้าวปกติ
//   (ตกแมพ/ชน Wall/เจอ Hole/Scrap ได้) (OWNER ตัดสิน O1–O3)
// - ก้าวเข้าช่องที่มี The Destroyer ที่ใช้งานได้ (ผ่านหรือลงพอดี) → Robo พังทันที (destroyed = true):
//   หยุดเดิน ก้าวที่เหลือยกเลิก กลับ Starting Point คงทิศ, Destroyer ชำรุดทันที (damageUid)
//   ผู้เรียกนับ Crash +1 ร่วมกับตกแมพ (OWNER ตัดสิน D1–D4) ส่วนที่ผูกกับ Virus Card ทำใน M4
//   (กติกาของแต่ละชนิดอยู่ในไฟล์ obstacles/types/<ชนิด>.js ลูปนี้แค่ทำตาม "ผล" ที่ทะเบียนตอบกลับ)
//   นับเฉพาะช่องที่ "ก้าวเข้าไปใหม่" เท่านั้น: Robo ที่ยืนอยู่บน Hole เดิมแล้วสั่งหัน/เดินออก
//   จะไม่ทำให้ Hole นั้นทำงาน และ Robo ที่วาร์ปมาถึงปลายทางจะไม่วาร์ปซ้ำ
//
// obstacles = รายการ Obstacle บนกระดาน ({ uid, typeId, row, col, damagedTurns, ... })
//
// คืนค่า: { robo, crashed, blocked, blockedBy, stepsTaken, facingBefore, facingAfterTurn,
//           warp, pendingWarp, returnedToStart, stoppedBy, destroyed, extraSteps, damageUids, damageUid, triggers }
//   robo = สถานะ Robo ใหม่ (ไม่แก้ค่าของ robo เดิม)
//   stepsTaken = จำนวนก้าวที่เดินสำเร็จ (รวมก้าวที่เข้า Hole และก้าวที่ได้เพิ่มจาก Oil) ก่อนตกแมพ/ถูกขวาง/วาร์ป/ครบคำสั่ง
//   extraSteps = จำนวนก้าวที่ได้เพิ่มจาก Oil ทั้งหมดในคำสั่งนี้
//   damageUids = uid ของ Obstacle ทั้งหมดที่ต้องชำรุดจากคำสั่งนี้ (เรียงตามเวลาที่เกิด)
//   damageUid = ตัวสุดท้ายของ damageUids (หรือ null) คงไว้ให้โค้ดเดิมใช้
//   triggers = Obstacle ที่ทำงานทั้งหมดตามลำดับ (Oil หลายอันได้ ตามด้วยผลที่หยุด Robo อีกไม่เกิน 1)
export function applyMovementCommand(robo, command, boardSize, obstacles = []) {
  const steps = Math.max(0, Math.floor(command.steps));
  const facingAfterTurn = turnFacing(robo.facing, command.turn);
  const delta = FACING_DELTAS[facingAfterTurn];

  let row = robo.row;
  let col = robo.col;
  let stepsTaken = 0;
  let totalSteps = steps; // เพิ่มได้ระหว่างเดิน (The Oil)
  let extraSteps = 0;
  const damaged = []; // Obstacle ที่ทำงานแล้วและต้องชำรุด (เช่น Oil ที่ผ่านมา)
  const triggerLog = []; // Obstacle ที่ทำงานแล้ว (ยังไม่นับผลที่หยุด Robo)

  // สร้างผลลัพธ์ ณ จุดที่การเดินจบ: รวมสิ่งที่สะสมมา (ชำรุด/triggers/ก้าวเพิ่ม) กับผลของจุดที่หยุด
  const finish = (nextRobo, extra = {}) => {
    const {
      damageUid: ownDamage = null,
      triggers: ownTriggers = [],
      ...rest
    } = extra;
    const damageUids = ownDamage ? [...damaged, ownDamage] : [...damaged];
    return createResult(robo, facingAfterTurn, nextRobo, stepsTaken, {
      ...rest,
      extraSteps,
      damageUids,
      damageUid:
        damageUids.length > 0 ? damageUids[damageUids.length - 1] : null,
      triggers: [...triggerLog, ...ownTriggers],
    });
  };

  for (let step = 0; step < totalSteps; step += 1) {
    const nextRow = row + delta.row;
    const nextCol = col + delta.col;

    if (!isInsideBoard(nextRow, nextCol, boardSize)) {
      const start = getStartPosition(boardSize);
      return finish(
        { row: start.row, col: start.col, facing: facingAfterTurn },
        { crashed: true },
      );
    }

    const here = getObstacleAt(obstacles, nextRow, nextCol);
    const behavior = here ? getObstacleBehavior(here.typeId) : null;

    if (behavior?.onBeforeEnter) {
      const effect = behavior.onBeforeEnter({
        obstacle: here,
        obstacles,
        row: nextRow,
        col: nextCol,
      });

      if (effect?.kind === "block") {
        return finish(
          { row, col, facing: facingAfterTurn },
          {
            blocked: true,
            blockedBy: effect.blockedBy,
            triggers: [makeTrigger(here, effect.kind)],
          },
        );
      }
      if (effect) {
        throw new Error(`Unsupported onBeforeEnter effect: ${effect.kind}`);
      }
    }

    row = nextRow;
    col = nextCol;
    stepsTaken += 1;

    if (behavior?.onEnter) {
      const effect = behavior.onEnter({ obstacle: here, obstacles, row, col });

      if (effect) {
        const triggers = [makeTrigger(here, effect.kind)];

        if (effect.kind === "extend") {
          // ไม่หยุด: เพิ่มก้าวแล้วเดินต่อ (เดินเป็นเส้นตรง จึงไม่วนกลับมาเจอ Oil เดิม)
          totalSteps += effect.extraSteps;
          extraSteps += effect.extraSteps;
          triggerLog.push(...triggers);
          if (effect.damageUid) damaged.push(effect.damageUid);
          continue;
        }

        if (effect.kind === "return-to-start") {
          const start = getStartPosition(boardSize);
          return finish(
            { row: start.row, col: start.col, facing: facingAfterTurn },
            {
              returnedToStart: true,
              damageUid: effect.damageUid ?? null,
              triggers,
            },
          );
        }

        if (effect.kind === "destroy") {
          const start = getStartPosition(boardSize);
          return finish(
            { row: start.row, col: start.col, facing: facingAfterTurn },
            {
              destroyed: true,
              damageUid: effect.damageUid ?? null,
              triggers,
            },
          );
        }

        if (effect.kind === "stop") {
          return finish(
            { row, col, facing: facingAfterTurn },
            {
              stoppedBy: here.typeId,
              damageUid: effect.damageUid ?? null,
              triggers,
            },
          );
        }

        if (effect.kind === "warp") {
          return finish(
            { row: effect.row, col: effect.col, facing: facingAfterTurn },
            { warp: effect.warp, damageUid: effect.damageUid, triggers },
          );
        }

        if (effect.kind === "choose-warp") {
          return finish(
            { row, col, facing: facingAfterTurn },
            { pendingWarp: effect.pendingWarp, triggers },
          );
        }

        throw new Error(`Unsupported onEnter effect: ${effect.kind}`);
      }
    }
  }

  return finish({ row, col, facing: facingAfterTurn });
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

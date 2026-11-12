// M3.1 — ตรรกะการเคลื่อนที่ของ Robo (ฟังก์ชันคำนวณล้วน ไม่ผูกกับหน้าจอ)
// M3.3 — เพิ่มการตรวจ Obstacle ระหว่างเดิน (The Wall, The Hole, The Scrap, The Oil, The Destroyer, The Spring)
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
    retreatSteps: 0, // จำนวนก้าวที่ The Spring ถอย/ดีด Robo (ไม่รวมใน stepsTaken)
    bounces: [], // The Spring ที่ทำงาน ตามลำดับ: [{ uid, distance }]
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
//   ไม่นับ Crash, ยังหันตามคำสั่ง, Scrap ชำรุดทันที (damageUid) และ stoppedBy = "scrap" (OWNER ตัดสิน S1–S3 ของ Scrap)
// - ก้าวเข้าช่องที่มี The Oil ที่ใช้งานได้ (ผ่านหรือลงพอดี) → ไม่หยุด แต่เพิ่มจำนวนก้าวของคำสั่งนี้อีก 1 ก้าว
//   (extraSteps) Oil ชำรุดทันที ถ้าก้าวที่เพิ่มไปเจอ Oil อีกอันก็เพิ่มอีก และก้าวที่เพิ่มมาเป็นก้าวปกติ
//   (ตกแมพ/ชน Wall/เจอ Hole/Scrap ได้) (OWNER ตัดสิน O1–O3)
// - ก้าวเข้าช่องที่มี The Destroyer ที่ใช้งานได้ (ผ่านหรือลงพอดี) → Robo พังทันที (destroyed = true):
//   หยุดเดิน ก้าวที่เหลือยกเลิก กลับ Starting Point คงทิศ, Destroyer ชำรุดทันที (damageUid)
//   ผู้เรียกนับ Crash +1 ร่วมกับตกแมพ (OWNER ตัดสิน D1–D4) ส่วนที่ผูกกับ Virus Card ทำใน M4
// - การเดินช่วงหนึ่ง (ช่วงหลัก = ตามคำสั่ง) จบลงที่ช่องที่มี The Spring ที่ใช้งานได้ และ Robo ก้าวเข้าช่องนั้นในช่วงนี้
//   (ลงพอดี หรือหยุดเพราะก้าวต่อไปติด Wall) → Spring ทำงาน: ชำรุดทันที แล้วถอย Robo 2 ช่องไปทิศตรงข้ามกับที่เข้ามา
//   (Robo ไม่หมุนตัว) การถอยคือการเดินอีกช่วงหนึ่งที่ใช้กติกาเดียวกันทั้งหมด ถ้าการถอยไปจบบน Spring อีกอัน
//   อันนั้นดีดกลับทิศตรงข้าม 1 ช่อง Spring ถัดไปในทอดเดียวกันลดระยะอีก 1 ต่อหนึ่งอัน (2, 1, 0) (OWNER ตัดสิน S1–S5 ของ Spring)
//   (กติกาของแต่ละชนิดอยู่ในไฟล์ obstacles/types/<ชนิด>.js ลูปนี้แค่ทำตาม "ผล" ที่ทะเบียนตอบกลับ)
//   นับเฉพาะช่องที่ "ก้าวเข้าไปใหม่" เท่านั้น: Robo ที่ยืนอยู่บน Hole เดิมแล้วสั่งหัน/เดินออก
//   จะไม่ทำให้ Hole นั้นทำงาน และ Robo ที่วาร์ปมาถึงปลายทางจะไม่วาร์ปซ้ำ
//   Obstacle ที่ทำงานแล้วถือว่าชำรุดทันทีตลอดคำสั่งนี้ (เพราะ Spring ทำให้ Robo กลับมาช่องเดิมได้)
//
// obstacles = รายการ Obstacle บนกระดาน ({ uid, typeId, row, col, damagedTurns, ... })
//
// คืนค่า: { robo, crashed, blocked, blockedBy, stepsTaken, facingBefore, facingAfterTurn,
//           warp, pendingWarp, returnedToStart, stoppedBy, destroyed, extraSteps, retreatSteps, bounces,
//           damageUids, damageUid, triggers }
//   robo = สถานะ Robo ใหม่ (ไม่แก้ค่าของ robo เดิม)
//   stepsTaken = จำนวนก้าวของการเดินหลัก (รวมก้าวที่เข้า Hole และก้าวที่ได้เพิ่มจาก Oil) ก่อนตกแมพ/ถูกขวาง/วาร์ป/ครบคำสั่ง
//   extraSteps = จำนวนก้าวที่ได้เพิ่มจาก Oil ทั้งหมดในคำสั่งนี้ (รวมช่วงที่ Spring ถอย)
//   retreatSteps = จำนวนก้าวที่ Spring ถอย/ดีด (รวมทุกช่วง)
//   bounces = Spring ที่ทำงาน ตามลำดับ [{ uid, distance }]
//   damageUids = uid ของ Obstacle ทั้งหมดที่ต้องชำรุดจากคำสั่งนี้ (เรียงตามเวลาที่เกิด)
//   damageUid = ตัวสุดท้ายของ damageUids (หรือ null) คงไว้ให้โค้ดเดิมใช้
//   triggers = Obstacle ที่ทำงานทั้งหมดตามลำดับ (Oil/Spring ได้หลายรายการ ตามด้วยผลที่หยุด Robo)
export function applyMovementCommand(robo, command, boardSize, obstacles = []) {
  const steps = Math.max(0, Math.floor(command.steps));
  const facingAfterTurn = turnFacing(robo.facing, command.turn);
  const forward = FACING_DELTAS[facingAfterTurn];

  let row = robo.row;
  let col = robo.col;
  let stepsTaken = 0; // ก้าวของการเดินหลัก
  let retreatSteps = 0; // ก้าวที่ Spring ถอย/ดีด
  let extraSteps = 0;
  let blockedBy = null;
  const damaged = []; // Obstacle ที่ทำงานแล้วและต้องชำรุด (เรียงตามเวลา)
  const triggerLog = []; // Obstacle ที่ทำงานแล้ว (ยังไม่นับผลที่หยุด Robo)
  const bounces = [];
  const worked = new Set(); // uid ของ Obstacle ที่ทำงานแล้วในคำสั่งนี้ → ถือว่าชำรุดต่อไปตลอดคำสั่ง

  // รายการ Obstacle ณ ตอนนี้: ตัวที่ทำงานไปแล้วในคำสั่งนี้ถือว่าชำรุด
  const liveObstacles = () =>
    worked.size === 0
      ? obstacles
      : obstacles.map((item) =>
          worked.has(item.uid)
            ? { ...item, damagedTurns: Math.max(item.damagedTurns ?? 0, 1) }
            : item,
        );

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
      blocked: blockedBy !== null,
      blockedBy,
      extraSteps,
      retreatSteps,
      bounces: [...bounces],
      damageUids,
      damageUid:
        damageUids.length > 0 ? damageUids[damageUids.length - 1] : null,
      triggers: [...triggerLog, ...ownTriggers],
    });
  };

  // เดิน count ก้าวไปตามทิศ delta (ช่วงหลักหรือช่วงที่ Spring ถอย/ดีด)
  // คืน { result } เมื่อเกิดผลที่จบทั้งคำสั่ง (ตกแมพ/พัง/หยุด/วาร์ป ฯลฯ)
  // ไม่เช่นนั้นคืน { result: null, taken } เมื่อช่วงนี้จบตามปกติ (ครบก้าวหรือติด Wall) taken = ก้าวที่เดินได้ในช่วงนี้
  const runSegment = (delta, count, isPrimary) => {
    let totalSteps = count; // เพิ่มได้ระหว่างเดิน (The Oil)
    let taken = 0;

    for (let step = 0; step < totalSteps; step += 1) {
      const nextRow = row + delta.row;
      const nextCol = col + delta.col;

      if (!isInsideBoard(nextRow, nextCol, boardSize)) {
        const start = getStartPosition(boardSize);
        return {
          result: finish(
            { row: start.row, col: start.col, facing: facingAfterTurn },
            { crashed: true },
          ),
        };
      }

      const field = liveObstacles();
      const here = getObstacleAt(field, nextRow, nextCol);
      const behavior = here ? getObstacleBehavior(here.typeId) : null;

      if (behavior?.onBeforeEnter) {
        const effect = behavior.onBeforeEnter({
          obstacle: here,
          obstacles: field,
          row: nextRow,
          col: nextCol,
        });

        if (effect?.kind === "block") {
          blockedBy = blockedBy ?? effect.blockedBy;
          triggerLog.push(makeTrigger(here, effect.kind));
          return { result: null, taken };
        }
        if (effect) {
          throw new Error(`Unsupported onBeforeEnter effect: ${effect.kind}`);
        }
      }

      row = nextRow;
      col = nextCol;
      if (isPrimary) stepsTaken += 1;
      else retreatSteps += 1;
      taken += 1;

      if (behavior?.onEnter) {
        const effect = behavior.onEnter({
          obstacle: here,
          obstacles: field,
          row,
          col,
        });

        if (effect) {
          const triggers = [makeTrigger(here, effect.kind)];

          if (effect.kind === "extend") {
            // ไม่หยุด: เพิ่มก้าวแล้วเดินต่อ
            totalSteps += effect.extraSteps;
            extraSteps += effect.extraSteps;
            triggerLog.push(...triggers);
            if (effect.damageUid) {
              damaged.push(effect.damageUid);
              worked.add(effect.damageUid);
            }
            continue;
          }

          if (effect.kind === "return-to-start") {
            const start = getStartPosition(boardSize);
            return {
              result: finish(
                { row: start.row, col: start.col, facing: facingAfterTurn },
                {
                  returnedToStart: true,
                  damageUid: effect.damageUid ?? null,
                  triggers,
                },
              ),
            };
          }

          if (effect.kind === "destroy") {
            const start = getStartPosition(boardSize);
            return {
              result: finish(
                { row: start.row, col: start.col, facing: facingAfterTurn },
                {
                  destroyed: true,
                  damageUid: effect.damageUid ?? null,
                  triggers,
                },
              ),
            };
          }

          if (effect.kind === "stop") {
            return {
              result: finish(
                { row, col, facing: facingAfterTurn },
                {
                  stoppedBy: here.typeId,
                  damageUid: effect.damageUid ?? null,
                  triggers,
                },
              ),
            };
          }

          if (effect.kind === "warp") {
            return {
              result: finish(
                { row: effect.row, col: effect.col, facing: facingAfterTurn },
                { warp: effect.warp, damageUid: effect.damageUid, triggers },
              ),
            };
          }

          if (effect.kind === "choose-warp") {
            return {
              result: finish(
                { row, col, facing: facingAfterTurn },
                { pendingWarp: effect.pendingWarp, triggers },
              ),
            };
          }

          throw new Error(`Unsupported onEnter effect: ${effect.kind}`);
        }
      }
    }

    return { result: null, taken };
  };

  let delta = forward;
  let chainIndex = 0; // จำนวน Spring ที่ทำงานมาแล้วในทอดนี้
  let segment = runSegment(forward, steps, true);

  // เมื่อการเดินช่วงหนึ่งจบลง ตรวจว่า Robo ลงพอดีบนช่องที่มี onLand (Spring) หรือไม่
  // ถ้ามี → ทำงาน แล้วเดินอีกช่วงไปทิศตรงข้าม จนกว่าจะไม่มี Spring ให้ทำงานต่อ
  while (segment.result === null && segment.taken > 0) {
    const field = liveObstacles();
    const here = getObstacleAt(field, row, col);
    const behavior = here ? getObstacleBehavior(here.typeId) : null;
    if (!behavior?.onLand) break;

    const effect = behavior.onLand({
      obstacle: here,
      obstacles: field,
      row,
      col,
      chainIndex,
    });
    if (!effect) break;
    if (effect.kind !== "bounce") {
      throw new Error(`Unsupported onLand effect: ${effect.kind}`);
    }

    triggerLog.push(makeTrigger(here, effect.kind));
    bounces.push({ uid: here.uid, distance: effect.distance });
    if (effect.damageUid) {
      damaged.push(effect.damageUid);
      worked.add(effect.damageUid);
    }
    if (effect.distance <= 0) break;

    delta = { row: -delta.row, col: -delta.col };
    chainIndex += 1;
    segment = runSegment(delta, effect.distance, false);
  }

  return segment.result ?? finish({ row, col, facing: facingAfterTurn });
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

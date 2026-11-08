// tests/regression.mjs — ชุดทดสอบ regression ของ movement + obstacles (รันด้วย: node tests/regression.mjs)
// ไม่ต้องติดตั้งอะไรเพิ่ม ใช้เฉพาะ node:assert และ node:crypto
//
// หลักการ: ทดสอบผ่านทางเข้าเดิม (obstacles.js, movement.js) และเทียบเฉพาะ "ฟิลด์เดิม" ของผลลัพธ์
// ดังนั้นผ่านได้ทั้งก่อนและหลัง R2 โดยไม่ต้องแก้ชุดทดสอบ
// ส่วนที่ 2 (fuzz) สร้างสถานการณ์สุ่มแบบกำหนดเมล็ด (seed) แล้วเทียบ "รหัสสรุปผล" กับค่าที่เก็บไว้
//
// ประวัติรหัสสรุปผล (GOLDEN_FUZZ):
//   10106d6279580d76 = โค้ดก่อน R2 และหลัง R2 (ยืนยันว่า R2 ไม่เปลี่ยนพฤติกรรม)
//   b14ba659e0a1c497 = หลังกติกา H6 (Hole ที่ก้าวเข้าแล้วกลับ Starting Point ชำรุดด้วย)
//                      เทียบกรณีต่อกรณีแล้ว เปลี่ยนเฉพาะผลที่ returnedToStart และเฉพาะฟิลด์ damageUid

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  applyMovementCommand,
  completeHoleWarp,
  MOVEMENT_COMMANDS,
  createRobo,
  getStartPosition,
} from "../src/game/movement/movement.js";
import {
  OBSTACLE_TYPES,
  getObstacleType,
  getDamageDuration,
  getObstaclesPerPlayer,
  dealObstacles,
  canPlaceObstacle,
  placeObstacle,
  getObstacleAt,
  isDamaged,
  damageObstacle,
  tickDamage,
  getHoleDestinations,
} from "../src/game/obstacles/obstacles.js";

// รหัสสรุปผลของโค้ดปัจจุบัน (แก้ได้เฉพาะเมื่อ OWNER อนุมัติเปลี่ยนกติกา และต้องบันทึกประวัติด้านบน)
const GOLDEN_FUZZ = "b14ba659e0a1c497";
const FUZZ_CASES = 20000;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ผ่าน  ${name}`);
  } catch (error) {
    console.log(`  ไม่ผ่าน  ${name}`);
    console.log(error.message);
    process.exitCode = 1;
  }
}

const cmd = (id) => MOVEMENT_COMMANDS.find((c) => c.id === id);
const ob = (uid, typeId, row, col, damagedTurns = 0) => ({
  uid,
  typeId,
  row,
  col,
  ownerIndex: 0,
  damagedTurns,
});

// เลือกเฉพาะฟิลด์เดิมของผลลัพธ์ (ไม่รวมฟิลด์ใหม่ที่อาจเพิ่มใน R2)
const OLD_FIELDS = [
  "robo",
  "crashed",
  "blocked",
  "blockedBy",
  "stepsTaken",
  "facingBefore",
  "facingAfterTurn",
  "warp",
  "pendingWarp",
  "returnedToStart",
  "damageUid",
];
const oldFields = (result) =>
  Object.fromEntries(OLD_FIELDS.map((key) => [key, result[key]]));

console.log("ส่วนที่ 1: ทดสอบกรณีเฉพาะ");

test("Movement: เดินปกติ / หัน / ตกแมพ", () => {
  const robo = { row: 4, col: 4, facing: "UP" };
  let r = applyMovementCommand(robo, cmd("walk-plus-plus"), 9, []);
  assert.deepEqual(r.robo, { row: 1, col: 4, facing: "UP" });
  assert.equal(r.stepsTaken, 3);
  r = applyMovementCommand(robo, cmd("turn-right-plus"), 9, []);
  assert.deepEqual(r.robo, { row: 4, col: 5, facing: "RIGHT" });
  r = applyMovementCommand(
    { row: 0, col: 4, facing: "UP" },
    cmd("walk"),
    9,
    [],
  );
  assert.equal(r.crashed, true);
  assert.deepEqual(r.robo, { row: 4, col: 4, facing: "UP" });
  r = applyMovementCommand(
    { row: 1, col: 4, facing: "UP" },
    cmd("walk-plus-plus"),
    9,
    [],
  );
  assert.equal(r.crashed, true);
  assert.equal(r.stepsTaken, 1);
});

test("Wall: หยุดก่อนถึง Wall ไม่นับ Crash ยังหันตามคำสั่ง", () => {
  const walls = [ob("w", "wall", 2, 4)];
  const r = applyMovementCommand(
    { row: 4, col: 4, facing: "UP" },
    cmd("walk-plus-plus"),
    9,
    walls,
  );
  assert.equal(r.blocked, true);
  assert.equal(r.blockedBy, "wall");
  assert.equal(r.crashed, false);
  assert.equal(r.stepsTaken, 1);
  assert.deepEqual(r.robo, { row: 3, col: 4, facing: "UP" });
});

test("Wall: ติดตั้งแต่ก้าวแรก ไม่ขยับแต่หัน", () => {
  const walls = [ob("w", "wall", 4, 5)];
  const r = applyMovementCommand(
    { row: 4, col: 4, facing: "UP" },
    cmd("turn-right-plus"),
    9,
    walls,
  );
  assert.equal(r.blocked, true);
  assert.equal(r.stepsTaken, 0);
  assert.deepEqual(r.robo, { row: 4, col: 4, facing: "RIGHT" });
});

test("Hole: 0 จุดปลายทาง กลับ Starting Point ไม่นับ Crash คงทิศ และ Hole ที่ก้าวเข้าชำรุด (H6)", () => {
  const holes = [ob("h1", "hole", 4, 6)];
  const r = applyMovementCommand(
    { row: 4, col: 4, facing: "RIGHT" },
    cmd("walk-plus-plus"),
    9,
    holes,
  );
  assert.equal(r.returnedToStart, true);
  assert.equal(r.crashed, false);
  assert.equal(r.stepsTaken, 2);
  assert.deepEqual(r.robo, { row: 4, col: 4, facing: "RIGHT" });
  assert.equal(r.damageUid, "h1");
});

test("Hole H6: ใบอื่นชำรุดหมดก็กลับ Starting Point + ชำรุดเช่นกัน แล้ว Hole ที่ชำรุดเดินผ่านได้", () => {
  const holes = [ob("h1", "hole", 4, 6), ob("h2", "hole", 0, 0, 2)];
  const r = applyMovementCommand(
    { row: 4, col: 4, facing: "RIGHT" },
    cmd("walk"),
    9,
    holes,
  );
  assert.equal(r.returnedToStart, false); // ก้าวแรกยังไม่ถึง Hole (4,6)
  const r2 = applyMovementCommand(
    { row: 4, col: 4, facing: "RIGHT" },
    cmd("walk-plus"),
    9,
    holes,
  );
  assert.equal(r2.returnedToStart, true);
  assert.equal(r2.damageUid, "h1");
  const afterDamage = damageObstacle(
    holes,
    r2.damageUid,
    getDamageDuration("hole"),
  );
  assert.equal(isDamaged(afterDamage[0]), true);
  const r3 = applyMovementCommand(
    { row: 4, col: 4, facing: "RIGHT" },
    cmd("walk-plus-plus"),
    9,
    afterDamage,
  );
  assert.deepEqual(r3.robo, { row: 4, col: 7, facing: "RIGHT" });
  assert.equal(r3.returnedToStart, false);
  assert.equal(r3.damageUid, null);
});

test("Hole: 1 จุดปลายทาง วาร์ปอัตโนมัติ คงทิศ ปลายทางชำรุด หยุดเดิน", () => {
  const holes = [ob("h1", "hole", 4, 6), ob("h2", "hole", 0, 0)];
  const r = applyMovementCommand(
    { row: 4, col: 4, facing: "RIGHT" },
    cmd("walk-plus-plus"),
    9,
    holes,
  );
  assert.deepEqual(r.robo, { row: 0, col: 0, facing: "RIGHT" });
  assert.equal(r.damageUid, "h2");
  assert.equal(r.warp.entryUid, "h1");
  assert.equal(r.warp.toUid, "h2");
  assert.equal(r.pendingWarp, null);
});

test('Hole: ลงพอดี และ "ผ่าน" ให้ผลเหมือนกัน (หยุดทันที)', () => {
  const holes = [ob("h1", "hole", 4, 5), ob("h2", "hole", 0, 0)];
  const r = applyMovementCommand(
    { row: 4, col: 4, facing: "RIGHT" },
    cmd("walk-plus-plus"),
    9,
    holes,
  );
  assert.equal(r.stepsTaken, 1);
  assert.deepEqual(r.robo, { row: 0, col: 0, facing: "RIGHT" });
});

test("Hole: 2 จุดขึ้นไป รอเลือก แล้ว completeHoleWarp", () => {
  const holes = [
    ob("h1", "hole", 4, 5),
    ob("h2", "hole", 0, 0),
    ob("h3", "hole", 8, 8),
  ];
  const r = applyMovementCommand(
    { row: 4, col: 4, facing: "RIGHT" },
    cmd("walk"),
    9,
    holes,
  );
  assert.equal(r.pendingWarp.destinations.length, 2);
  assert.deepEqual(r.robo, { row: 4, col: 5, facing: "RIGHT" });
  const done = completeHoleWarp(r.robo, r.pendingWarp, "h3");
  assert.deepEqual(done.robo, { row: 8, col: 8, facing: "RIGHT" });
  assert.equal(done.damageUid, "h3");
  assert.throws(() => completeHoleWarp(r.robo, r.pendingWarp, "h1"));
});

test("Hole ที่ชำรุดไม่ทำงาน และไม่นับเป็นปลายทาง", () => {
  const holes = [ob("h1", "hole", 4, 5, 1), ob("h2", "hole", 0, 0)];
  const r = applyMovementCommand(
    { row: 4, col: 4, facing: "RIGHT" },
    cmd("walk-plus"),
    9,
    holes,
  );
  assert.deepEqual(r.robo, { row: 4, col: 6, facing: "RIGHT" });
  const holes2 = [ob("h1", "hole", 4, 5), ob("h2", "hole", 0, 0, 2)];
  const r2 = applyMovementCommand(
    { row: 4, col: 4, facing: "RIGHT" },
    cmd("walk"),
    9,
    holes2,
  );
  assert.equal(r2.returnedToStart, true);
});

test("Hole: Robo ยืนบน Hole แล้วสั่งเดินออก ไม่ทำให้ Hole ทำงาน", () => {
  const holes = [ob("h1", "hole", 4, 5), ob("h2", "hole", 0, 0)];
  const r = applyMovementCommand(
    { row: 4, col: 5, facing: "RIGHT" },
    cmd("walk"),
    9,
    holes,
  );
  assert.deepEqual(r.robo, { row: 4, col: 6, facing: "RIGHT" });
});

test("ชนิดที่ยังไม่ทำ (Oil/Scrap ฯลฯ) ยังไม่มีผลต่อการเดิน", () => {
  const others = [
    ob("a", "oil", 3, 4),
    ob("b", "scrap", 2, 4),
    ob("c", "magnet", 1, 4),
  ];
  const r = applyMovementCommand(
    { row: 4, col: 4, facing: "UP" },
    cmd("walk-plus-plus"),
    9,
    others,
  );
  assert.deepEqual(r.robo, { row: 1, col: 4, facing: "UP" });
  assert.equal(r.stepsTaken, 3);
});

test("Obstacles: ตารางจำนวนต่อคน + โบนัสกระดาน", () => {
  const expectBase = { 2: 3, 3: 2, 4: 2, 5: 1, 6: 1 };
  for (const [players, base] of Object.entries(expectBase)) {
    assert.equal(getObstaclesPerPlayer(Number(players), 9), base);
    assert.equal(getObstaclesPerPlayer(Number(players), 11), base + 1);
    assert.equal(getObstaclesPerPlayer(Number(players), 13), base + 2);
  }
  assert.throws(() => getObstaclesPerPlayer(7, 9));
  assert.throws(() => getObstaclesPerPlayer(4, 10));
});

test("Obstacles: 14 ชนิด และตัวช่วยชนิด/ระยะชำรุด", () => {
  assert.equal(OBSTACLE_TYPES.length, 14);
  assert.equal(getObstacleType("hole").label, "The Hole");
  assert.equal(getObstacleType("nope"), null);
  const durations = {
    oil: 1,
    scrap: 1,
    hole: 1,
    magnet: 1,
    destroyer: 3,
    spring: 2,
    wall: 0,
    booster: 0,
  };
  for (const [id, d] of Object.entries(durations))
    assert.equal(getDamageDuration(id), d);
});

test("Obstacles: แจก (ใช้ randomFn คงที่) และ uid ไม่ซ้ำ", () => {
  const hands = dealObstacles(
    2,
    9,
    (() => {
      let n = 0;
      return () => (n++ < 3 ? 0.25 : 0);
    })(),
  );
  assert.equal(hands.length, 2);
  assert.deepEqual(
    hands[0].map((o) => o.typeId),
    ["hole", "hole", "hole"],
  );
  assert.deepEqual(
    hands[1].map((o) => o.typeId),
    ["wall", "wall", "wall"],
  );
  const uids = hands.flat().map((o) => o.uid);
  assert.equal(new Set(uids).size, uids.length);
});

test("Obstacles: ข้อห้ามวาง (Start / Locked Zone / ทับ / นอกกระดาน)", () => {
  assert.equal(canPlaceObstacle(4, 4, 9, []).reason, "START");
  assert.equal(canPlaceObstacle(3, 3, 9, []).reason, "LOCKED_ZONE");
  assert.equal(canPlaceObstacle(5, 5, 9, []).reason, "LOCKED_ZONE");
  assert.equal(canPlaceObstacle(-1, 0, 9, []).reason, "OUT_OF_BOARD");
  assert.equal(canPlaceObstacle(9, 0, 9, []).reason, "OUT_OF_BOARD");
  assert.equal(canPlaceObstacle(2, 2, 9, []).ok, true);
  const placed = placeObstacle([], { uid: "x", typeId: "wall" }, 0, 0, 9, 1);
  assert.equal(placed.ok, true);
  assert.deepEqual(placed.placed[0], {
    uid: "x",
    typeId: "wall",
    row: 0,
    col: 0,
    ownerIndex: 1,
    damagedTurns: 0,
  });
  assert.equal(canPlaceObstacle(0, 0, 9, placed.placed).reason, "OCCUPIED");
  assert.equal(
    placeObstacle([], { uid: "y", typeId: "nope" }, 0, 0, 9, 0).reason,
    "UNKNOWN_TYPE",
  );
  assert.equal(getObstacleAt(placed.placed, 0, 0).uid, "x");
  assert.equal(getObstacleAt(placed.placed, 1, 1), null);
});

test("ชำรุด: damage / ไม่ลดระยะที่เหลือ / tick / getHoleDestinations", () => {
  let list = [
    ob("h1", "hole", 0, 0),
    ob("h2", "hole", 0, 1),
    ob("w", "wall", 1, 1),
  ];
  list = damageObstacle(list, "h2", 3);
  assert.equal(isDamaged(list[1]), true);
  list = damageObstacle(list, "h2", 1);
  assert.equal(list[1].damagedTurns, 3);
  assert.deepEqual(
    getHoleDestinations(list, "h1").map((o) => o.uid),
    [],
  );
  list = tickDamage(tickDamage(tickDamage(list)));
  assert.equal(list[1].damagedTurns, 0);
  assert.deepEqual(
    getHoleDestinations(list, "h1").map((o) => o.uid),
    ["h2"],
  );
  assert.equal(list[2].damagedTurns, 0);
});

console.log("\nส่วนที่ 2: Fuzz เทียบรหัสสรุปผลกับค่าที่เก็บไว้");

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runFuzz() {
  const rng = makeRng(20261107);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const hash = createHash("sha256");
  const typeIds = OBSTACLE_TYPES.map((t) => t.id);
  const weighted = [
    "wall",
    "wall",
    "wall",
    "wall",
    "hole",
    "hole",
    "hole",
    "hole",
    "hole",
    "hole",
    "hole",
    ...typeIds,
  ];
  let pendingCount = 0;
  let warpCount = 0;
  let blockedCount = 0;

  for (let i = 0; i < FUZZ_CASES; i += 1) {
    const boardSize = pick([9, 11, 13]);
    const start = getStartPosition(boardSize);
    const robo =
      rng() < 0.3
        ? createRobo(boardSize, pick(["UP", "RIGHT", "DOWN", "LEFT"]))
        : {
            row: Math.floor(rng() * boardSize),
            col: Math.floor(rng() * boardSize),
            facing: pick(["UP", "RIGHT", "DOWN", "LEFT"]),
          };
    // วาง Obstacle ส่วนใหญ่ใกล้ Robo (ไม่เกิน 3 ช่อง) เพื่อให้เกิด Wall/Hole บ่อย
    const count = 2 + Math.floor(rng() * 10);
    const placed = [];
    for (let k = 0; k < count; k += 1) {
      const near = rng() < 0.75;
      const row = near
        ? Math.min(
            boardSize - 1,
            Math.max(0, robo.row + Math.floor(rng() * 7) - 3),
          )
        : Math.floor(rng() * boardSize);
      const col = near
        ? Math.min(
            boardSize - 1,
            Math.max(0, robo.col + Math.floor(rng() * 7) - 3),
          )
        : Math.floor(rng() * boardSize);
      const typeId = pick(weighted);
      const result = placeObstacle(
        placed,
        { uid: `u${k}`, typeId },
        row,
        col,
        boardSize,
        0,
      );
      if (result.ok) {
        placed.length = 0;
        placed.push(...result.placed);
        if (rng() < 0.25) {
          const damaged = damageObstacle(
            placed,
            `u${k}`,
            1 + Math.floor(rng() * 3),
          );
          placed.length = 0;
          placed.push(...damaged);
        }
      }
    }
    const command = pick(MOVEMENT_COMMANDS);
    const before = JSON.stringify(placed);
    const result = applyMovementCommand(robo, command, boardSize, placed);
    assert.equal(
      JSON.stringify(placed),
      before,
      "ห้ามแก้อาร์เรย์ obstacles เดิม",
    );
    const record = {
      boardSize,
      start,
      robo,
      command: command.id,
      placed,
      result: oldFields(result),
    };

    if (result.pendingWarp) {
      pendingCount += 1;
      const dest = pick(result.pendingWarp.destinations);
      const done = completeHoleWarp(result.robo, result.pendingWarp, dest.uid);
      record.done = done;
    }
    if (result.warp) warpCount += 1;
    if (result.blocked) blockedCount += 1;
    hash.update(JSON.stringify(record));
  }

  // ฟังก์ชันด้านแจก/วาง/ชำรุดก็รวมในรหัสด้วย
  for (const players of [2, 3, 4, 5, 6]) {
    for (const size of [9, 11, 13]) {
      hash.update(
        JSON.stringify(
          dealObstacles(players, size, makeRng(players * 100 + size)),
        ),
      );
    }
  }
  return {
    digest: hash.digest("hex").slice(0, 16),
    pendingCount,
    warpCount,
    blockedCount,
  };
}

const fuzz = runFuzz();
console.log(
  `  กรณีสุ่ม ${FUZZ_CASES} | รอเลือกปลายทาง ${fuzz.pendingCount} | วาร์ปอัตโนมัติ ${fuzz.warpCount} | ติด Wall ${fuzz.blockedCount}`,
);
console.log(`  รหัสสรุปผล: ${fuzz.digest}`);
if (GOLDEN_FUZZ === "__GOLDEN__") {
  console.log("  (ยังไม่ได้ตั้งค่า GOLDEN_FUZZ)");
} else {
  test("Fuzz: รหัสสรุปผลตรงกับค่าที่เก็บไว้", () => {
    assert.equal(fuzz.digest, GOLDEN_FUZZ);
  });
}

console.log(
  `\nผ่านทั้งหมด ${passed} รายการ${process.exitCode ? " (มีรายการที่ไม่ผ่าน)" : ""}`,
);

// tests/triggers.mjs — ทดสอบฟิลด์ triggers ของ applyMovementCommand (รันด้วย: node tests/triggers.mjs)
// triggers = รายการ Obstacle ที่ "ทำงาน" ระหว่างคำสั่งหนึ่งคำสั่ง: [{ uid, typeId, effect }]
// ไว้ให้ Secret Mission ใน M6 นับครั้ง (เช่น Wall Bumper) โดยไม่ต้องแก้ลูปเดินอีก
// ชุดนี้เทียบเฉพาะรูปแบบและความสอดคล้องของ triggers ไม่เกี่ยวกับกติกาการเดิน (อยู่ใน regression.mjs)
// effect ที่มีตอนนี้: block (Wall), extend (Oil), stop (Scrap), return-to-start / warp / choose-warp (Hole)
// Oil ไม่หยุด Robo จึงมีได้หลายรายการต่อคำสั่ง (ตามลำดับ) แล้วตามด้วยผลที่หยุด Robo ได้อีกไม่เกิน 1 รายการ

import assert from "node:assert/strict";
import {
  applyMovementCommand,
  MOVEMENT_COMMANDS,
  createRobo,
} from "../src/game/movement/movement.js";
import {
  OBSTACLE_TYPES,
  placeObstacle,
  damageObstacle,
} from "../src/game/obstacles/obstacles.js";

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
  uid, typeId, row, col, ownerIndex: 0, damagedTurns,
});
const run = (robo, commandId, obstacles) =>
  applyMovementCommand(robo, cmd(commandId), 9, obstacles);
const right = { row: 4, col: 4, facing: "RIGHT" };

console.log("ส่วนที่ 1: รูปแบบของ triggers");

test("ไม่มี Obstacle / เดินปกติ / ตกแมพ → triggers ว่าง", () => {
  assert.deepEqual(run({ row: 4, col: 4, facing: "UP" }, "walk", []).triggers, []);
  assert.deepEqual(run({ row: 0, col: 4, facing: "UP" }, "walk", []).triggers, []);
});

test("Wall: บันทึก block (ทั้งกรณีหยุดกลางทางและติดตั้งแต่ก้าวแรก)", () => {
  const walls = [ob("w", "wall", 2, 4)];
  const r = run({ row: 4, col: 4, facing: "UP" }, "walk-plus-plus", walls);
  assert.deepEqual(r.triggers, [{ uid: "w", typeId: "wall", effect: "block" }]);
  const r2 = run({ row: 4, col: 4, facing: "UP" }, "turn-right-plus", [ob("w2", "wall", 4, 5)]);
  assert.equal(r2.stepsTaken, 0);
  assert.deepEqual(r2.triggers, [{ uid: "w2", typeId: "wall", effect: "block" }]);
});

test("Hole 0 จุด: return-to-start (และชำรุดตามกติกา H6)", () => {
  const r = run(right, "walk", [ob("h1", "hole", 4, 5)]);
  assert.deepEqual(r.triggers, [{ uid: "h1", typeId: "hole", effect: "return-to-start" }]);
  assert.equal(r.damageUid, "h1");
});

test("Hole 1 จุด: warp", () => {
  const r = run(right, "walk", [ob("h1", "hole", 4, 5), ob("h2", "hole", 0, 0)]);
  assert.deepEqual(r.triggers, [{ uid: "h1", typeId: "hole", effect: "warp" }]);
});

test("Hole 2 จุดขึ้นไป: choose-warp", () => {
  const holes = [ob("h1", "hole", 4, 5), ob("h2", "hole", 0, 0), ob("h3", "hole", 8, 8)];
  const r = run(right, "walk", holes);
  assert.deepEqual(r.triggers, [{ uid: "h1", typeId: "hole", effect: "choose-warp" }]);
});

test("Oil: extend (ไม่หยุด) และชำรุดทันที", () => {
  const r = run({ row: 4, col: 4, facing: "UP" }, "walk", [ob("o", "oil", 3, 4)]);
  assert.deepEqual(r.triggers, [{ uid: "o", typeId: "oil", effect: "extend" }]);
  assert.equal(r.damageUid, "o");
  assert.equal(r.extraSteps, 1);
});

test("Oil ติดกัน: extend หลายรายการตามลำดับ / Oil แล้วต่อด้วยผลที่หยุด Robo", () => {
  const chain = run({ row: 4, col: 4, facing: "UP" }, "walk", [ob("o1", "oil", 3, 4), ob("o2", "oil", 2, 4)]);
  assert.deepEqual(chain.triggers, [
    { uid: "o1", typeId: "oil", effect: "extend" },
    { uid: "o2", typeId: "oil", effect: "extend" },
  ]);
  const thenWall = run({ row: 4, col: 4, facing: "UP" }, "walk", [ob("o", "oil", 3, 4), ob("w", "wall", 2, 4)]);
  assert.deepEqual(thenWall.triggers, [
    { uid: "o", typeId: "oil", effect: "extend" },
    { uid: "w", typeId: "wall", effect: "block" },
  ]);
});

test("Oil ที่ชำรุด / ยืนบน Oil แล้วเดินออก → ไม่นับว่าทำงาน", () => {
  assert.deepEqual(run({ row: 4, col: 4, facing: "UP" }, "walk", [ob("o", "oil", 3, 4, 1)]).triggers, []);
  assert.deepEqual(run({ row: 3, col: 4, facing: "UP" }, "walk", [ob("o", "oil", 3, 4)]).triggers, []);
});

test("Scrap: stop (ทั้งกลางทางและก้าวสุดท้าย) และชำรุดทันที", () => {
  const r = run({ row: 4, col: 4, facing: "UP" }, "walk-plus-plus", [ob("s", "scrap", 3, 4)]);
  assert.deepEqual(r.triggers, [{ uid: "s", typeId: "scrap", effect: "stop" }]);
  assert.equal(r.damageUid, "s");
  const r2 = run({ row: 4, col: 4, facing: "UP" }, "walk-plus", [ob("s2", "scrap", 2, 4)]);
  assert.deepEqual(r2.triggers, [{ uid: "s2", typeId: "scrap", effect: "stop" }]);
});

test("Scrap ที่ชำรุด / ยืนบน Scrap แล้วเดินออก → ไม่นับว่าทำงาน", () => {
  assert.deepEqual(run({ row: 4, col: 4, facing: "UP" }, "walk", [ob("s", "scrap", 3, 4, 1)]).triggers, []);
  assert.deepEqual(run({ row: 3, col: 4, facing: "UP" }, "walk", [ob("s", "scrap", 3, 4)]).triggers, []);
});

test("Hole ที่ชำรุด / ยืนบน Hole แล้วเดินออก / ชนิดที่ยังไม่ทำ → ไม่นับว่าทำงาน", () => {
  assert.deepEqual(run(right, "walk-plus", [ob("h1", "hole", 4, 5, 1), ob("h2", "hole", 0, 0)]).triggers, []);
  assert.deepEqual(
    run({ row: 4, col: 5, facing: "RIGHT" }, "walk", [ob("h1", "hole", 4, 5), ob("h2", "hole", 0, 0)]).triggers,
    [],
  );
  const others = [ob("a", "magnet", 4, 5), ob("b", "spring", 4, 6), ob("c", "destroyer", 4, 7)];
  assert.deepEqual(run(right, "walk-plus-plus", others).triggers, []);
});

test("ผลลัพธ์เป็นอาร์เรย์ใหม่ทุกครั้ง (ไม่ใช้ร่วมกันระหว่างคำสั่ง)", () => {
  const a = run(right, "walk", []);
  const b = run(right, "walk", []);
  assert.notEqual(a.triggers, b.triggers);
});

console.log("\nส่วนที่ 2: ความสอดคล้องกับผลอื่น (สุ่ม 20000 กรณี)");

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

test("triggers สอดคล้องกับ extraSteps / blocked / returnedToStart / warp / pendingWarp / stoppedBy ทุกกรณี", () => {
  const rng = makeRng(424242);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const typeIds = OBSTACLE_TYPES.map((t) => t.id);
  const weighted = [
    "wall", "wall", "wall", "scrap", "scrap", "scrap",
    "oil", "oil", "oil", "oil", "oil", "oil",
    "hole", "hole", "hole", "hole", "hole", ...typeIds,
  ];
  const seen = {
    block: 0, stop: 0, "return-to-start": 0, warp: 0, "choose-warp": 0,
    extend: 0, chain: 0, none: 0,
  };

  for (let i = 0; i < 20000; i += 1) {
    const size = pick([9, 11, 13]);
    const robo =
      rng() < 0.3
        ? createRobo(size, pick(["UP", "RIGHT", "DOWN", "LEFT"]))
        : {
            row: Math.floor(rng() * size),
            col: Math.floor(rng() * size),
            facing: pick(["UP", "RIGHT", "DOWN", "LEFT"]),
          };
    let placed = [];
    const count = 2 + Math.floor(rng() * 10);
    for (let k = 0; k < count; k += 1) {
      const near = rng() < 0.75;
      const offset = () => Math.floor(rng() * 7) - 3;
      const row = near ? Math.min(size - 1, Math.max(0, robo.row + offset())) : Math.floor(rng() * size);
      const col = near ? Math.min(size - 1, Math.max(0, robo.col + offset())) : Math.floor(rng() * size);
      const result = placeObstacle(placed, { uid: `u${k}`, typeId: pick(weighted) }, row, col, size, 0);
      if (result.ok) {
        placed = result.placed;
        if (rng() < 0.25) placed = damageObstacle(placed, `u${k}`, 1 + Math.floor(rng() * 3));
      }
    }

    // บางกรณีวาง Oil เรียงเป็นแถว 2–3 อันจาก Robo ในทิศสุ่ม เพื่อให้เกิด Oil ติดกันบ่อยพอจะทดสอบได้
    if (rng() < 0.35) {
      const [dr, dc] = pick([[-1, 0], [1, 0], [0, -1], [0, 1]]);
      const len = 2 + Math.floor(rng() * 2);
      for (let k = 1; k <= len; k += 1) {
        const result = placeObstacle(placed, { uid: `line${k}`, typeId: "oil" }, robo.row + dr * k, robo.col + dc * k, size, 0);
        if (result.ok) placed = result.placed;
      }
    }

    const r = applyMovementCommand(robo, pick(MOVEMENT_COMMANDS), size, placed);

    // Oil (extend) ไม่หยุด Robo: มีได้หลายรายการ จำนวนต้องเท่ากับ extraSteps และอยู่ก่อนผลที่หยุด
    const extendTriggers = r.triggers.filter((t) => t.effect === "extend");
    const terminal = r.triggers.filter((t) => t.effect !== "extend");
    assert.equal(extendTriggers.length, r.extraSteps);
    assert.ok(terminal.length <= 1, "ผลที่หยุด Robo มีได้ไม่เกิน 1 รายการ");
    if (terminal.length === 1) {
      assert.equal(r.triggers[r.triggers.length - 1], terminal[0], "ผลที่หยุดต้องอยู่ท้ายสุด");
    }
    for (const trigger of extendTriggers) assert.equal(trigger.typeId, "oil");

    const expected = r.blocked
      ? "block"
      : r.returnedToStart
        ? "return-to-start"
        : r.warp
          ? "warp"
          : r.pendingWarp
            ? "choose-warp"
            : r.stoppedBy
              ? "stop"
              : null;

    if (expected === null) {
      assert.equal(terminal.length, 0);
    } else {
      assert.equal(terminal.length, 1);
      assert.equal(terminal[0].effect, expected);
      seen[expected] += 1;
    }

    // ทุก trigger ต้องอ้างถึง Obstacle ที่มีอยู่บนกระดานจริงและชนิดตรงกัน
    for (const trigger of r.triggers) {
      const source = placed.find((item) => item.uid === trigger.uid);
      assert.ok(source, "uid ใน triggers ต้องมีอยู่บนกระดาน");
      assert.equal(source.typeId, trigger.typeId);
    }

    // damageUid ต้องเป็นตัวสุดท้ายของ damageUids และ Oil ทุกอันที่ทำงานต้องอยู่ใน damageUids
    assert.equal(r.damageUid, r.damageUids.length > 0 ? r.damageUids[r.damageUids.length - 1] : null);
    for (const trigger of extendTriggers) assert.ok(r.damageUids.includes(trigger.uid));

    if (r.triggers.length === 0) seen.none += 1;
    if (extendTriggers.length >= 1) seen.extend += 1;
    if (extendTriggers.length >= 2) seen.chain += 1;
  }

  // กันกรณีสุ่มแล้วไม่ครอบคลุม: ทุกผลต้องเกิดหลายครั้ง
  for (const key of ["block", "stop", "return-to-start", "warp", "choose-warp", "extend"]) {
    assert.ok(seen[key] > 50, `ผล ${key} เกิดน้อยเกินไป (${seen[key]})`);
  }
  assert.ok(seen.chain > 100, `Oil ติดกันเกิดน้อยเกินไป (${seen.chain})`);
  console.log(`    ครอบคลุม: block ${seen.block} | stop ${seen.stop} | return-to-start ${seen["return-to-start"]} | warp ${seen.warp} | choose-warp ${seen["choose-warp"]} | oil ${seen.extend} (ติดกัน ${seen.chain}) | ไม่มี ${seen.none}`);
});

console.log(`\nผ่านทั้งหมด ${passed} รายการ${process.exitCode ? " (มีรายการที่ไม่ผ่าน)" : ""}`);
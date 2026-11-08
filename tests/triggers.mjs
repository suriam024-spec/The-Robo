// tests/triggers.mjs — ทดสอบฟิลด์ triggers ของ applyMovementCommand (รันด้วย: node tests/triggers.mjs)
// triggers = รายการ Obstacle ที่ "ทำงาน" ระหว่างคำสั่งหนึ่งคำสั่ง: [{ uid, typeId, effect }]
// ไว้ให้ Secret Mission ใน M6 นับครั้ง (เช่น Wall Bumper) โดยไม่ต้องแก้ลูปเดินอีก
// ชุดนี้เทียบเฉพาะรูปแบบและความสอดคล้องของ triggers ไม่เกี่ยวกับกติกาการเดิน (อยู่ใน regression.mjs)

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

test("Hole ที่ชำรุด / ยืนบน Hole แล้วเดินออก / ชนิดที่ยังไม่ทำ → ไม่นับว่าทำงาน", () => {
  assert.deepEqual(run(right, "walk-plus", [ob("h1", "hole", 4, 5, 1), ob("h2", "hole", 0, 0)]).triggers, []);
  assert.deepEqual(
    run({ row: 4, col: 5, facing: "RIGHT" }, "walk", [ob("h1", "hole", 4, 5), ob("h2", "hole", 0, 0)]).triggers,
    [],
  );
  const others = [ob("a", "oil", 4, 5), ob("b", "scrap", 4, 6), ob("c", "destroyer", 4, 7)];
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

test("triggers สอดคล้องกับ blocked / returnedToStart / warp / pendingWarp ทุกกรณี", () => {
  const rng = makeRng(424242);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const typeIds = OBSTACLE_TYPES.map((t) => t.id);
  const weighted = ["wall", "wall", "wall", "hole", "hole", "hole", "hole", "hole", ...typeIds];
  const seen = { block: 0, "return-to-start": 0, warp: 0, "choose-warp": 0, none: 0 };

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

    const r = applyMovementCommand(robo, pick(MOVEMENT_COMMANDS), size, placed);
    assert.ok(r.triggers.length <= 1, "หนึ่งคำสั่งทำให้ Obstacle ทำงานได้ไม่เกิน 1 ใบ (เพราะหยุดทันที)");

    const expected = r.blocked
      ? "block"
      : r.returnedToStart
        ? "return-to-start"
        : r.warp
          ? "warp"
          : r.pendingWarp
            ? "choose-warp"
            : null;

    if (expected === null) {
      assert.deepEqual(r.triggers, []);
      seen.none += 1;
      continue;
    }
    assert.equal(r.triggers.length, 1);
    assert.equal(r.triggers[0].effect, expected);
    const source = placed.find((item) => item.uid === r.triggers[0].uid);
    assert.ok(source, "uid ใน triggers ต้องมีอยู่บนกระดาน");
    assert.equal(source.typeId, r.triggers[0].typeId);
    seen[expected] += 1;
  }

  // กันกรณีสุ่มแล้วไม่ครอบคลุม: ทุกผลต้องเกิดอย่างน้อยหลายครั้ง
  for (const key of ["block", "return-to-start", "warp", "choose-warp"]) {
    assert.ok(seen[key] > 50, `ผล ${key} เกิดน้อยเกินไป (${seen[key]})`);
  }
  console.log(`    ครอบคลุม: block ${seen.block} | return-to-start ${seen["return-to-start"]} | warp ${seen.warp} | choose-warp ${seen["choose-warp"]} | ไม่มี ${seen.none}`);
});

console.log(`\nผ่านทั้งหมด ${passed} รายการ${process.exitCode ? " (มีรายการที่ไม่ผ่าน)" : ""}`);
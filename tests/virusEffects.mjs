// tests/virusEffects.mjs — ทดสอบ M4.3 กลุ่ม 1: Virus WITH "ปรับการเดิน" (ขาหัก / ขาหัก+ / ย้อนรอย / กระโดด)
// (รันด้วย: node tests/virusEffects.mjs)
// กติกา (OWNER ตัดสิน Q1–Q5): ดูหัวไฟล์ src/game/viruses/withModifiers.js และข้อความ "reverse / jump" ใน src/game/movement/movement.js
//   · ขาหัก ลดระยะเดินบนการ์ด 1 / ขาหัก+ ลด 2 ไม่ต่ำกว่า 0 (เหลือ 0 ไม่เดินแต่ยังหัน) การ์ดที่ไม่มีการเดินไม่มีผล
//   · ย้อนรอย หันซ้าย↔ขวา เดินหน้า↔ถอยหลัง (ทิศหันคงเดิม) Turn Around ไม่เปลี่ยน
//   · กระโดด ก้าวละ 2 ช่อง ช่องที่ข้ามไม่ทำงาน/Wall ไม่ขวาง ช่องที่ลงทำงานปกติ ลง Wall = หยุดที่ช่องที่ข้าม
//   · Virus ทำงานหลัง Movement ของผู้ใช้ → ผลไปติดกับ Movement ใบถัดไปที่ถูกเล่น
// ส่วนที่ 2-3: "ผู้ตรวจอิสระ" เขียนแยกจากโค้ดเกม
//   ถอยหลัง: เทียบกับ "เดินหน้าในกระจก" (หมุน Robo กลับหลังแล้วเดินหน้า) บนเอนจินเดิม ทุกชนิด Obstacle
//   กระโดด: ตัวจำลองกติกาเขียนใหม่ในไฟล์นี้ (Wall / Scrap / Oil / Destroyer) + กรณีที่คำนวณด้วยมือรวม Hole / Spring / Magnet
// ไฟล์นี้ไม่แตะไฟล์ทดสอบที่ล็อก

import assert from "node:assert/strict";
import {
  FACINGS,
  MOVEMENT_COMMANDS,
  applyMovementCommand,
  finishHoleWarp,
  turnFacing,
} from "../src/game/movement/movement.js";
import {
  MOVEMENT_MODIFIER_IDS,
  applyMovementModifier,
  applyVirusModifiers,
  isMovementModifier,
  playMovementWithVirus,
} from "../src/game/viruses/withModifiers.js";

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

const ob = (typeId, row, col, damagedTurns = 0) => ({
  uid: `${typeId}-${row}-${col}`,
  typeId,
  row,
  col,
  ownerIndex: 0,
  damagedTurns,
});
const cmdOf = (id) => MOVEMENT_COMMANDS.find((c) => c.id === id);
const OPPOSITE = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
const run = (robo, command, obstacles = [], size = 9) =>
  applyMovementCommand(robo, command, size, obstacles);
const at = (r) => [r.robo.row, r.robo.col, r.robo.facing];

// ---------------------------------------------------------------------------
// ตารางผลที่ผู้ตรวจเขียนซ้ำเองตามคำตอบ Q2–Q4: id → [turn, steps, reverse, jump]
// ---------------------------------------------------------------------------
const BASE = {
  walk: ["NONE", 1],
  "walk-plus": ["NONE", 2],
  "walk-plus-plus": ["NONE", 3],
  "turn-left": ["LEFT", 0],
  "turn-left-plus": ["LEFT", 1],
  "turn-left-plus-plus": ["LEFT", 2],
  "turn-right": ["RIGHT", 0],
  "turn-right-plus": ["RIGHT", 1],
  "turn-right-plus-plus": ["RIGHT", 2],
  "turn-around": ["AROUND", 0],
};
const EXPECT = {
  "broken-leg": {
    walk: ["NONE", 0, false, false],
    "walk-plus": ["NONE", 1, false, false],
    "walk-plus-plus": ["NONE", 2, false, false],
    "turn-left": ["LEFT", 0, false, false],
    "turn-left-plus": ["LEFT", 0, false, false],
    "turn-left-plus-plus": ["LEFT", 1, false, false],
    "turn-right": ["RIGHT", 0, false, false],
    "turn-right-plus": ["RIGHT", 0, false, false],
    "turn-right-plus-plus": ["RIGHT", 1, false, false],
    "turn-around": ["AROUND", 0, false, false],
  },
  "broken-leg-plus": {
    walk: ["NONE", 0, false, false],
    "walk-plus": ["NONE", 0, false, false],
    "walk-plus-plus": ["NONE", 1, false, false],
    "turn-left": ["LEFT", 0, false, false],
    "turn-left-plus": ["LEFT", 0, false, false],
    "turn-left-plus-plus": ["LEFT", 0, false, false],
    "turn-right": ["RIGHT", 0, false, false],
    "turn-right-plus": ["RIGHT", 0, false, false],
    "turn-right-plus-plus": ["RIGHT", 0, false, false],
    "turn-around": ["AROUND", 0, false, false],
  },
  backtrack: {
    walk: ["NONE", 1, true, false],
    "walk-plus": ["NONE", 2, true, false],
    "walk-plus-plus": ["NONE", 3, true, false],
    "turn-left": ["RIGHT", 0, false, false],
    "turn-left-plus": ["RIGHT", 1, true, false],
    "turn-left-plus-plus": ["RIGHT", 2, true, false],
    "turn-right": ["LEFT", 0, false, false],
    "turn-right-plus": ["LEFT", 1, true, false],
    "turn-right-plus-plus": ["LEFT", 2, true, false],
    "turn-around": ["AROUND", 0, false, false],
  },
  jump: {
    walk: ["NONE", 1, false, true],
    "walk-plus": ["NONE", 2, false, true],
    "walk-plus-plus": ["NONE", 3, false, true],
    "turn-left": ["LEFT", 0, false, false],
    "turn-left-plus": ["LEFT", 1, false, true],
    "turn-left-plus-plus": ["LEFT", 2, false, true],
    "turn-right": ["RIGHT", 0, false, false],
    "turn-right-plus": ["RIGHT", 1, false, true],
    "turn-right-plus-plus": ["RIGHT", 2, false, true],
    "turn-around": ["AROUND", 0, false, false],
  },
};
const shape = (c) => [c.turn, c.steps, c.reverse === true, c.jump === true];

console.log("ส่วนที่ 1: ทดสอบกรณีเฉพาะ");

test("ตารางผล: Virus 4 ใบ x การ์ด Movement 10 ใบ = 40 กรณี ตรงกับตารางที่ผู้ตรวจเขียนจากคำตอบ Q2–Q4", () => {
  let n = 0;
  for (const virus of MOVEMENT_MODIFIER_IDS) {
    for (const command of MOVEMENT_COMMANDS) {
      const out = applyMovementModifier(command, virus);
      assert.deepEqual(
        shape(out.command),
        EXPECT[virus][command.id],
        `${virus} + ${command.id}`,
      );
      // ช่องที่ไม่ใช่ turn/steps/reverse/jump ต้องคงเดิม
      assert.equal(out.command.id, command.id);
      assert.equal(out.command.label, command.label);
      // changed ต้องตรงกับ "ผลต่างจากเดิมจริง"
      const before = [command.turn, command.steps, false, false];
      const differs =
        JSON.stringify(before) !== JSON.stringify(EXPECT[virus][command.id]);
      assert.equal(
        out.changed,
        differs,
        `changed ของ ${virus} + ${command.id}`,
      );
      n += 1;
    }
  }
  assert.equal(n, 40);
});

test("ขาหัก: ไม่ติดลบ / เหลือ 0 ยังหันตามเดิม (Turn Left+ + ขาหัก = หันซ้ายอย่างเดียว) / ไม่แก้คำสั่งเดิม", () => {
  const original = cmdOf("turn-left-plus");
  const snapshot = JSON.stringify(original);
  const out = applyVirusModifiers(original, ["broken-leg"]);
  assert.deepEqual(shape(out.command), ["LEFT", 0, false, false]);
  assert.equal(JSON.stringify(original), snapshot);
  assert.notEqual(out.command, original);
  // ลดเกินระยะ: Walk (1) ด้วยขาหัก+ (2) = 0 ไม่ใช่ -1
  assert.equal(
    applyVirusModifiers(cmdOf("walk"), ["broken-leg-plus"]).command.steps,
    0,
  );
  // ผลของการเดิน 0 ก้าว = Robo อยู่ที่เดิม
  const moved = run(
    { row: 4, col: 4, facing: "RIGHT" },
    applyVirusModifiers(cmdOf("walk"), ["broken-leg"]).command,
  );
  assert.deepEqual(at(moved), [4, 4, "RIGHT"]);
  assert.equal(moved.stepsTaken, 0);
  // Turn Left+ + ขาหัก: หันซ้ายอย่างเดียว
  const turnOnly = run(
    { row: 4, col: 4, facing: "RIGHT" },
    applyVirusModifiers(cmdOf("turn-left-plus"), ["broken-leg"]).command,
  );
  assert.deepEqual(at(turnOnly), [4, 4, "UP"]);
});

test("Virus หลายใบพร้อมกัน: ลำดับไม่มีผล (ลองทุกลำดับ 0–4 ใบ x 10 การ์ด = 3,410 กรณี) ตรงกับสูตรปิดที่ผู้ตรวจเขียน", () => {
  let cases = 0;
  const walk = (prefix, depth, visit) => {
    visit(prefix);
    if (depth === 0) return;
    for (const id of MOVEMENT_MODIFIER_IDS)
      walk([...prefix, id], depth - 1, visit);
  };
  walk([], 4, (seq) => {
    for (const command of MOVEMENT_COMMANDS) {
      const [turn0, steps0] = BASE[command.id];
      const reduce =
        seq.filter((v) => v === "broken-leg").length +
        2 * seq.filter((v) => v === "broken-leg-plus").length;
      const backs = seq.filter((v) => v === "backtrack").length;
      const jumps = seq.filter((v) => v === "jump").length;
      const steps = Math.max(0, steps0 - reduce);
      const turn =
        backs % 2 === 1
          ? { NONE: "NONE", LEFT: "RIGHT", RIGHT: "LEFT", AROUND: "AROUND" }[
              turn0
            ]
          : turn0;
      const expected = [
        turn,
        steps,
        backs % 2 === 1 && steps > 0,
        jumps >= 1 && steps > 0,
      ];
      const out = applyVirusModifiers(command, seq);
      assert.deepEqual(
        shape(out.command),
        expected,
        `${seq.join("+") || "(ไม่มี)"} กับ ${command.id}`,
      );
      assert.equal(out.applied.length, seq.length);
      cases += 1;
    }
  });
  assert.equal(cases, 3410);
});

test("ย้อนรอย 2 ใบ = กลับด้านสองครั้ง = เหมือนเดิม / รายงาน applied ต่อใบ (มีผลหรือไม่)", () => {
  const out = applyVirusModifiers(cmdOf("turn-left-plus"), [
    "backtrack",
    "backtrack",
  ]);
  assert.deepEqual(shape(out.command), ["LEFT", 1, false, false]);
  const r = applyVirusModifiers(cmdOf("turn-around"), [
    "backtrack",
    "jump",
    "broken-leg",
  ]);
  assert.deepEqual(
    r.applied.map((a) => [a.typeId, a.changed]),
    [
      ["backtrack", false],
      ["jump", false],
      ["broken-leg", false],
    ],
  );
  assert.deepEqual(
    r.applied.map((a) => a.label),
    ["ย้อนรอย", "กระโดด", "ขาหัก"],
  );
  const r2 = applyVirusModifiers(cmdOf("walk"), ["broken-leg", "jump"]); // เหลือ 0 แล้วกระโดดไม่มีผล
  assert.deepEqual(
    r2.applied.map((a) => a.changed),
    [true, false],
  );
  assert.deepEqual(shape(r2.command), ["NONE", 0, false, false]);
});

test("ไม่ใช่ Virus กลุ่มนี้ → throw / isMovementModifier ตรงกับ 4 ใบ", () => {
  assert.throws(() => applyMovementModifier(cmdOf("walk"), "anti-virus"));
  assert.throws(() => applyVirusModifiers(cmdOf("walk"), ["mega-virus"]));
  assert.throws(() =>
    playMovementWithVirus([], cmdOf("walk"), { uid: "x", typeId: "genius" }, 0),
  );
  assert.deepEqual(MOVEMENT_MODIFIER_IDS, [
    "broken-leg",
    "broken-leg-plus",
    "backtrack",
    "jump",
  ]);
  for (const id of MOVEMENT_MODIFIER_IDS)
    assert.equal(isMovementModifier(id), true);
  for (const id of ["anti-virus", "genius", "i-take", "", undefined])
    assert.equal(isMovementModifier(id), false);
});

test("คิว Virus (Q1): Virus ทำงานหลัง Movement ของผู้ใช้ → ไปติด Movement ใบถัดไป ใบเดียว แล้วหมด", () => {
  const walkpp = cmdOf("walk-plus-plus");
  let r = playMovementWithVirus(
    [],
    walkpp,
    { uid: "v1", typeId: "broken-leg" },
    0,
  );
  assert.deepEqual(
    shape(r.command),
    ["NONE", 3, false, false],
    "Movement ของผู้ใช้เองไม่โดน Virus ของตัวเอง",
  );
  assert.deepEqual(r.applied, []);
  assert.deepEqual(r.pending, [
    { uid: "v1", typeId: "broken-leg", ownerIndex: 0 },
  ]);
  r = playMovementWithVirus(r.pending, walkpp, null, 1);
  assert.deepEqual(
    shape(r.command),
    ["NONE", 2, false, false],
    "ผู้เล่นถัดไปโดนขาหัก",
  );
  assert.deepEqual(
    r.applied.map((a) => [a.typeId, a.uid, a.ownerIndex, a.changed]),
    [["broken-leg", "v1", 0, true]],
  );
  assert.deepEqual(r.pending, []);
  r = playMovementWithVirus(r.pending, walkpp, null, 2);
  assert.deepEqual(
    shape(r.command),
    ["NONE", 3, false, false],
    "ใบถัดไปอีกไม่โดนแล้ว",
  );
  // ผู้เล่นที่โดน Virus ก็แนบ Virus ของตัวเองได้ในตาเดียวกัน: ของเก่าทำงานก่อน ของใหม่รอใบถัดไป
  r = playMovementWithVirus(
    [{ uid: "v1", typeId: "jump", ownerIndex: 0 }],
    walkpp,
    { uid: "v2", typeId: "backtrack" },
    1,
  );
  assert.deepEqual(shape(r.command), ["NONE", 3, false, true]);
  assert.deepEqual(r.pending, [
    { uid: "v2", typeId: "backtrack", ownerIndex: 1 },
  ]);
  r = playMovementWithVirus(r.pending, cmdOf("turn-left-plus"), null, 2);
  assert.deepEqual(shape(r.command), ["RIGHT", 1, true, false]);
});

test("คิว Virus ไม่แก้ค่าที่ส่งเข้ามา (คิวเดิม / คำสั่งเดิม / การ์ดที่แนบ)", () => {
  const pending = Object.freeze([
    Object.freeze({ uid: "v1", typeId: "backtrack", ownerIndex: 0 }),
  ]);
  const command = Object.freeze({ ...cmdOf("walk-plus") });
  const attached = Object.freeze({ uid: "v2", typeId: "jump" });
  const out = playMovementWithVirus(pending, command, attached, 3);
  assert.deepEqual(shape(out.command), ["NONE", 2, true, false]);
  assert.equal(pending.length, 1);
  assert.equal(command.reverse, undefined);
});

// ---------------------------------------------------------------------------
// กรณีที่คำนวณด้วยมือ (กระดาน 9x9 Starting Point = แถว 4 คอลัมน์ 4) ทิศ RIGHT = คอลัมน์เพิ่ม
// ---------------------------------------------------------------------------
const R = (row, col, facing = "RIGHT") => ({ row, col, facing });
const JUMP = (steps, extra = {}) => ({
  id: "t",
  label: "t",
  turn: "NONE",
  steps,
  jump: true,
  ...extra,
});
const BACK = (steps, turn = "NONE", extra = {}) => ({
  id: "t",
  label: "t",
  turn,
  steps,
  reverse: true,
  ...extra,
});

test("กระโดด: ก้าวละ 2 ช่อง บนกระดานว่าง / ลงนอกกระดานเป็นตกแมพ (แม้ช่องที่ข้ามยังอยู่ในกระดาน)", () => {
  const a = run(R(4, 2), JUMP(2));
  assert.deepEqual(at(a), [4, 6, "RIGHT"]);
  assert.equal(a.stepsTaken, 2);
  assert.equal(a.crashed, false);
  const b = run(R(4, 6), JUMP(2)); // ก้าวแรกลง col 8 ได้ ก้าวสอง col 10 นอกกระดาน
  assert.deepEqual(at(b), [4, 4, "RIGHT"]);
  assert.equal(b.crashed, true);
  assert.equal(b.stepsTaken, 1);
  const c = run(R(4, 7), JUMP(1)); // ข้าม col 8 ไปลง col 9 นอกกระดาน
  assert.equal(c.crashed, true);
  assert.deepEqual(at(c), [4, 4, "RIGHT"]);
  const d = run(R(4, 4), { ...JUMP(1), turn: "LEFT" }); // หันซ้ายก่อน (UP) แล้วกระโดด 1
  assert.deepEqual(at(d), [2, 4, "UP"]);
  const e = run(R(4, 4), JUMP(0));
  assert.deepEqual(at(e), [4, 4, "RIGHT"]);
  assert.equal(e.stepsTaken, 0);
});

test("กระโดด + Wall: ช่องที่ข้ามไม่ขวาง / ช่องที่ลงเป็น Wall หยุดที่ช่องที่ข้าม / Wall ทั้งสองช่อง อยู่ที่เดิม", () => {
  const mid = run(R(4, 2), JUMP(2), [ob("wall", 4, 3)]);
  assert.deepEqual(at(mid), [4, 6, "RIGHT"]);
  assert.equal(mid.blocked, false);
  const land = run(R(4, 2), JUMP(2), [ob("wall", 4, 4)]);
  assert.deepEqual(at(land), [4, 3, "RIGHT"]);
  assert.equal(land.blocked, true);
  assert.equal(land.blockedBy, "wall");
  assert.equal(land.stepsTaken, 0);
  const both = run(R(4, 2), JUMP(2), [ob("wall", 4, 3), ob("wall", 4, 4)]);
  assert.deepEqual(at(both), [4, 2, "RIGHT"]);
  assert.equal(both.blocked, true);
  const second = run(R(4, 2), JUMP(3), [ob("wall", 4, 8)]); // ก้าวแรก/สองลงได้ ก้าวสามลง Wall
  assert.deepEqual(at(second), [4, 7, "RIGHT"]);
  assert.equal(second.stepsTaken, 2);
});

test("กระโดด + Scrap / Destroyer: ช่องที่ข้ามไม่ทำงาน ช่องที่ลงทำงานตามปกติ", () => {
  const skipped = run(R(4, 2), JUMP(2), [ob("scrap", 4, 3)]);
  assert.deepEqual(at(skipped), [4, 6, "RIGHT"]);
  assert.deepEqual(skipped.damageUids, []);
  assert.equal(skipped.stoppedBy, null);
  const landed = run(R(4, 2), JUMP(2), [ob("scrap", 4, 4)]);
  assert.deepEqual(at(landed), [4, 4, "RIGHT"]);
  assert.equal(landed.stoppedBy, "scrap");
  assert.deepEqual(landed.damageUids, ["scrap-4-4"]);
  assert.equal(landed.stepsTaken, 1);
  const dSkip = run(R(4, 1), JUMP(2), [ob("destroyer", 4, 2)]);
  assert.deepEqual(at(dSkip), [4, 5, "RIGHT"]);
  assert.equal(dSkip.destroyed, false);
  const dLand = run(R(4, 1), JUMP(2), [ob("destroyer", 4, 3)]);
  assert.deepEqual(at(dLand), [4, 4, "RIGHT"]);
  assert.equal(dLand.destroyed, true);
  assert.deepEqual(dLand.damageUids, ["destroyer-4-3"]);
});

test("กระโดด + Oil: ลงบน Oil → เดินเพิ่ม 1 ก้าว (ก้าวที่เพิ่มก็กระโดด) / Oil ที่ถูกข้ามไม่ทำงาน", () => {
  const landed = run(R(4, 0), JUMP(1), [ob("oil", 4, 2)]);
  assert.deepEqual(at(landed), [4, 4, "RIGHT"]);
  assert.equal(landed.extraSteps, 1);
  assert.equal(landed.stepsTaken, 2);
  assert.deepEqual(landed.damageUids, ["oil-4-2"]);
  const skipped = run(R(4, 0), JUMP(1), [ob("oil", 4, 1)]);
  assert.deepEqual(at(skipped), [4, 2, "RIGHT"]);
  assert.equal(skipped.extraSteps, 0);
  assert.deepEqual(skipped.damageUids, []);
});

test("กระโดด + Hole: ลงบน Hole วาร์ป / Hole ที่ถูกข้ามไม่ทำงาน", () => {
  const landed = run(R(4, 0), JUMP(1), [ob("hole", 4, 2), ob("hole", 0, 0)]);
  assert.deepEqual(at(landed), [0, 0, "RIGHT"]);
  assert.ok(landed.warp);
  assert.equal(landed.warp.toUid, "hole-0-0");
  const skipped = run(R(4, 0), JUMP(1), [ob("hole", 4, 1), ob("hole", 0, 0)]);
  assert.deepEqual(at(skipped), [4, 2, "RIGHT"]);
  assert.equal(skipped.warp, null);
});

test("กระโดด + Spring: ลงพอดีบน Spring → ถอย 2 ช่อง (เดินทีละช่อง ไม่กระโดด) / Spring ที่ถูกข้ามไม่ทำงาน", () => {
  const landed = run(R(4, 2), JUMP(2), [ob("spring", 4, 6)]);
  assert.deepEqual(at(landed), [4, 4, "RIGHT"]);
  assert.equal(landed.retreatSteps, 2);
  assert.equal(landed.bounces.length, 1);
  assert.equal(landed.stepsTaken, 2);
  const skipped = run(R(4, 4), JUMP(1), [ob("spring", 4, 5)]);
  assert.deepEqual(at(skipped), [4, 6, "RIGHT"]);
  assert.equal(skipped.bounces.length, 0);
  assert.deepEqual(skipped.damageUids, []);
});

test("กระโดด: Robo ไปหยุดบนช่องที่ข้ามเพราะช่องที่ลงเป็น Wall → Spring ในช่องนั้นไม่ทำงาน", () => {
  const out = run(R(4, 2), JUMP(3), [ob("wall", 4, 8), ob("spring", 4, 7)]);
  assert.deepEqual(at(out), [4, 7, "RIGHT"]);
  assert.equal(out.blocked, true);
  assert.equal(out.bounces.length, 0);
  assert.equal(out.retreatSteps, 0);
  assert.deepEqual(out.damageUids, []);
  // ยืนยันว่าถ้าลงบน Spring จริง ๆ จะทำงาน (ไม่ใช่ว่า Spring ใช้ไม่ได้ในกรณีนี้)
  const lands = run(R(4, 2), JUMP(2), [ob("spring", 4, 6)]);
  assert.equal(lands.bounces.length, 1);
});

test("กระโดด + Magnet: ขั้นหลังเดินจบทำงานตามตำแหน่งสุดท้ายเหมือนเดิม (ดึงไปลงบน Magnet ทิศคงเดิม)", () => {
  const out = run(R(4, 2), JUMP(2), [ob("magnet", 5, 7)]); // ลง (4,6) อยู่ในระยะ Magnet (5,7)
  assert.deepEqual(at(out), [5, 7, "RIGHT"]);
  assert.equal(out.magnetEvents.length, 1);
  assert.equal(out.magnetEvents[0].effect, "pull");
});

test("ถอยหลัง (ย้อนรอย): ถอย N ช่อง ทิศหันคงเดิม / ผสม Turn+ ใช้ทิศหลังหัน / ตกแมพ", () => {
  assert.deepEqual(at(run(R(4, 6), BACK(3))), [4, 3, "RIGHT"]);
  assert.deepEqual(at(run(R(4, 4), BACK(1, "RIGHT"))), [3, 4, "DOWN"]); // หันขวา→DOWN แล้วถอย = ขึ้น
  assert.deepEqual(at(run(R(4, 4), BACK(1, "LEFT"))), [5, 4, "UP"]); // หันซ้าย→UP แล้วถอย = ลง
  const crash = run(R(4, 1), BACK(3)); // ถอย col 0 แล้วนอกกระดาน
  assert.equal(crash.crashed, true);
  assert.deepEqual(at(crash), [4, 4, "RIGHT"]);
  const none = run(R(4, 4), BACK(0));
  assert.deepEqual(at(none), [4, 4, "RIGHT"]);
});

test("ถอยหลัง + Obstacle: Wall ที่ด้านหลังขวาง / Oil เดินเพิ่มไปทิศถอย / Spring ถอยกลับทิศตรงข้ามกับที่เข้ามา", () => {
  const wall = run(R(4, 6), BACK(3), [ob("wall", 4, 4)]);
  assert.deepEqual(at(wall), [4, 5, "RIGHT"]);
  assert.equal(wall.blocked, true);
  const oil = run(R(4, 6), BACK(1), [ob("oil", 4, 5)]);
  assert.deepEqual(at(oil), [4, 4, "RIGHT"]);
  assert.equal(oil.extraSteps, 1);
  const spring = run(R(4, 6), BACK(2), [ob("spring", 4, 4)]); // ถอยลง Spring ที่ col 4 → ดีดไปทาง RIGHT 2 ช่อง
  assert.deepEqual(at(spring), [4, 6, "RIGHT"]);
  assert.equal(spring.bounces.length, 1);
  assert.equal(spring.retreatSteps, 2);
  const scrap = run(R(4, 6), BACK(3), [ob("scrap", 4, 4)]);
  assert.deepEqual(at(scrap), [4, 4, "RIGHT"]);
  assert.equal(scrap.stoppedBy, "scrap");
});

test("ย้อนรอย + กระโดด พร้อมกัน: ถอยหลังแบบกระโดด", () => {
  assert.deepEqual(at(run(R(4, 6), JUMP(2, { reverse: true }))), [
    4,
    2,
    "RIGHT",
  ]);
  const crash = run(R(4, 2), JUMP(2, { reverse: true })); // ถอยลง col 0 แล้ว col -2 นอกกระดาน
  assert.equal(crash.crashed, true);
});

test("คำสั่งที่ไม่มีธง reverse/jump (หรือเป็น false) ให้ผลเหมือนเดิมทุกอย่าง", () => {
  const board = [ob("oil", 4, 5), ob("spring", 4, 7), ob("wall", 2, 2)];
  for (const command of MOVEMENT_COMMANDS) {
    const plain = run(R(4, 4), command, board);
    assert.deepEqual(
      run(R(4, 4), { ...command, reverse: false, jump: false }, board),
      plain,
      command.id,
    );
    assert.deepEqual(
      run(R(4, 4), { ...command, reverse: undefined }, board),
      plain,
      command.id,
    );
  }
});

test('ธง reverse/jump ต้องเป็น true เท่านั้นจึงเปิด: ค่า 0 / null / 1 / "true" / "yes" ให้ผลเหมือนไม่ใส่ (กันค่าหลุดมาจากข้อมูลอื่น)', () => {
  const board = [ob("oil", 4, 5), ob("wall", 2, 4)];
  for (const command of MOVEMENT_COMMANDS) {
    const plain = run(R(4, 4), command, board);
    for (const bad of [0, null, 1, "true", "yes", NaN]) {
      assert.deepEqual(
        run(R(4, 4), { ...command, reverse: bad }, board),
        plain,
        `${command.id} reverse=${String(bad)}`,
      );
      assert.deepEqual(
        run(R(4, 4), { ...command, jump: bad }, board),
        plain,
        `${command.id} jump=${String(bad)}`,
      );
    }
  }
});

test("ย้อนรอยกับคำสั่งที่หัน 180° และมีระยะเดิน (คำสั่งสร้างเอง): หันเหมือนเดิม แต่ถอยหลัง", () => {
  const custom = { id: "c", label: "c", turn: "AROUND", steps: 2 };
  const out = applyMovementModifier(custom, "backtrack");
  assert.deepEqual(shape(out.command), ["AROUND", 2, true, false]);
  assert.equal(out.changed, true);
  const moved = run(R(4, 4), out.command); // หัน RIGHT→LEFT แล้วถอยหลัง = ไปทางขวา 2 ช่อง
  assert.deepEqual(at(moved), [4, 6, "LEFT"]);
});

test("คิว Virus ที่ค้างหลายใบ (ตอน M5 วางหลายใบได้): ทุกใบทำงานรวมกันกับ Movement ใบนั้น เรียงตามคิว บันทึก uid/ผู้ใช้ครบ", () => {
  const pending = [
    { uid: "a", typeId: "broken-leg", ownerIndex: 0 },
    { uid: "b", typeId: "backtrack", ownerIndex: 1 },
    { uid: "c", typeId: "jump", ownerIndex: 2 },
  ];
  const out = playMovementWithVirus(pending, cmdOf("walk-plus-plus"), null, 3);
  assert.deepEqual(shape(out.command), ["NONE", 2, true, true]);
  assert.deepEqual(
    out.applied.map((a) => [a.typeId, a.uid, a.ownerIndex, a.changed]),
    [
      ["broken-leg", "a", 0, true],
      ["backtrack", "b", 1, true],
      ["jump", "c", 2, true],
    ],
  );
  assert.deepEqual(out.pending, []);
  // ขาหักจนเหลือ 0 ก้าว แล้วกระโดดที่ตามมาไม่มีผล แต่ยังถูกบันทึกในคิวที่ทำงาน
  const out2 = playMovementWithVirus(
    [
      { uid: "a", typeId: "broken-leg-plus", ownerIndex: 0 },
      { uid: "c", typeId: "jump", ownerIndex: 2 },
    ],
    cmdOf("walk"),
    { uid: "n", typeId: "backtrack" },
    1,
  );
  assert.deepEqual(shape(out2.command), ["NONE", 0, false, false]);
  assert.deepEqual(
    out2.applied.map((a) => a.changed),
    [true, false],
  );
  assert.deepEqual(out2.pending, [
    { uid: "n", typeId: "backtrack", ownerIndex: 1 },
  ]);
});

test("Flow เต็ม: Player 1 เล่น Walk++ แนบขาหัก → Player 2 เล่น Walk++ เดินแค่ 2 → Player 3 เดิน 3 ตามปกติ (ผ่านเอนจินจริง)", () => {
  let robo = R(4, 0);
  let pending = [];
  const play = (command, attached, owner) => {
    const out = playMovementWithVirus(pending, command, attached, owner);
    pending = out.pending;
    const moved = run(robo, out.command);
    robo = moved.robo;
    return moved;
  };
  assert.equal(
    play(cmdOf("walk-plus-plus"), { uid: "v1", typeId: "broken-leg" }, 0)
      .stepsTaken,
    3,
  );
  assert.deepEqual([robo.row, robo.col], [4, 3]);
  assert.equal(play(cmdOf("walk-plus-plus"), null, 1).stepsTaken, 2);
  assert.deepEqual([robo.row, robo.col], [4, 5]);
  assert.equal(play(cmdOf("walk-plus-plus"), null, 2).stepsTaken, 3);
  assert.deepEqual([robo.row, robo.col], [4, 8]);
});

// ---------------------------------------------------------------------------
// ส่วนที่ 2: ผู้ตรวจอิสระของ "ถอยหลัง" — เทียบกับ "เดินหน้าในกระจก"
//   ถอยหลังแล้วทิศหันคงเดิม ≡ หมุน Robo กลับหลังก่อนแล้วเดินหน้า (เส้นทางเดียวกันทุกช่อง) จากนั้นหมุนทิศหันกลับ
//   เทียบกับเอนจินเดิมที่ผ่านการทดสอบแล้ว ครอบคลุมทุกชนิด Obstacle + Magnet + Hole เลือกปลายทาง
// ---------------------------------------------------------------------------
console.log(
  "\nส่วนที่ 2: ผู้ตรวจอิสระ — ถอยหลัง เทียบกับ 'เดินหน้าในกระจก' บนเอนจินเดิม (กรณีสุ่ม 30,000)",
);

const TYPES_ALL = [
  "wall",
  "hole",
  "scrap",
  "oil",
  "destroyer",
  "spring",
  "magnet",
];

// mode: "normal" (0–14 ชิ้น ชนิดละเท่ากัน) / "springs" (แน่น มี Spring เยอะ ไว้ทดสอบ Spring ต่อกัน) / "oils" (แน่น มี Oil เยอะ)
function randomBoard(rng, size, mode = "normal", types = TYPES_ALL) {
  const center = (size - 1) / 2;
  const count =
    mode === "normal" ? Math.floor(rng() * 15) : 14 + Math.floor(rng() * 22);
  const heavy = mode === "springs" ? "spring" : mode === "oils" ? "oil" : null;
  const used = new Set();
  const list = [];
  for (let i = 0; i < count * 3 && list.length < count; i += 1) {
    const row = Math.floor(rng() * size);
    const col = Math.floor(rng() * size);
    if (Math.abs(row - center) <= 1 && Math.abs(col - center) <= 1) continue; // Locked Zone วางไม่ได้
    if (used.has(`${row},${col}`)) continue;
    used.add(`${row},${col}`);
    const typeId =
      heavy && types.includes(heavy) && rng() < 0.6
        ? heavy
        : types[Math.floor(rng() * types.length)];
    list.push(
      ob(typeId, row, col, rng() < 0.25 ? 1 + Math.floor(rng() * 2) : 0),
    );
  }
  return list;
}
const pickMode = (rng) => {
  const x = rng();
  return x < 0.7 ? "normal" : x < 0.85 ? "springs" : "oils";
};

const comparable = (r) => ({
  row: r.robo.row,
  col: r.robo.col,
  crashed: r.crashed,
  blocked: r.blocked,
  blockedBy: r.blockedBy,
  stepsTaken: r.stepsTaken,
  warp: r.warp,
  pendingWarp: r.pendingWarp,
  returnedToStart: r.returnedToStart,
  stoppedBy: r.stoppedBy,
  destroyed: r.destroyed,
  extraSteps: r.extraSteps,
  retreatSteps: r.retreatSteps,
  bounces: r.bounces,
  damageUids: r.damageUids,
  triggers: r.triggers,
  magnetEvents: r.magnetEvents,
});

test("ถอยหลัง ≡ เดินหน้าในกระจก ทุกฟิลด์ (ตำแหน่ง / Crash / Wall / Hole / Scrap / Oil / Destroyer / Spring / Magnet) + Hole เลือกปลายทาง", () => {
  const rng = makeRng(430301);
  const seen = {
    cases: 0,
    crashed: 0,
    blocked: 0,
    warp: 0,
    pending: 0,
    scrap: 0,
    oil: 0,
    destroyed: 0,
    spring: 0,
    magnet: 0,
    chain: 0,
    moved: 0,
  };

  for (let i = 0; i < 30000; i += 1) {
    const size = [9, 11, 13][Math.floor(rng() * 3)];
    const board = randomBoard(rng, size, pickMode(rng));
    const robo = {
      row: Math.floor(rng() * size),
      col: Math.floor(rng() * size),
      facing: FACINGS[Math.floor(rng() * 4)],
    };
    const turn = ["NONE", "LEFT", "RIGHT", "AROUND"][Math.floor(rng() * 4)];
    const steps = Math.floor(rng() * 7);

    const back = run(
      robo,
      { id: "b", label: "b", turn, steps, reverse: true },
      board,
      size,
    );
    const mirrorRobo = { ...robo, facing: OPPOSITE[robo.facing] };
    const mirror = run(
      mirrorRobo,
      { id: "m", label: "m", turn, steps },
      board,
      size,
    );

    assert.equal(
      back.facingAfterTurn,
      turnFacing(robo.facing, turn),
      `ทิศหลังหัน (กรณี ${i})`,
    );
    assert.equal(
      back.facingAfterTurn,
      OPPOSITE[mirror.facingAfterTurn],
      `ทิศหลังหันสะท้อน (กรณี ${i})`,
    );
    assert.equal(
      back.robo.facing,
      OPPOSITE[mirror.robo.facing],
      `ทิศหลังเดินสะท้อน (กรณี ${i})`,
    );
    assert.deepEqual(
      comparable(back),
      comparable(mirror),
      `ผลไม่ตรง กรณี ${i}`,
    );

    // Hole เลือกปลายทาง: เลือกปลายทางเดียวกันแล้ว settle ต่อ ต้องตรงกันด้วย
    if (back.pendingWarp) {
      const pick =
        back.pendingWarp.destinations[
          Math.floor(rng() * back.pendingWarp.destinations.length)
        ].uid;
      const a = finishHoleWarp(back.robo, back.pendingWarp, pick, board, size);
      const b = finishHoleWarp(
        mirror.robo,
        mirror.pendingWarp,
        pick,
        board,
        size,
      );
      assert.equal(a.robo.facing, OPPOSITE[b.robo.facing]);
      assert.deepEqual(
        [a.robo.row, a.robo.col, a.damageUids, a.magnetEvents, a.triggers],
        [b.robo.row, b.robo.col, b.damageUids, b.magnetEvents, b.triggers],
        `หลังเลือก Hole กรณี ${i}`,
      );
      seen.pending += 1;
    }

    seen.cases += 1;
    if (back.crashed) seen.crashed += 1;
    if (back.blocked) seen.blocked += 1;
    if (back.warp) seen.warp += 1;
    if (back.stoppedBy === "scrap") seen.scrap += 1;
    if (back.extraSteps > 0) seen.oil += 1;
    if (back.destroyed) seen.destroyed += 1;
    if (back.bounces.length > 0) seen.spring += 1;
    if (back.bounces.length > 1) seen.chain += 1;
    if (back.magnetEvents.length > 0) seen.magnet += 1;
    if (back.robo.row !== robo.row || back.robo.col !== robo.col)
      seen.moved += 1;
  }

  console.log(
    `    ครอบคลุม: กรณี ${seen.cases} | เคลื่อนที่ ${seen.moved} | ตกแมพ ${seen.crashed} | ชน Wall ${seen.blocked} | วาร์ป ${seen.warp} (รอเลือก ${seen.pending}) | Scrap ${seen.scrap} | Oil ${seen.oil} | Destroyer ${seen.destroyed} | Spring ${seen.spring} (ต่อกัน ${seen.chain}) | Magnet ${seen.magnet}`,
  );
  for (const key of [
    "moved",
    "crashed",
    "blocked",
    "warp",
    "pending",
    "scrap",
    "oil",
    "destroyed",
    "spring",
    "chain",
    "magnet",
  ]) {
    assert.ok(seen[key] > 30, `fuzz ไม่ครอบคลุมกรณี ${key} (${seen[key]})`);
  }
});

// ---------------------------------------------------------------------------
// ส่วนที่ 3: ผู้ตรวจอิสระของ "กระโดด" — ตัวจำลองกติกาเขียนใหม่ (Wall / Scrap / Oil / Destroyer)
// ---------------------------------------------------------------------------
console.log(
  "\nส่วนที่ 3: ผู้ตรวจอิสระ — กระโดด เทียบกับตัวจำลองกติกาที่เขียนแยก (กรณีสุ่ม 30,000)",
);

const DELTAS = { UP: [-1, 0], DOWN: [1, 0], LEFT: [0, -1], RIGHT: [0, 1] };

// ตัวจำลองกระโดด: รองรับ Wall / Scrap / Oil / Destroyer เท่านั้น (ไม่มี Hole / Spring / Magnet บนกระดาน)
function refJump(robo, command, size, obstacles) {
  const facing = turnFacing(robo.facing, command.turn);
  const sign = command.reverse ? -1 : 1;
  const dr = DELTAS[facing][0] * sign;
  const dc = DELTAS[facing][1] * sign;
  const inside = (r, c) => r >= 0 && r < size && c >= 0 && c < size;
  const center = (size - 1) / 2;
  const cell = (r, c) => obstacles.find((o) => o.row === r && o.col === c);
  const worked = new Set();
  const damaged = [];
  const active = (o) =>
    o &&
    (o.typeId === "wall" ||
      ((o.damagedTurns ?? 0) === 0 && !worked.has(o.uid)));

  let row = robo.row;
  let col = robo.col;
  let total = command.steps;
  let taken = 0;
  const out = (extra = {}) => ({
    row,
    col,
    facing,
    crashed: false,
    destroyed: false,
    blocked: false,
    stoppedBy: null,
    stepsTaken: taken,
    damaged: [...damaged],
    ...extra,
  });

  for (let i = 0; i < total; i += 1) {
    const mr = row + dr;
    const mc = col + dc;
    const lr = row + 2 * dr;
    const lc = col + 2 * dc;
    if (!inside(lr, lc)) {
      row = center;
      col = center;
      return out({ crashed: true });
    }
    const landing = cell(lr, lc);
    if (landing && landing.typeId === "wall") {
      const midWall = cell(mr, mc)?.typeId === "wall";
      if (!midWall) {
        row = mr;
        col = mc;
      }
      return out({ blocked: true });
    }
    row = lr;
    col = lc;
    taken += 1;
    if (active(landing)) {
      if (landing.typeId === "scrap") {
        damaged.push(landing.uid);
        return out({ stoppedBy: "scrap" });
      }
      if (landing.typeId === "destroyer") {
        damaged.push(landing.uid);
        row = center;
        col = center;
        return out({ destroyed: true });
      }
      if (landing.typeId === "oil") {
        damaged.push(landing.uid);
        worked.add(landing.uid);
        total += 1;
      }
    }
  }
  return out();
}

test("กระโดด (รวมกระโดด+ถอยหลัง) ตรงกับตัวจำลองกติกาที่เขียนแยก: ตำแหน่ง ทิศ Crash/พัง/ชน Wall/Scrap ก้าวที่เดิน และ Obstacle ที่ชำรุด", () => {
  const rng = makeRng(430302);
  const types = ["wall", "scrap", "oil", "destroyer"];
  const seen = {
    cases: 0,
    crashed: 0,
    blockedMid: 0,
    blocked: 0,
    scrap: 0,
    oil: 0,
    oilChain: 0,
    destroyed: 0,
    reverse: 0,
    jumpedOver: 0,
  };

  for (let i = 0; i < 30000; i += 1) {
    const size = [9, 11, 13][Math.floor(rng() * 3)];
    const mode = rng() < 0.7 ? "normal" : "oils";
    const board = randomBoard(rng, size, mode, types);
    const robo = {
      row: Math.floor(rng() * size),
      col: Math.floor(rng() * size),
      facing: FACINGS[Math.floor(rng() * 4)],
    };
    const turn = ["NONE", "LEFT", "RIGHT", "AROUND"][Math.floor(rng() * 4)];
    const command = {
      id: "j",
      label: "j",
      turn,
      steps: Math.floor(rng() * 6),
      jump: true,
      reverse: rng() < 0.3,
    };

    const real = run(robo, command, board, size);
    const ref = refJump(robo, command, size, board);
    const where = `กรณี ${i}`;
    assert.deepEqual(
      [real.robo.row, real.robo.col, real.robo.facing],
      [ref.row, ref.col, ref.facing],
      `ตำแหน่ง ${where}`,
    );
    assert.equal(real.crashed, ref.crashed, `Crash ${where}`);
    assert.equal(real.destroyed, ref.destroyed, `พัง ${where}`);
    assert.equal(real.blocked, ref.blocked, `ชน Wall ${where}`);
    assert.equal(real.stoppedBy, ref.stoppedBy, `หยุดบน ${where}`);
    assert.equal(real.stepsTaken, ref.stepsTaken, `ก้าวที่เดิน ${where}`);
    assert.deepEqual(real.damageUids, ref.damaged, `ชำรุด ${where}`);
    assert.deepEqual(real.bounces, [], where);
    assert.equal(real.warp, null, where);

    seen.cases += 1;
    if (ref.crashed) seen.crashed += 1;
    if (ref.blocked) seen.blocked += 1;
    if (ref.stoppedBy === "scrap") seen.scrap += 1;
    if (ref.destroyed) seen.destroyed += 1;
    if (real.extraSteps > 0) seen.oil += 1;
    if (real.extraSteps > 1) seen.oilChain += 1;
    if (command.reverse && real.stepsTaken > 0) seen.reverse += 1;
    // มีช่องที่ถูกข้ามซึ่งมี Obstacle อยู่จริง (พิสูจน์ว่าทดสอบ "ข้ามแล้วไม่ทำงาน" จริง)
    const [dr, dc] = DELTAS[turnFacing(robo.facing, turn)].map(
      (v) => v * (command.reverse ? -1 : 1),
    );
    for (let s = 0; s < real.stepsTaken - real.extraSteps; s += 1) {
      const m = board.find(
        (o) =>
          o.row === robo.row + dr * (2 * s + 1) &&
          o.col === robo.col + dc * (2 * s + 1),
      );
      if (m) {
        seen.jumpedOver += 1;
        break;
      }
    }
  }

  console.log(
    `    ครอบคลุม: กรณี ${seen.cases} | ตกแมพ ${seen.crashed} | ลง Wall หยุดที่ช่องข้าม ${seen.blocked} | Scrap ${seen.scrap} | Oil ${seen.oil} (ต่อกัน ${seen.oilChain}) | Destroyer ${seen.destroyed} | ถอยหลังแบบกระโดด ${seen.reverse} | เดินข้าม Obstacle จริง ${seen.jumpedOver}`,
  );
  for (const key of [
    "crashed",
    "blocked",
    "scrap",
    "oil",
    "oilChain",
    "destroyed",
    "reverse",
    "jumpedOver",
  ]) {
    assert.ok(seen[key] > 30, `fuzz ไม่ครอบคลุมกรณี ${key} (${seen[key]})`);
  }
});

test("กระโดดบนกระดานที่มีทุกชนิด Obstacle (รวม Hole / Spring / Magnet): ไม่ error / Robo อยู่ในกระดานเสมอ / ผลสอดคล้องกัน (30,000 กรณี)", () => {
  const rng = makeRng(430303);
  let cases = 0;
  let withSpring = 0;
  let withMagnet = 0;
  let withHole = 0;
  for (let i = 0; i < 30000; i += 1) {
    const size = [9, 11, 13][Math.floor(rng() * 3)];
    const board = randomBoard(rng, size, pickMode(rng));
    const robo = {
      row: Math.floor(rng() * size),
      col: Math.floor(rng() * size),
      facing: FACINGS[Math.floor(rng() * 4)],
    };
    const command = {
      id: "j",
      label: "j",
      turn: ["NONE", "LEFT", "RIGHT", "AROUND"][Math.floor(rng() * 4)],
      steps: Math.floor(rng() * 7),
      jump: true,
      reverse: rng() < 0.3,
    };
    const r = run(robo, command, board, size);
    assert.ok(
      r.robo.row >= 0 &&
        r.robo.row < size &&
        r.robo.col >= 0 &&
        r.robo.col < size,
      `Robo หลุดกระดาน กรณี ${i}`,
    );
    assert.ok(r.stepsTaken >= 0 && Number.isInteger(r.stepsTaken));
    assert.equal(r.facingAfterTurn, turnFacing(robo.facing, command.turn));
    // ถ้ารอเลือก Hole ต้องมีปลายทาง >= 2 และ Robo ยังไม่ settle
    if (r.pendingWarp) assert.ok(r.pendingWarp.destinations.length >= 2);
    // Obstacle ที่ชำรุดแล้วต้องไม่ถูกสั่งให้ชำรุดซ้ำจาก "ก้าวเข้า" (ยกเว้น Magnet/Hole ปลายทางที่ไม่ได้ก้าวเข้า)
    for (const uid of r.damageUids)
      assert.ok(
        board.some((o) => o.uid === uid),
        `uid แปลกปลอม ${uid}`,
      );
    cases += 1;
    if (r.bounces.length > 0) withSpring += 1;
    if (r.magnetEvents.length > 0) withMagnet += 1;
    if (r.warp || r.pendingWarp || r.returnedToStart) withHole += 1;
  }
  console.log(
    `    ครอบคลุม: กรณี ${cases} | Spring ทำงาน ${withSpring} | Magnet ทำงาน ${withMagnet} | Hole ทำงาน ${withHole}`,
  );
  assert.ok(withSpring > 30 && withMagnet > 30 && withHole > 30);
});

// ---------------------------------------------------------------------------
// ส่วนที่ 4: Flow ทั้งสาย (คิว Virus + เอนจิน) เทียบกับสูตรปิดที่ผู้ตรวจเขียนแยก
// ---------------------------------------------------------------------------
console.log(
  "\nส่วนที่ 4: ผู้ตรวจอิสระ — Flow ผู้เล่นหลายคนเล่น Movement พร้อม Virus (เกมสุ่ม 4,000 เกม)",
);

test("Flow สุ่ม: ผล Virus ไปติด Movement ใบถัดไปเท่านั้น ตรงกับสูตรปิด (ตำแหน่ง Robo ทุกตา) และคิวไม่เกิน 1 ใบ/ไม่ตกค้างผิดตา", () => {
  const rng = makeRng(430304);
  const pick = (list) => list[Math.floor(rng() * list.length)];
  let turns = 0;
  let affected = 0;
  let reversedTurns = 0;
  let jumpedTurns = 0;
  let zeroed = 0;

  for (let g = 0; g < 4000; g += 1) {
    const size = 9;
    const board = randomBoard(rng, size, pickMode(rng));
    let roboA = { row: 4, col: 4, facing: pick(FACINGS) };
    let roboB = { ...roboA };
    let pending = [];
    let expectedPendingType = null; // ผู้ตรวจจำเองว่า Virus ใบล่าสุดที่แนบคืออะไร

    const length = 3 + Math.floor(rng() * 9);
    for (let t = 0; t < length; t += 1) {
      const command = pick(MOVEMENT_COMMANDS);
      const attachedType = rng() < 0.6 ? pick(MOVEMENT_MODIFIER_IDS) : null;
      const owner = t % 4;

      // ฝั่งโค้ดเกม
      const out = playMovementWithVirus(
        pending,
        command,
        attachedType ? { uid: `v${g}-${t}`, typeId: attachedType } : null,
        owner,
      );
      pending = out.pending;
      const real = run(roboA, out.command, board, size);
      roboA = real.robo;

      // ฝั่งผู้ตรวจ: สูตรปิดจากคำตอบ Q1–Q4
      let [turn, steps] = BASE[command.id];
      let reverse = false;
      let jump = false;
      const type = expectedPendingType;
      if (type === "broken-leg") steps = Math.max(0, steps - 1);
      if (type === "broken-leg-plus") steps = Math.max(0, steps - 2);
      if (type === "backtrack") {
        turn = { NONE: "NONE", LEFT: "RIGHT", RIGHT: "LEFT", AROUND: "AROUND" }[
          turn
        ];
        reverse = steps > 0;
      }
      if (type === "jump") jump = steps > 0;
      const refCommand = { id: "r", label: "r", turn, steps };
      if (reverse) refCommand.reverse = true;
      if (jump) refCommand.jump = true;
      const expected = run(roboB, refCommand, board, size);
      roboB = expected.robo;
      expectedPendingType = attachedType;

      assert.deepEqual(roboA, roboB, `Robo ไม่ตรง เกม ${g} ตา ${t}`);
      assert.deepEqual(
        comparable(real),
        comparable(expected),
        `ผลไม่ตรง เกม ${g} ตา ${t}`,
      );
      assert.ok(pending.length <= 1, "คิวต้องไม่เกิน 1 ใบเมื่อแนบได้ตาละ 1 ใบ");
      assert.equal(pending.length, attachedType ? 1 : 0);
      if (attachedType) assert.equal(pending[0].ownerIndex, owner);
      turns += 1;
      if (type) affected += 1;
      if (reverse) reversedTurns += 1;
      if (jump) jumpedTurns += 1;
      if (
        type &&
        type.startsWith("broken") &&
        steps === 0 &&
        BASE[command.id][1] > 0
      )
        zeroed += 1;
    }
  }
  console.log(
    `    ครอบคลุม: เกม 4000 | ตาที่เล่น ${turns} | ตาที่โดน Virus ${affected} | ถอยหลัง ${reversedTurns} | กระโดด ${jumpedTurns} | ขาหักจนเหลือ 0 ก้าว ${zeroed}`,
  );
  for (const v of [affected, reversedTurns, jumpedTurns, zeroed])
    assert.ok(v > 100);
});

console.log(
  `\nผ่านทั้งหมด ${passed} รายการ${process.exitCode ? " (มีรายการที่ไม่ผ่าน)" : ""}`,
);
